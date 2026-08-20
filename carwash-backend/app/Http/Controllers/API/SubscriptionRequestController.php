<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SubscriptionRequest;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionRequestController extends Controller
{
    /**
     * POST /api/tenant/subscription-request (Tenant Admin apply for plan upgrade)
     */
    public function apply(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

        if (!$tenantId) {
            return response()->json(['message' => 'Tenant profile required.'], 403);
        }

        $validated = $request->validate([
            'plan_id' => 'required|string|in:starter,growth,enterprise',
            'notes'   => 'nullable|string|max:500',
        ]);

        // Cancel any previous pending request for this tenant
        SubscriptionRequest::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->update(['status' => 'rejected', 'reviewed_at' => now()]);

        $subRequest = SubscriptionRequest::create([
            'tenant_id' => $tenantId,
            'plan_id'   => $validated['plan_id'],
            'status'    => 'pending',
            'notes'     => $validated['notes'] ?? 'Subscription upgrade request submitted via Tenant Portal.',
        ]);

        $subRequest->load('tenant');

        AuditLog::log('SUBSCRIPTION_UPGRADE_APPLIED', "Tenant {$user->tenant_id} applied for {$validated['plan_id']} tier upgrade.", [
            'request_id' => $subRequest->id,
            'plan_id'    => $validated['plan_id'],
        ]);

        return response()->json([
            'message' => 'Subscription tier upgrade request submitted successfully! Pending Super Admin review.',
            'data'    => $subRequest,
        ], 201);
    }

    /**
     * GET /api/tenant/subscription-status (Tenant Admin check status)
     */
    public function myStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenant = Tenant::find($user->tenant_id);

        $latestRequest = SubscriptionRequest::where('tenant_id', $user->tenant_id)
            ->latest()
            ->first();

        return response()->json([
            'current_plan'    => $tenant ? $tenant->plan : 'starter',
            'pending_request' => $latestRequest && $latestRequest->status === 'pending' ? $latestRequest : null,
            'last_request'    => $latestRequest,
        ]);
    }

    /**
     * GET /api/super-admin/subscription-requests (Super Admin list all pending requests)
     */
    public function index(): JsonResponse
    {
        $requests = SubscriptionRequest::with('tenant')
            ->orderByRaw("FIELD(status, 'pending', 'approved', 'rejected')")
            ->latest()
            ->get();

        return response()->json(['data' => $requests]);
    }

    /**
     * PATCH /api/super-admin/subscription-requests/{id}/approve (Super Admin approve request)
     */
    public function approve($id): JsonResponse
    {
        $subRequest = SubscriptionRequest::with('tenant')->findOrFail($id);

        if ($subRequest->status === 'approved') {
            return response()->json(['message' => 'Subscription request is already approved.'], 400);
        }

        $subRequest->update([
            'status'      => 'approved',
            'reviewed_at' => now(),
        ]);

        // Upgrade tenant plan
        if ($subRequest->tenant) {
            $subRequest->tenant->update([
                'plan' => $subRequest->plan_id,
            ]);
        }

        AuditLog::log('SUBSCRIPTION_REQUEST_APPROVED', "Super Admin approved subscription upgrade to {$subRequest->plan_id} for tenant {$subRequest->tenant_id}.", [
            'request_id' => $subRequest->id,
            'tenant_id'  => $subRequest->tenant_id,
            'new_plan'   => $subRequest->plan_id,
        ]);

        return response()->json([
            'message' => "Subscription request approved! Tenant {$subRequest->tenant->business_name} upgraded to {$subRequest->plan_id} tier.",
            'data'    => $subRequest,
        ]);
    }

    /**
     * PATCH /api/super-admin/subscription-requests/{id}/reject (Super Admin reject request)
     */
    public function reject($id): JsonResponse
    {
        $subRequest = SubscriptionRequest::with('tenant')->findOrFail($id);

        $subRequest->update([
            'status'      => 'rejected',
            'reviewed_at' => now(),
        ]);

        AuditLog::log('SUBSCRIPTION_REQUEST_REJECTED', "Super Admin rejected subscription upgrade for tenant {$subRequest->tenant_id}.", [
            'request_id' => $subRequest->id,
            'tenant_id'  => $subRequest->tenant_id,
        ]);

        return response()->json([
            'message' => 'Subscription request rejected.',
            'data'    => $subRequest,
        ]);
    }
}
