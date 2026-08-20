<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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
        $tenants = Tenant::with(['users' => function ($q) {
            $q->whereIn('role', ['tenant_admin', 'admin']);
        }])->latest()->get();

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
            'business_name'        => 'required|string|max:255',
            'plan'                 => 'required|string|max:100',
            'categories_enabled'   => 'required|array',
            'categories_enabled.*' => 'string|max:100',
            // Optional primary tenant admin creation attributes:
            'admin_name'           => 'nullable|string|max:255',
            'admin_email'          => 'nullable|email|unique:users,email|max:255',
            'admin_password'       => 'nullable|string|min:6',
            'admin_phone'          => 'nullable|string|max:50',
        ]);

        $tenantData = DB::transaction(function () use ($validated) {
            $tenant = Tenant::create([
                'business_name'      => $validated['business_name'],
                'plan'               => $validated['plan'],
                'categories_enabled' => $validated['categories_enabled'],
                'status'             => 'active',
            ]);

            $adminUser = null;
            if (!empty($validated['admin_email']) && !empty($validated['admin_password'])) {
                $cleanEmail = strtolower(trim($validated['admin_email']));
                $cleanPassword = trim($validated['admin_password']);
                $adminUser = User::create([
                    'tenant_id' => $tenant->id,
                    'name'      => !empty($validated['admin_name']) ? trim($validated['admin_name']) : ($validated['business_name'] . ' Admin'),
                    'email'     => $cleanEmail,
                    'password'  => Hash::make($cleanPassword),
                    'phone'     => !empty($validated['admin_phone']) ? trim($validated['admin_phone']) : null,
                    'role'      => 'tenant_admin',
                ]);
            }

            AuditLog::log(
                'TENANT_ONBOARDED',
                "Onboarded new tenant: {$tenant->business_name} (Plan: {$tenant->plan})",
                [
                    'tenant_id'     => $tenant->id,
                    'business_name' => $tenant->business_name,
                    'plan'          => $tenant->plan,
                    'admin_user_id' => $adminUser?->id,
                    'admin_email'   => $adminUser?->email,
                ]
            );

            $tenant->load('users');
            return $tenant;
        });

        return response()->json([
            'message' => 'Tenant onboarding completed successfully.',
            'data'    => $tenantData
        ], 201);
    }

    // ─────────────────────────────────────────────
    //  GET /api/tenants/{id}
    // ─────────────────────────────────────────────
    public function show(Request $request, $id): JsonResponse
    {
        $tenant = Tenant::with('users')->findOrFail($id);

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
            'business_name'        => 'sometimes|required|string|max:255',
            'plan'                 => 'sometimes|required|string|max:100',
            'categories_enabled'   => 'sometimes|required|array',
            'categories_enabled.*' => 'string|max:100',
            'admin_name'           => 'nullable|string|max:255',
            'admin_email'          => 'nullable|email|max:255',
            'admin_password'       => 'nullable|string|min:6',
            'admin_phone'          => 'nullable|string|max:50',
        ]);

        DB::transaction(function () use ($tenant, $validated) {
            $tenantData = array_filter([
                'business_name'      => $validated['business_name'] ?? null,
                'plan'               => $validated['plan'] ?? null,
                'categories_enabled' => $validated['categories_enabled'] ?? null,
            ]);
            if (!empty($tenantData)) {
                $tenant->update($tenantData);
            }

            // Update primary tenant admin credentials if provided
            $adminUser = User::where('tenant_id', $tenant->id)->where('role', 'tenant_admin')->first();
            if ($adminUser) {
                $userUpdates = [];
                if (!empty($validated['admin_name'])) {
                    $userUpdates['name'] = trim($validated['admin_name']);
                }
                if (!empty($validated['admin_email'])) {
                    $userUpdates['email'] = strtolower(trim($validated['admin_email']));
                }
                if (!empty($validated['admin_password'])) {
                    $userUpdates['password'] = Hash::make(trim($validated['admin_password']));
                }
                if (array_key_exists('admin_phone', $validated)) {
                    $userUpdates['phone'] = !empty($validated['admin_phone']) ? trim($validated['admin_phone']) : null;
                }

                if (!empty($userUpdates)) {
                    $adminUser->update($userUpdates);
                }
            }
        });

        AuditLog::log(
            'TENANT_UPDATED',
            "Updated tenant details and admin credentials for: {$tenant->business_name}",
            ['tenant_id' => $tenant->id]
        );

        $tenant->load('users');

        return response()->json([
            'message' => 'Tenant and admin credentials updated successfully.',
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

        AuditLog::log(
            'TENANT_STATUS_CHANGED',
            "Tenant {$tenant->business_name} status updated to {$validated['status']}",
            ['tenant_id' => $tenant->id, 'status' => $validated['status']]
        );

        return response()->json([
            'message' => 'Tenant status updated successfully.',
            'data'    => $tenant
        ]);
    }

    // ─────────────────────────────────────────────
    //  POST /api/tenants/{id}/admins
    // ─────────────────────────────────────────────
    public function storeAdmin(Request $request, $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email|max:255',
            'password' => 'required|string|min:6',
            'phone'    => 'nullable|string|max:50',
        ]);

        $admin = User::create([
            'tenant_id' => $tenant->id,
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'password'  => Hash::make($validated['password']),
            'phone'     => $validated['phone'] ?? null,
            'role'      => 'tenant_admin',
        ]);

        AuditLog::log(
            'TENANT_ADMIN_ADDED',
            "Added new tenant admin {$admin->email} to {$tenant->business_name}",
            ['tenant_id' => $tenant->id, 'user_id' => $admin->id]
        );

        return response()->json([
            'message' => 'Tenant admin user created successfully.',
            'data'    => $admin,
        ], 201);
    }

    // ─────────────────────────────────────────────
    //  DELETE /api/tenants/{id}
    // ─────────────────────────────────────────────
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);
        $businessName = $tenant->business_name;

        DB::transaction(function () use ($tenant) {
            // Delete associated tenant records (Bookings, StaffProfiles, Invoices, Users)
            \App\Models\Booking::where('tenant_id', $tenant->id)->delete();
            \App\Models\StaffProfile::where('tenant_id', $tenant->id)->delete();
            \App\Models\Invoice::where('tenant_id', $tenant->id)->delete();
            User::where('tenant_id', $tenant->id)->delete();
            $tenant->delete();
        });

        AuditLog::log(
            'TENANT_DELETED',
            "Permanently deleted tenant company: {$businessName} (ID: {$id})",
            ['tenant_id' => $id, 'business_name' => $businessName]
        );

        return response()->json([
            'message' => "Tenant business '{$businessName}' removed successfully."
        ]);
    }
}
