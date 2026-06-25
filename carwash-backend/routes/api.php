<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\ServiceController;
use App\Http\Controllers\API\CustomerController;
use App\Http\Controllers\API\BookingController;


use App\Http\Controllers\API\CategoryController;
use App\Http\Controllers\API\SectorController;
use App\Http\Controllers\API\StaffController;


// Health check
Route::get('/test', fn () => response()->json(['message' => 'API is running']));

// ================= AUTH =================

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);
});


// ================= CATEGORIES & SECTORS =================
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}/sectors', [CategoryController::class, 'sectors']);
Route::get('/sectors/{id}/schema', [SectorController::class, 'schema']);
Route::post('/sectors/{id}/price', [SectorController::class, 'price']);


// ================= SERVICES =================
Route::get('/services', [ServiceController::class, 'index']);
Route::get('/services/{id}', [ServiceController::class, 'show']);

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/services', [ServiceController::class, 'store']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);
    Route::put('/services/{id}', [ServiceController::class, 'update']);
});

// ================= CUSTOMERS =================

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    Route::get('/customers', [CustomerController::class, 'index']);
});

// ================= BOOKINGS =================

Route::middleware('auth:sanctum')->group(function () {
    // Customer: view their bookings
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    // Customer: create a booking
    Route::post('/bookings', [BookingController::class, 'store']);
    // Customer: cancel their own booking
    Route::patch('/bookings/{id}/cancel', [BookingController::class, 'cancel']);
    // Customer or admin: delete a booking
    Route::delete('/bookings/{id}', [BookingController::class, 'destroy']);
    // Customer or admin: reschedule/edit a booking
    Route::put('/bookings/{id}', [BookingController::class, 'update']);
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::get('/staff', [StaffController::class, 'index']);
    Route::post('/staff', [StaffController::class, 'store']);
    Route::post('/bookings/{id}/assign', [StaffController::class, 'assign']);
});

