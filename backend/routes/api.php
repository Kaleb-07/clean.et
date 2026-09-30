<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\ServiceController;
use App\Http\Controllers\API\CustomerController;
use App\Http\Controllers\API\BookingController;
use App\Http\Controllers\API\CategoryController;
use App\Http\Controllers\API\SectorController;
use App\Http\Controllers\API\StaffController;
use App\Http\Controllers\API\VehicleController;
use App\Http\Controllers\API\BuildingProfileController;
use App\Http\Controllers\API\InvoiceController;
use App\Http\Controllers\API\PaymentController;
use App\Http\Controllers\API\AdminInvoiceController;
use App\Http\Controllers\API\SubscriptionController;
use App\Http\Controllers\API\BookingProofController;
use App\Http\Controllers\API\FleetAccountController;
use App\Http\Controllers\API\TenantController;
use App\Http\Controllers\API\SuperAdminController;
use App\Http\Controllers\API\NotificationController;

use App\Http\Controllers\API\ChapaWebhookController;

// ─── Health Check ──────────────────────────────────────────────────────────────
Route::get('/test', fn () => response()->json([
    'message' => 'Clean.et API is running',
    'version' => '1.0',
]));

// ─── AUTH ──────────────────────────────────────────────────────────────────────
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me',      [AuthController::class, 'me']);
    Route::put('/me',      [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/user/change-password', [AuthController::class, 'changePassword']);
    Route::post('/me/change-password',   [AuthController::class, 'changePassword']);

    // ─── NOTIFICATIONS ─────────────────────────────────────────────────────
    Route::get('/notifications',                       [NotificationController::class, 'index']);
    Route::get('/notifications/preferences',           [NotificationController::class, 'getPreferences']);
    Route::post('/notifications/preferences',          [NotificationController::class, 'updatePreferences']);
    Route::get('/notifications/unread-count',          [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/read-all',             [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read',            [NotificationController::class, 'markRead']);
    Route::delete('/notifications/{id}',               [NotificationController::class, 'destroy']);
    Route::delete('/notifications',                    [NotificationController::class, 'destroyAll']);
});

// ─── CATEGORIES & SECTORS (public) ────────────────────────────────────────────
Route::get('/categories',                [CategoryController::class, 'index']);
Route::get('/categories/{id}/sectors',   [CategoryController::class, 'sectors']);
Route::get('/sectors/{id}/schema',       [SectorController::class,   'schema']);
Route::post('/sectors/{id}/price',       [SectorController::class,   'price']);

// ─── SERVICES (public read / admin write) ─────────────────────────────────────
Route::get('/services',      [ServiceController::class, 'index']);
Route::get('/services/{id}', [ServiceController::class, 'show']);

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/services',        [ServiceController::class, 'store']);
    Route::put('/services/{id}',    [ServiceController::class, 'update']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);
});

// ─── CUSTOMERS (admin only) ───────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/customers',          [CustomerController::class, 'index']);
    Route::get('/customers/{id}',     [CustomerController::class, 'show']);
    Route::post('/customers',         [CustomerController::class, 'store']);
    Route::put('/customers/{id}',      [CustomerController::class, 'update']);
    Route::delete('/customers/{id}',  [CustomerController::class, 'destroy']);
});

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/bookings',               [BookingController::class, 'index']);
    Route::get('/bookings/{id}',          [BookingController::class, 'show']);
    Route::post('/bookings',              [BookingController::class, 'store']);
    Route::put('/bookings/{id}',          [BookingController::class, 'update']);
    Route::patch('/bookings/{id}/cancel', [BookingController::class, 'cancel']);
    Route::delete('/bookings/{id}',       [BookingController::class, 'destroy']);

    // Staff-only: accept / start / complete / cancel their own assigned jobs
    Route::patch('/bookings/{id}/staff-status', [BookingController::class, 'staffUpdateStatus']);
    // Staff-only: collect payment before completing
    Route::post('/bookings/{id}/collect-payment', [BookingController::class, 'staffCollectPayment']);
    // Staff-only: poll payment status for a booking (used for Chapa mobile polling)
    Route::get('/bookings/{id}/payment-status', [BookingController::class, 'paymentStatus']);
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::post('/bookings/{id}/assign',  [StaffController::class,   'assign']);
});

// ─── BOOKING COMPLETION PROOFS (staff or admin) ───────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/bookings/{id}/proof', [BookingProofController::class, 'store']);
});

// ─── STAFF (admin only) ───────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/staff',          [StaffController::class, 'index']);
    Route::get('/staff/{id}',     [StaffController::class, 'show']);
    Route::post('/staff',         [StaffController::class, 'store']);
    Route::put('/staff/{id}',      [StaffController::class, 'update']);
    Route::patch('/staff/{id}/availability', [StaffController::class, 'updateAvailability']);
    Route::delete('/staff/{id}',  [StaffController::class, 'destroy']);
});

// ─── SUPER ADMIN ONLY (tenant management, platform config & governance) ─────
Route::middleware(['auth:sanctum', 'super_admin'])->group(function () {
    Route::get('/tenants',                [TenantController::class, 'index']);
    Route::post('/tenants',               [TenantController::class, 'store']);
    Route::get('/tenants/{id}',           [TenantController::class, 'show']);
    Route::put('/tenants/{id}',           [TenantController::class, 'update']);
    Route::patch('/tenants/{id}/status',  [TenantController::class, 'updateStatus']);
    Route::post('/tenants/{id}/admins',   [TenantController::class, 'storeAdmin']);
    Route::delete('/tenants/{id}',        [TenantController::class, 'destroy']);

    // Analytics, System Governance & Health
    Route::get('/super-admin/analytics',  [SuperAdminController::class, 'analytics']);
    Route::get('/super-admin/health',     [SuperAdminController::class, 'health']);
    Route::get('/super-admin/audit-logs', [SuperAdminController::class, 'auditLogs']);
    Route::get('/super-admin/settings',   [SuperAdminController::class, 'getSettings']);
    Route::put('/super-admin/settings',   [SuperAdminController::class, 'updateSettings']);

    // Payouts & Commission Settlement
    Route::get('/super-admin/payouts',             [SuperAdminController::class, 'payouts']);
    Route::post('/super-admin/payouts/generate',   [SuperAdminController::class, 'generatePayouts']);
    Route::patch('/super-admin/payouts/{id}/status', [SuperAdminController::class, 'updatePayoutStatus']);

    // Financial Statement Exports & Receipts
    Route::get('/super-admin/export/payouts',            [SuperAdminController::class, 'exportPayouts']);
    Route::get('/super-admin/export/financial-summary', [SuperAdminController::class, 'exportFinancialSummary']);
    Route::get('/super-admin/payouts/{id}/receipt',      [SuperAdminController::class, 'getPayoutReceipt']);

    // Advanced Filtered Reports
    Route::get('/super-admin/reports/generate', [SuperAdminController::class, 'generateReport']);
    Route::get('/super-admin/reports/export',   [SuperAdminController::class, 'exportReport']);

    // System Broadcasts
    Route::post('/super-admin/broadcast',          [SuperAdminController::class, 'broadcast']);
});

// ─── ADMIN REPORTING (accessible to both Super Admin and Division Admins) ──
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/reports/generate', [SuperAdminController::class, 'generateReport']);
    Route::get('/reports/export',   [SuperAdminController::class, 'exportReport']);
});

// ─── VEHICLES (customer-owned) ────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/vehicles',              [VehicleController::class, 'index']);
    Route::post('/vehicles',             [VehicleController::class, 'store']);
    Route::get('/vehicles/{vehicle}',    [VehicleController::class, 'show']);
    Route::put('/vehicles/{vehicle}',    [VehicleController::class, 'update']);
    Route::delete('/vehicles/{vehicle}', [VehicleController::class, 'destroy']);
});

// ─── BUILDING PROFILES (customer-owned) ──────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/building-profiles',                        [BuildingProfileController::class, 'index']);
    Route::post('/building-profiles',                       [BuildingProfileController::class, 'store']);
    Route::get('/building-profiles/{buildingProfile}',      [BuildingProfileController::class, 'show']);
    Route::put('/building-profiles/{buildingProfile}',      [BuildingProfileController::class, 'update']);
    Route::delete('/building-profiles/{buildingProfile}',   [BuildingProfileController::class, 'destroy']);
});

// ─── INVOICES ─────────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/invoices',          [InvoiceController::class, 'index']);
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
});

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/payments',                    [PaymentController::class, 'store']);
    Route::get('/payments/{payment}',           [PaymentController::class, 'show']);
    Route::post('/payments/{payment}/verify',   [PaymentController::class, 'verify']);
});

// Chapa webhook — no auth (Chapa calls this from their servers)
Route::post('/payments/chapa/webhook', [ChapaWebhookController::class, 'handle'])
    ->withoutMiddleware(['auth:sanctum'])
    ->name('chapa.webhook');

// ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/subscriptions/plans',     [SubscriptionController::class, 'plans']);
    Route::post('/subscriptions/subscribe', [SubscriptionController::class, 'subscribe']);
});

// ─── FLEET ACCOUNTS ───────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/fleet-accounts',                           [FleetAccountController::class, 'index']);
    Route::post('/fleet-accounts',                          [FleetAccountController::class, 'store']);
    Route::get('/fleet-accounts/{id}',                      [FleetAccountController::class, 'show']);
    Route::put('/fleet-accounts/{id}',                      [FleetAccountController::class, 'update']);
    Route::delete('/fleet-accounts/{id}',                   [FleetAccountController::class, 'destroy']);
    Route::post('/fleet-accounts/{id}/vehicles',            [FleetAccountController::class, 'addVehicles']);
    Route::delete('/fleet-accounts/{id}/vehicles/{vehicleId}', [FleetAccountController::class, 'removeVehicle']);
});

// ─── ADMIN INVOICE MANAGEMENT ────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/admin/invoices/generate/{bookingId}', [AdminInvoiceController::class, 'generate']);
    Route::put('/admin/invoices/{id}/status',            [AdminInvoiceController::class, 'updateStatus']);
});

