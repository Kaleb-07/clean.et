<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Super Admin Tenant Management Controller.
 * Restricted to super_admin roles.
 */
class TenantController extends Controller
{
    // ─────────────────────────────────────────────
    //  GET /api/tenants
    // ─────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $tenants = Tenant::latest()->get();

        return response()->json([
            'data' => $tenants
        ]);
    }

    // ─────────────────────────────────────────────
    //  POST /api/tenants
    // ─────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'business_name'      => 'required|string|max:255',
            'plan'               => 'required|string|in:starter,growth,enterprise',
            'categories_enabled' => 'required|array',
            'categories_enabled.*' => 'string|max:100',
        ]);

        $tenant = Tenant::create([
            'business_name'      => $validated['business_name'],
            'plan'               => $validated['plan'],
            'categories_enabled' => $validated['categories_enabled'],
            'status'             => 'active',
        ]);

        return response()->json([
            'message' => 'Tenant onboarding completed successfully.',
            'data'    => $tenant
        ], 201);
    }

    // ─────────────────────────────────────────────
    //  GET /api/tenants/{id}
    // ─────────────────────────────────────────────
    public function show(Request $request, $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);

        return response()->json([
            'data' => $tenant
        ]);
    }

    // ─────────────────────────────────────────────
    //  PUT /api/tenants/{id}
    // ─────────────────────────────────────────────
    public function update(Request $request, $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'business_name'      => 'required|string|max:255',
            'plan'               => 'required|string|in:starter,growth,enterprise',
            'categories_enabled' => 'required|array',
            'categories_enabled.*' => 'string|max:100',
        ]);

        $tenant->update($validated);

        return response()->json([
            'message' => 'Tenant settings updated successfully.',
            'data'    => $tenant
        ]);
    }

    // ─────────────────────────────────────────────
    //  PATCH /api/tenants/{id}/status
    // ─────────────────────────────────────────────
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:active,suspended',
        ]);

        $tenant->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Tenant status updated successfully.',
            'data'    => $tenant
        ]);
    }
}
