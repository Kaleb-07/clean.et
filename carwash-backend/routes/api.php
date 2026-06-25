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
    Route::get('/customers',       [CustomerController::class, 'index']);
    Route::get('/customers/{id}',  [CustomerController::class, 'show']);
    Route::post('/customers',      [CustomerController::class, 'store']);
});

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/bookings',               [BookingController::class, 'index']);
    Route::get('/bookings/{id}',          [BookingController::class, 'show']);
    Route::post('/bookings',              [BookingController::class, 'store']);
    Route::put('/bookings/{id}',          [BookingController::class, 'update']);
    Route::patch('/bookings/{id}/cancel', [BookingController::class, 'cancel']);
    Route::delete('/bookings/{id}',       [BookingController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::post('/bookings/{id}/assign',  [StaffController::class,   'assign']);
});

// ─── STAFF (admin only) ───────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/staff',          [StaffController::class, 'index']);
    Route::get('/staff/{id}',     [StaffController::class, 'show']);
    Route::post('/staff',         [StaffController::class, 'store']);
    Route::delete('/staff/{id}',  [StaffController::class, 'destroy']);
});

// ─── SUPER ADMIN ONLY (future: tenant management, platform config) ────────
// Route::middleware(['auth:sanctum', 'super_admin'])->group(function () {
//     Route::get('/tenants',    [TenantController::class, 'index']);
//     Route::post('/tenants',   [TenantController::class, 'store']);
// });

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
