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

        // Subscription Plans distribution
        $planDistribution = [
            'starter'    => Tenant::withoutGlobalScopes()->where('plan', 'starter')->count(),
            'growth'     => Tenant::withoutGlobalScopes()->where('plan', 'growth')->count(),
            'enterprise' => Tenant::withoutGlobalScopes()->where('plan', 'enterprise')->count(),
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
                'plan_distribution'        => $planDistribution,
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
    public function getSettings(Request $request): JsonResponse
    {
        $currency = SystemSetting::getByKey('default_currency', 'ETB');
        $commission = SystemSetting::getByKey('platform_commission_rate', 10.0);
        $supportEmail = SystemSetting::getByKey('support_email', 'support@clean.et');
        $maintenance = SystemSetting::getByKey('maintenance_mode', false);
        $plans = SystemSetting::getByKey('tenant_subscription_plans', null);

        return response()->json([
            'data' => [
                'default_currency'         => $currency,
                'platform_commission_rate' => (float) $commission,
                'support_email'            => $supportEmail,
                'maintenance_mode'         => (bool) $maintenance,
                'subscription_plans'       => $plans,
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
            'subscription_plans'       => 'sometimes|array',
        ]);

        foreach ($validated as $key => $val) {
            SystemSetting::setByKey($key, $val, 'system_governance');
        }

        AuditLog::log('UPDATE_SYSTEM_SETTINGS', 'Super Admin updated global system settings.', $validated);

        return response()->json([
            'message' => 'System governance settings updated successfully.',
            'data'    => $validated,
        ]);
    }
}
