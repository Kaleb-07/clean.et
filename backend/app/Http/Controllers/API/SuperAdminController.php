<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Service;
use App\Models\StaffProfile;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Models\TenantPayout;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Super Admin Governance, Analytics & Platform Health Controller.
 */
class SuperAdminController extends Controller
{
    public function __construct(private NotificationService $notificationService)
    {
    }

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
            'pending'         => Booking::withoutGlobalScopes()->where('status', Booking::STATUS_PENDING)->count(),
            'confirmed'       => Booking::withoutGlobalScopes()->where('status', Booking::STATUS_CONFIRMED)->count(),
            'driver_assigned' => Booking::withoutGlobalScopes()->where('status', Booking::STATUS_DRIVER_ASSIGNED)->count(),
            'picked_up'       => Booking::withoutGlobalScopes()->where('status', Booking::STATUS_PICKED_UP)->count(),
            'in_progress'     => Booking::withoutGlobalScopes()->where('status', Booking::STATUS_IN_PROGRESS)->count(),
            'completed'       => Booking::withoutGlobalScopes()->whereIn('status', [Booking::STATUS_COMPLETED, Booking::STATUS_INVOICED])->count(),
            'cancelled'       => Booking::withoutGlobalScopes()->where('status', Booking::STATUS_CANCELLED)->count(),
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
            $query->where('role', 'tenant_admin');
        } elseif ($validated['target'] === 'customers') {
            $query->where('role', 'customer');
        } elseif ($validated['target'] === 'staff') {
            $query->where('role', 'staff');
        }
        // target === 'all' → no filter, every user account

        $recipients = $query->get();

        foreach ($recipients as $recipient) {
            $this->notificationService->notify(
                $recipient,
                $validated['title'],
                $validated['message'],
                ['screen' => '/profile/notifications'],
                'system'
            );
        }

        $userCount = $recipients->count();

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

    /**
     * GET /api/super-admin/export/payouts
     * Exports settlement payout records as a downloadable CSV file.
     */
    public function exportPayouts(Request $request)
    {
        $query = TenantPayout::with('tenant');
        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->get('tenant_id'));
        }
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }
        $payouts = $query->latest()->get();

        $filename = "cleanet_payouts_statement_" . date('Ymd_His') . ".csv";

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($payouts) {
            $file = fopen('php://output', 'w');
            fputcsv($file, [
                'Reference #',
                'Division / Department',
                'Gross Amount (ETB)',
                'Commission Rate (%)',
                'Platform Fee (ETB)',
                'Net Payout (ETB)',
                'Period Start',
                'Period End',
                'Payment Method',
                'Status',
                'Processed At',
                'Created At'
            ]);

            foreach ($payouts as $p) {
                fputcsv($file, [
                    $p->reference_number ?? ('PO-' . $p->id),
                    $p->tenant->business_name ?? ("Division #{$p->tenant_id}"),
                    number_format((float)$p->gross_amount, 2, '.', ''),
                    number_format((float)$p->commission_rate, 2, '.', ''),
                    number_format((float)$p->commission_amount, 2, '.', ''),
                    number_format((float)$p->net_payout, 2, '.', ''),
                    $p->period_start,
                    $p->period_end,
                    strtoupper($p->payout_method ?? 'TELEBIRR'),
                    strtoupper($p->status),
                    $p->processed_at ? $p->processed_at->toDateTimeString() : 'N/A',
                    $p->created_at->toDateTimeString(),
                ]);
            }
            fclose($file);
        };

        AuditLog::log('FINANCIAL_PAYOUTS_EXPORTED', "Super Admin exported tenant payout records to CSV.");

        return response()->stream($callback, 200, $headers);
    }

    /**
     * GET /api/super-admin/export/financial-summary
     * Exports monthly revenue trends and platform commissions breakdown as CSV.
     */
    public function exportFinancialSummary(Request $request)
    {
        $revenueTrends = [];
        $totalGmv = Booking::withoutGlobalScopes()
            ->whereIn('status', [Booking::STATUS_COMPLETED, Booking::STATUS_INVOICED])
            ->sum('price');
        $commissionRate = (float) SystemSetting::getByKey('platform_commission_rate', 10.0);

        for ($i = 11; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthlyGmv = Booking::withoutGlobalScopes()
                ->whereIn('status', [Booking::STATUS_COMPLETED, Booking::STATUS_INVOICED])
                ->whereMonth('created_at', $date->month)
                ->whereYear('created_at', $date->year)
                ->sum('price');

            if ($monthlyGmv == 0 && $i === 0) {
                $monthlyGmv = (float) $totalGmv;
            }

            $revenueTrends[] = [
                'month'              => $date->format('F Y'),
                'gmv'                => round((float)$monthlyGmv, 2),
                'commission_rate'    => $commissionRate,
                'commission_amount'  => round((float)($monthlyGmv * ($commissionRate / 100)), 2),
                'net_vendor_share'   => round((float)($monthlyGmv * (1 - ($commissionRate / 100))), 2),
                'completed_bookings' => Booking::withoutGlobalScopes()
                    ->whereIn('status', [Booking::STATUS_COMPLETED, Booking::STATUS_INVOICED])
                    ->whereMonth('created_at', $date->month)
                    ->whereYear('created_at', $date->year)
                    ->count(),
            ];
        }

        $filename = "cleanet_financial_summary_" . date('Ymd_His') . ".csv";

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($revenueTrends) {
            $file = fopen('php://output', 'w');
            fputcsv($file, [
                'Month & Year',
                'Gross Merchandise Value GMV (ETB)',
                'Commission Rate (%)',
                'Platform Commission Earned (ETB)',
                'Net Vendor Payout Total (ETB)',
                'Completed Bookings'
            ]);

            foreach ($revenueTrends as $row) {
                fputcsv($file, [
                    $row['month'],
                    number_format($row['gmv'], 2, '.', ''),
                    number_format($row['commission_rate'], 2, '.', ''),
                    number_format($row['commission_amount'], 2, '.', ''),
                    number_format($row['net_vendor_share'], 2, '.', ''),
                    $row['completed_bookings'],
                ]);
            }
            fclose($file);
        };

        AuditLog::log('FINANCIAL_SUMMARY_EXPORTED', "Super Admin exported monthly financial summary report to CSV.");

        return response()->stream($callback, 200, $headers);
    }

    /**
     * GET /api/super-admin/payouts/{id}/receipt
     * Returns printable receipt metadata and HTML template.
     */
    public function getPayoutReceipt(Request $request, $id): JsonResponse
    {
        $payout = TenantPayout::with('tenant')->findOrFail($id);
        $currency = SystemSetting::getByKey('default_currency', 'ETB');

        $html = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Financial Statement Receipt #{$payout->reference_number}</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0F172A; color: #F8FAFC; margin: 0; padding: 24px; }
        .receipt-card { max-width: 650px; margin: 0 auto; background: #1E293B; border-radius: 16px; padding: 32px; border: 1px solid #334155; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: 800; color: #10B981; }
        .badge { background: #10B98122; color: #34D399; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid #10B98155; }
        .row { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 14px; }
        .label { color: #94A3B8; }
        .value { font-weight: 600; }
        .total-box { background: #0F172A; padding: 20px; border-radius: 12px; border: 1px solid #334155; margin-top: 24px; }
        .total-amount { font-size: 28px; font-weight: 800; color: #34D399; margin-top: 6px; }
        .footer { margin-top: 32px; text-align: center; color: #64748B; font-size: 12px; }
    </style>
</head>
<body>
    <div class='receipt-card'>
        <div class='header'>
            <div>
                <div class='logo'>Clean.et Enterprise</div>
                <div style='color: #94A3B8; font-size: 13px;'>Settlement Statement Receipt</div>
            </div>
            <div class='badge'>" . strtoupper($payout->status) . "</div>
        </div>
        <div class='row'><span class='label'>Reference Number</span><span class='value'>" . ($payout->reference_number ?? 'PO-' . $payout->id) . "</span></div>
        <div class='row'><span class='label'>Service Division / Tenant</span><span class='value'>" . ($payout->tenant->business_name ?? 'Division #' . $payout->tenant_id) . "</span></div>
        <div class='row'><span class='label'>Settlement Period</span><span class='value'>{$payout->period_start} to {$payout->period_end}</span></div>
        <div class='row'><span class='label'>Payout Gateway</span><span class='value'>" . strtoupper($payout->payout_method ?? 'TELEBIRR') . "</span></div>
        <div class='row'><span class='label'>Gross Merchandise Value (GMV)</span><span class='value'>{$currency} " . number_format($payout->gross_amount, 2) . "</span></div>
        <div class='row'><span class='label'>Platform Commission ({$payout->commission_rate}%)</span><span class='value'>- {$currency} " . number_format($payout->commission_amount, 2) . "</span></div>
        <div class='total-box'>
            <div class='label'>Net Settled Disbursed Amount</div>
            <div class='total-amount'>{$currency} " . number_format($payout->net_payout, 2) . "</div>
        </div>
        <div class='footer'>Clean.et Executive Multi-Department Governance &bull; Official Digital Financial Record</div>
    </div>
</body>
</html>";

        return response()->json([
            'data' => [
                'receipt' => $payout,
                'currency' => $currency,
                'html'     => $html,
            ]
        ]);
    }

    /**
     * Helper to build filtered booking query for report generation.
     */
    private function buildReportQuery(Request $request)
    {
        $timeframe = $request->get('timeframe', 'monthly');
        $year = (int) $request->get('year', date('Y'));
        $month = (int) $request->get('month', date('n'));
        $tenantId = $request->get('tenant_id', 'all');

        $query = Booking::withoutGlobalScopes()
            ->with(['tenant', 'service', 'sector.category', 'customer.user', 'user', 'staff.user'])
            ->whereIn('status', [Booking::STATUS_COMPLETED, Booking::STATUS_INVOICED]);

        $user = $request->user();
        if ($user && !$user->isSuperAdmin() && $user->tenant_id) {
            $query->where('tenant_id', $user->tenant_id);
        } elseif ($tenantId !== 'all' && !empty($tenantId)) {
            $query->where('tenant_id', $tenantId);
        }

        if ($timeframe === 'annual') {
            $query->where(function ($q) use ($year) {
                $q->whereYear('created_at', $year)
                  ->orWhereYear('booking_date', $year);
            });
        } elseif ($timeframe === 'custom' && $request->has('start_date') && $request->has('end_date')) {
            $startDate = $request->get('start_date');
            $endDate = $request->get('end_date');
            $query->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                  ->orWhereBetween('booking_date', [$startDate, $endDate]);
            });
        } else {
            $query->where(function ($q) use ($year, $month) {
                $q->where(function ($sub) use ($year, $month) {
                    $sub->whereYear('created_at', $year)->whereMonth('created_at', $month);
                })->orWhere(function ($sub) use ($year, $month) {
                    $sub->whereYear('booking_date', $year)->whereMonth('booking_date', $month);
                });
            });
        }

        return $query;
    }

    /**
     * GET /api/super-admin/reports/generate
     */
    public function generateReport(Request $request): JsonResponse
    {
        $user = $request->user();
        $timeframe = $request->get('timeframe', 'monthly');
        $year = (int) $request->get('year', date('Y'));
        $month = (int) $request->get('month', date('n'));
        $tenantId = $request->get('tenant_id', 'all');
        $category = $request->get('category', 'all');

        $query = $this->buildReportQuery($request);
        $bookings = $query->latest()->get();

        if ($category !== 'all' && !empty($category)) {
            $categoryClean = strtolower(trim($category));
            $bookings = $bookings->filter(function ($b) use ($categoryClean) {
                $catSlug = strtolower($b->sector?->category?->slug ?? '');
                $catName = strtolower($b->sector?->category?->name ?? '');
                $sectorSlug = strtolower($b->sector?->slug ?? '');
                if ($catSlug === $categoryClean || $catName === $categoryClean || str_contains($sectorSlug, $categoryClean)) {
                    return true;
                }
                if ($b->tenant && is_array($b->tenant->categories_enabled) && in_array($categoryClean, array_map('strtolower', $b->tenant->categories_enabled))) {
                    return true;
                }
                return false;
            })->values();
        }

        $currency = SystemSetting::getByKey('default_currency', 'ETB');
        $commissionRate = (float) SystemSetting::getByKey('platform_commission_rate', 10.0);

        $totalGmv = $bookings->sum('price');
        $platformCommission = round($totalGmv * ($commissionRate / 100), 2);
        $netVendorDisbursed = round($totalGmv - $platformCommission, 2);
        $totalCompletedJobs = $bookings->count();

        $departmentBreakdown = [];
        foreach ($bookings->groupBy('tenant_id') as $tId => $group) {
            $tenantName = $group->first()->tenant->business_name ?? ("Division #" . $tId);
            $deptGmv = $group->sum('price');
            $deptCommission = round($deptGmv * ($commissionRate / 100), 2);
            $departmentBreakdown[] = [
                'tenant_id'         => $tId,
                'department_name'   => $tenantName,
                'completed_jobs'    => $group->count(),
                'gmv'               => round((float)$deptGmv, 2),
                'platform_fee'      => $deptCommission,
                'net_disbursed'     => round($deptGmv - $deptCommission, 2),
            ];
        }

        $items = $bookings->map(function ($b) use ($commissionRate) {
            $gmv = (float) $b->price;
            $comm = round($gmv * ($commissionRate / 100), 2);
            $customerName = $b->customer?->name 
                ?? $b->customer?->user?->name 
                ?? $b->user?->name 
                ?? 'Client Account';
            $customerPhone = $b->customer?->phone 
                ?? $b->customer?->user?->phone 
                ?? $b->user?->phone 
                ?? '';
            $dateStr = $b->booking_date 
                ? (is_string($b->booking_date) ? $b->booking_date : $b->booking_date->format('Y-m-d'))
                : ($b->created_at ? $b->created_at->format('Y-m-d') : 'Today');

            return [
                'id'              => $b->id,
                'date'            => $dateStr,
                'booking_time'    => $b->booking_time ?? '',
                'address'         => $b->requirement_data['service_location'] ?? $b->customer?->address ?? '',
                'department'      => $b->tenant->business_name ?? 'General Division',
                'customer_name'   => $customerName,
                'phone'           => $customerPhone,
                'service_name'    => $b->service->name ?? $b->sector->name ?? 'Standard Service',
                'sub_center'      => $b->sector->slug ?? 'station',
                'gross_amount'    => $gmv,
                'commission_fee'  => $comm,
                'net_payout'      => round($gmv - $comm, 2),
                'status'          => strtoupper($b->status),
            ];
        });

        $monthName = date('F', mktime(0, 0, 0, $month, 10));
        $periodTitle = match ($timeframe) {
            'annual' => "Annual Statement ({$year})",
            'custom' => "Custom Period (" . $request->get('start_date') . " to " . $request->get('end_date') . ")",
            default  => "Monthly Statement ({$monthName} {$year})",
        };

        return response()->json([
            'data' => [
                'period_title'         => $periodTitle,
                'timeframe'            => $timeframe,
                'year'                 => $year,
                'month'                => $month,
                'currency'             => $currency,
                'commission_rate'      => $commissionRate,
                'summary'              => [
                    'gmv'                   => round((float)$totalGmv, 2),
                    'platform_commission'   => $platformCommission,
                    'net_vendor_disbursed'  => $netVendorDisbursed,
                    'completed_jobs'        => $totalCompletedJobs,
                    'total_jobs'            => $totalCompletedJobs,
                    'total_orders'          => $totalCompletedJobs,
                    'staff_count'           => StaffProfile::where('tenant_id', $user?->tenant_id ?? 0)->count() ?: StaffProfile::count(),
                    'services_count'        => Service::count(),
                    'active_departments'    => count($departmentBreakdown),
                ],
                'department_breakdown' => $departmentBreakdown,
                'items'                => $items,
            ]
        ]);
    }

    /**
     * GET /api/super-admin/reports/export
     */
    public function exportReport(Request $request)
    {
        $format = $request->get('format', 'csv');
        $response = $this->generateReport($request);
        $data = json_decode($response->getContent(), true)['data'];

        if ($format === 'html') {
            $currency = $data['currency'];
            $itemsHtml = "";
            foreach ($data['items'] as $item) {
                $itemsHtml .= "
                <tr>
                    <td style='padding: 10px; border-bottom: 1px solid #334155;'>{$item['date']}</td>
                    <td style='padding: 10px; border-bottom: 1px solid #334155;'>{$item['department']}</td>
                    <td style='padding: 10px; border-bottom: 1px solid #334155;'>{$item['service_name']}</td>
                    <td style='padding: 10px; border-bottom: 1px solid #334155; text-align: right;'>{$currency} " . number_format($item['gross_amount'], 2) . "</td>
                    <td style='padding: 10px; border-bottom: 1px solid #334155; text-align: right; color: #F87171;'>- {$currency} " . number_format($item['commission_fee'], 2) . "</td>
                    <td style='padding: 10px; border-bottom: 1px solid #334155; text-align: right; font-weight: bold; color: #34D399;'>{$currency} " . number_format($item['net_payout'], 2) . "</td>
                </tr>";
            }

            $html = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Clean.et Executive Report - {$data['period_title']}</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0F172A; color: #F8FAFC; margin: 0; padding: 32px; }
        .report-card { max-width: 900px; margin: 0 auto; background: #1E293B; border-radius: 16px; padding: 32px; border: 1px solid #334155; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }
        .title { font-size: 24px; font-weight: 800; color: #10B981; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .stat-box { background: #0F172A; padding: 16px; border-radius: 12px; border: 1px solid #334155; text-align: center; }
        .stat-val { font-size: 20px; font-weight: 800; color: #34D399; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th { background: #0F172A; color: #94A3B8; padding: 12px; text-align: left; border-bottom: 2px solid #334155; text-transform: uppercase; font-size: 11px; }
        .footer { margin-top: 32px; text-align: center; color: #64748B; font-size: 12px; }
    </style>
</head>
<body>
    <div class='report-card'>
        <div class='header'>
            <div>
                <div class='title'>Clean.et Enterprise Governance</div>
                <div style='color: #94A3B8; font-size: 14px;'>Executive Operational & Financial Statement</div>
            </div>
            <div style='text-align: right;'>
                <div style='color: #60A5FA; font-weight: 800;'>{$data['period_title']}</div>
                <div style='color: #94A3B8; font-size: 12px;'>Generated on " . date('Y-m-d H:i') . "</div>
            </div>
        </div>

        <div class='stats-grid'>
            <div class='stat-box'><div style='color: #94A3B8; font-size: 11px;'>GROSS MERCHANDISE (GMV)</div><div class='stat-val'>{$currency} " . number_format($data['summary']['gmv'], 2) . "</div></div>
            <div class='stat-box'><div style='color: #94A3B8; font-size: 11px;'>PLATFORM COMMISSION ({$data['commission_rate']}%)</div><div class='stat-val' style='color: #F87171;'>{$currency} " . number_format($data['summary']['platform_commission'], 2) . "</div></div>
            <div class='stat-box'><div style='color: #94A3B8; font-size: 11px;'>NET VENDOR DISBURSED</div><div class='stat-val'>{$currency} " . number_format($data['summary']['net_vendor_disbursed'], 2) . "</div></div>
            <div class='stat-box'><div style='color: #94A3B8; font-size: 11px;'>COMPLETED JOBS</div><div class='stat-val' style='color: #60A5FA;'>{$data['summary']['completed_jobs']}</div></div>
        </div>

        <h3 style='color: #F8FAFC; border-bottom: 1px solid #334155; padding-bottom: 8px;'>Itemized Transactions Breakdown</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Department</th>
                    <th>Service</th>
                    <th style='text-align: right;'>Gross (ETB)</th>
                    <th style='text-align: right;'>Commission</th>
                    <th style='text-align: right;'>Net Payout</th>
                </tr>
            </thead>
            <tbody>
                {$itemsHtml}
            </tbody>
        </table>

        <div class='footer'>Clean.et Enterprise Operations &bull; Certified Executive Financial Statement</div>
    </div>
</body>
</html>";
            return response()->json(['data' => ['html' => $html]]);
        }

        $filename = "cleanet_report_" . strtolower(str_replace(' ', '_', $data['period_title'])) . "_" . date('Ymd_His') . ".csv";

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($data) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Clean.et Executive Financial & Operational Report']);
            fputcsv($file, ['Period:', $data['period_title']]);
            fputcsv($file, ['Generated Date:', date('Y-m-d H:i:s')]);
            fputcsv($file, ['Gross GMV (ETB):', $data['summary']['gmv']]);
            fputcsv($file, ['Platform Commission (ETB):', $data['summary']['platform_commission']]);
            fputcsv($file, ['Net Vendor Disbursed (ETB):', $data['summary']['net_vendor_disbursed']]);
            fputcsv($file, ['Total Completed Jobs:', $data['summary']['completed_jobs']]);
            fputcsv($file, []);

            fputcsv($file, [
                'Booking ID',
                'Date & Time',
                'Department / Division',
                'Customer Name',
                'Service / Sector',
                'Gross Amount (ETB)',
                'Commission Fee (ETB)',
                'Net Disbursed (ETB)',
                'Status'
            ]);

            foreach ($data['items'] as $item) {
                fputcsv($file, [
                    '#BK-' . $item['id'],
                    $item['date'],
                    $item['department'],
                    $item['customer_name'],
                    $item['service_name'],
                    number_format($item['gross_amount'], 2, '.', ''),
                    number_format($item['commission_fee'], 2, '.', ''),
                    number_format($item['net_payout'], 2, '.', ''),
                    $item['status'],
                ]);
            }
            fclose($file);
        };

        AuditLog::log('EXECUTIVE_REPORT_EXPORTED', "Super Admin exported executive financial report for period: {$data['period_title']}.");

        return response()->stream($callback, 200, $headers);
    }
}