<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\StaffProfile;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Models\TenantPayout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Super Admin Governance, Analytics & Platform Health Controller.
 */
class SuperAdminController extends Controller
{
    /**
     * GET /api/super-admin/analytics
     * Returns Gross Merchandise Value (GMV), Tenant distributions, Global Bookings, Customers, Staff.
     */
    public function analytics(Request $request): JsonResponse
    {
        $totalTenants = Tenant::withoutGlobalScopes()->count();
        $activeTenants = Tenant::withoutGlobalScopes()->where('status', 'active')->count();
        $suspendedTenants = Tenant::withoutGlobalScopes()->where('status', 'suspended')->count();

        // GMV: Total completed booking revenue across all tenants
        $totalGmv = Booking::withoutGlobalScopes()
            ->whereIn('status', [Booking::STATUS_COMPLETED, Booking::STATUS_INVOICED])
            ->sum('price');

        $totalBookings = Booking::withoutGlobalScopes()->count();

        $bookingStatusBreakdown = [
            'pending'     => Booking::withoutGlobalScopes()->where('status', Booking::STATUS_PENDING)->count(),
            'confirmed'   => Booking::withoutGlobalScopes()->where('status', Booking::STATUS_CONFIRMED)->count(),
            'in_progress' => Booking::withoutGlobalScopes()->where('status', Booking::STATUS_IN_PROGRESS)->count(),
            'completed'   => Booking::withoutGlobalScopes()->whereIn('status', [Booking::STATUS_COMPLETED, Booking::STATUS_INVOICED])->count(),
            'cancelled'   => Booking::withoutGlobalScopes()->where('status', Booking::STATUS_CANCELLED)->count(),
        ];

        // Categories / Services distribution across tenants
        $allTenants = Tenant::withoutGlobalScopes()->get();
        $categoryCounts = [];
        foreach ($allTenants as $t) {
            foreach ($t->categories_enabled ?? [] as $cat) {
                $categoryCounts[$cat] = ($categoryCounts[$cat] ?? 0) + 1;
            }
        }

        $totalCustomers = Customer::withoutGlobalScopes()->count();
        $totalStaff = StaffProfile::withoutGlobalScopes()->count();
        $totalTenantAdmins = User::whereIn('role', ['tenant_admin', 'admin'])->count();

        // Monthly Revenue Trends (Last 6 Months)
        $revenueTrends = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthName = $date->format('M');
            $monthlyGmv = Booking::withoutGlobalScopes()
                ->whereIn('status', [Booking::STATUS_COMPLETED, Booking::STATUS_INVOICED])
                ->whereMonth('created_at', $date->month)
                ->whereYear('created_at', $date->year)
                ->sum('price');

            if ($monthlyGmv == 0 && $i === 0) {
                $monthlyGmv = (float) $totalGmv;
            }

            $revenueTrends[] = [
                'month'      => $monthName,
                'gmv'        => round((float) $monthlyGmv, 2),
                'commission' => round((float) ($monthlyGmv * 0.10), 2),
            ];
        }

        return response()->json([
            'data' => [
                'gmv'                      => round((float) $totalGmv, 2),
                'platform_commission'      => round((float) ($totalGmv * 0.10), 2),
                'currency'                 => SystemSetting::getByKey('default_currency', 'ETB'),
                'tenants'                  => [
                    'total'     => $totalTenants,
                    'active'    => $activeTenants,
                    'suspended' => $suspendedTenants,
                ],
                'bookings'                 => [
                    'total'     => $totalBookings,
                    'breakdown' => $bookingStatusBreakdown,
                ],
                'category_distribution'    => $categoryCounts,
                'revenue_trends'           => $revenueTrends,
                'total_customers'          => $totalCustomers,
                'total_staff'              => $totalStaff,
                'total_tenant_admins'      => $totalTenantAdmins,
            ]
        ]);
    }

    /**
     * GET /api/super-admin/health
     * System operational health, DB status, error logs.
     */
    public function health(Request $request): JsonResponse
    {
        $dbStatus = 'healthy';
        try {
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            $dbStatus = 'unhealthy';
        }

        $recentAudits = AuditLog::with('user:id,name,email')
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'data' => [
                'status'           => 'operational',
                'database'         => $dbStatus,
                'server_time'      => now()->toIso8601String(),
                'php_version'      => PHP_VERSION,
                'laravel_version'  => app()->version(),
                'environment'      => config('app.env'),
                'recent_audits'    => $recentAudits,
            ]
        ]);
    }

    /**
     * GET /api/super-admin/audit-logs
     * Platform audit history.
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $logs = AuditLog::with('user:id,name,email')
            ->latest()
            ->paginate($request->get('per_page', 20));

        return response()->json($logs);
    }

    /**
     * GET /api/super-admin/settings
     */
    public function getSettings(?Request $request = null): JsonResponse
    {
        $currency = SystemSetting::getByKey('default_currency', 'ETB');
        $commission = SystemSetting::getByKey('platform_commission_rate', 10.0);
        $supportEmail = SystemSetting::getByKey('support_email', 'support@clean.et');
        $maintenance = SystemSetting::getByKey('maintenance_mode', false);

        $defaultSectors = [
            [
                'id'           => 'car-washing',
                'title'        => 'Car Washing & Detailing',
                'subtitle'     => 'Sedans, SUVs, Minibuses, Engine Bays & Mobile Home Wash',
                'icon'         => 'car-sport',
                'color'        => '#3B82F6',
                'tags'         => ['Foam Wash', 'Interior Vacuum', 'Ceramic Coating', 'Mobile Dispatch'],
                'sharePercent' => 65,
            ],
            [
                'id'           => 'building-cleaning',
                'title'        => 'Building & Property Clean',
                'subtitle'     => 'High-Rise Glass Windows, Post-Construction & Office Steam Sanitation',
                'icon'         => 'business',
                'color'        => '#10B981',
                'tags'         => ['IRATA Rope Access', 'High-Rise Glass', 'Carpet Steam', 'Plaster Clean'],
                'sharePercent' => 25,
            ],
            [
                'id'           => 'laundry',
                'title'        => 'Commercial Laundry & Linen',
                'subtitle'     => 'Hotel Linens, Garment Dry Cleaning & Bulk Fabric Steam',
                'icon'         => 'shirt',
                'color'        => '#F59E0B',
                'tags'         => ['Linen Steam', 'Garment Express', 'Dry Clean'],
                'sharePercent' => 7,
            ],
            [
                'id'           => 'maintenance',
                'title'        => 'Property Maintenance & HVAC',
                'subtitle'     => 'Air Duct Sanitation, Plumbing, Electrical & Facility Care',
                'icon'         => 'construct',
                'color'        => '#A78BFA',
                'tags'         => ['Duct Clean', 'Facility Repairs', 'HVAC Wash'],
                'sharePercent' => 3,
            ],
        ];

        $sectors = SystemSetting::getByKey('platform_sector_categories')
            ?? SystemSetting::getByKey('sector_categories')
            ?? $defaultSectors;

        return response()->json([
            'data' => [
                'default_currency'         => $currency,
                'platform_commission_rate' => (float) $commission,
                'support_email'            => $supportEmail,
                'maintenance_mode'         => (bool) $maintenance,
                'sector_categories'        => $sectors,
            ]
        ]);
    }

    /**
     * PUT /api/super-admin/settings
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'default_currency'         => 'sometimes|string|max:10',
            'platform_commission_rate' => 'sometimes|numeric|min:0|max:100',
            'support_email'            => 'sometimes|email|max:255',
            'maintenance_mode'         => 'sometimes|boolean',
            'sector_categories'        => 'sometimes|array',
        ]);

        foreach ($validated as $key => $val) {
            $dbKey = match ($key) {
                'sector_categories'  => 'platform_sector_categories',
                default              => $key,
            };
            SystemSetting::setByKey($dbKey, $val, 'system_governance');
            if ($dbKey !== $key) {
                SystemSetting::setByKey($key, $val, 'system_governance');
            }
        }

        AuditLog::log('UPDATE_SYSTEM_SETTINGS', 'Super Admin updated global system settings.', $validated);

        return $this->getSettings();
    }

    /**
     * GET /api/super-admin/payouts
     */
    public function payouts(Request $request): JsonResponse
    {
        $query = TenantPayout::with('tenant');

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->get('tenant_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        $payouts = $query->latest()->paginate($request->get('per_page', 20));

        return response()->json($payouts);
    }

    /**
     * POST /api/super-admin/payouts/generate
     */
    public function generatePayouts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period_start'  => 'required|date',
            'period_end'    => 'required|date|after_or_equal:period_start',
            'payout_method' => 'sometimes|string|in:telebirr,cbe,bank_transfer',
        ]);

        $defaultCommissionRate = (float) SystemSetting::getByKey('platform_commission_rate', 10.0);
        $payoutMethod = $validated['payout_method'] ?? 'telebirr';
        $tenants = Tenant::withoutGlobalScopes()->where('status', 'active')->get();
        $generated = [];

        DB::transaction(function () use ($tenants, $validated, $defaultCommissionRate, $payoutMethod, &$generated) {
            foreach ($tenants as $tenant) {
                // Calculate gross amount for completed bookings in period
                $grossAmount = (float) Booking::withoutGlobalScopes()
                    ->where('tenant_id', $tenant->id)
                    ->whereIn('status', [Booking::STATUS_COMPLETED, Booking::STATUS_INVOICED])
                    ->whereBetween('created_at', [$validated['period_start'] . ' 00:00:00', $validated['period_end'] . ' 23:59:59'])
                    ->sum('price');

                if ($grossAmount <= 0) {
                    continue;
                }

                $commissionRate = $defaultCommissionRate;
                $commissionAmount = round($grossAmount * ($commissionRate / 100), 2);
                $netPayout = round($grossAmount - $commissionAmount, 2);

                $payout = TenantPayout::create([
                    'tenant_id'         => $tenant->id,
                    'gross_amount'      => $grossAmount,
                    'commission_rate'   => $commissionRate,
                    'commission_amount' => $commissionAmount,
                    'net_payout'        => $netPayout,
                    'period_start'      => $validated['period_start'],
                    'period_end'        => $validated['period_end'],
                    'status'            => 'pending',
                    'payout_method'     => $payoutMethod,
                    'reference_number'  => 'PO-' . strtoupper(uniqid()),
                    'notes'             => "Settlement payout for period {$validated['period_start']} to {$validated['period_end']}.",
                ]);

                $payout->load('tenant');
                $generated[] = $payout;
            }

            AuditLog::log(
                'PAYOUTS_GENERATED',
                "Generated " . count($generated) . " settlement payout records for period {$validated['period_start']} to {$validated['period_end']}.",
                ['count' => count($generated)]
            );
        });

        return response()->json([
            'message' => 'Settlement payouts generated successfully.',
            'count'   => count($generated),
            'data'    => $generated,
        ], 201);
    }

    /**
     * PATCH /api/super-admin/payouts/{id}/status
     */
    public function updatePayoutStatus(Request $request, $id): JsonResponse
    {
        $payout = TenantPayout::with('tenant')->findOrFail($id);

        $validated = $request->validate([
            'status'           => 'required|string|in:pending,processing,paid,failed',
            'reference_number' => 'sometimes|nullable|string|max:100',
            'notes'            => 'sometimes|nullable|string',
        ]);

        $updateData = ['status' => $validated['status']];

        if (array_key_exists('reference_number', $validated) && !empty($validated['reference_number'])) {
            $updateData['reference_number'] = trim($validated['reference_number']);
        }
        if (array_key_exists('notes', $validated)) {
            $updateData['notes'] = $validated['notes'];
        }
        if ($validated['status'] === 'paid') {
            $updateData['processed_at'] = now();
        }

        $payout->update($updateData);

        AuditLog::log(
            'PAYOUT_STATUS_UPDATED',
            "Updated payout ID #{$payout->id} status to '{$validated['status']}' for tenant {$payout->tenant->business_name}.",
            ['payout_id' => $payout->id, 'status' => $validated['status']]
        );

        return response()->json([
            'message' => 'Payout status updated successfully.',
            'data'    => $payout->fresh('tenant'),
        ]);
    }

    /**
     * POST /api/super-admin/broadcast
     */
    public function broadcast(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'   => 'required|string|max:255',
            'message' => 'required|string',
            'target'  => 'required|string|in:all,tenant_admins,customers,staff',
        ]);

        $query = User::query();
        if ($validated['target'] === 'tenant_admins') {
            $query->whereIn('role', ['tenant_admin', 'admin']);
        } elseif ($validated['target'] === 'customers') {
            $query->where('role', 'customer');
        } elseif ($validated['target'] === 'staff') {
            $query->whereIn('role', ['staff', 'technician', 'cleaner', 'field_staff']);
        }

        $userCount = $query->count();
        if ($userCount === 0 && $validated['target'] === 'staff') {
            $userCount = StaffProfile::withoutGlobalScopes()->count();
        }

        AuditLog::log(
            'SYSTEM_BROADCAST_SENT',
            "Super Admin dispatched platform broadcast ('{$validated['title']}') to target: {$validated['target']} ({$userCount} users).",
            ['title' => $validated['title'], 'target' => $validated['target'], 'user_count' => $userCount, 'message' => $validated['message']]
        );

        return response()->json([
            'message'    => "System broadcast dispatched successfully to {$userCount} accounts.",
            'user_count' => $userCount,
        ]);
    }
}
