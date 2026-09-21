<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVehicleRequest;
use App\Http\Resources\VehicleResource;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Manages the authenticated customer's saved vehicles.
 *
 * All mutations are scoped to the requesting customer — a customer can
 * never read or modify another customer's vehicles.
 */
class VehicleController extends Controller
{
    // ─────────────────────────────────────────────
    //  GET /api/vehicles
    // ─────────────────────────────────────────────
    public function index(Request $request): AnonymousResourceCollection
    {
        $customer = $request->user()->customer;

        abort_unless($customer, 404, 'Customer profile not found.');

        $vehicles = $customer
            ->vehicles()
            ->withCount('bookings')
            ->latest()
            ->get();

        return VehicleResource::collection($vehicles);
    }

    // ─────────────────────────────────────────────
    //  POST /api/vehicles
    // ─────────────────────────────────────────────
    public function store(StoreVehicleRequest $request): VehicleResource
    {
        $customer = $request->user()->customer;

        abort_unless($customer, 404, 'Customer profile not found.');

        $vehicle = $customer->vehicles()->create($request->validated());

        return new VehicleResource($vehicle);
    }

    // ─────────────────────────────────────────────
    //  GET /api/vehicles/{vehicle}
    // ─────────────────────────────────────────────
    public function show(Request $request, Vehicle $vehicle): VehicleResource
    {
        $this->authorizeOwnership($request, $vehicle);

        $vehicle->loadCount('bookings');

        return new VehicleResource($vehicle);
    }

    // ─────────────────────────────────────────────
    //  PUT /api/vehicles/{vehicle}
    // ─────────────────────────────────────────────
    public function update(StoreVehicleRequest $request, Vehicle $vehicle): VehicleResource
    {
        $this->authorizeOwnership($request, $vehicle);

        $vehicle->update($request->validated());

        return new VehicleResource($vehicle->fresh());
    }

    // ─────────────────────────────────────────────
    //  DELETE /api/vehicles/{vehicle}
    // ─────────────────────────────────────────────
    public function destroy(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeOwnership($request, $vehicle);

        // Guard: do not allow deletion if there are active (non-completed / non-cancelled) bookings
        $activeCount = $vehicle->bookings()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

        if ($activeCount > 0) {
            return response()->json([
                'message' => "Cannot delete a vehicle with {$activeCount} active booking(s). Cancel or complete them first.",
            ], 422);
        }

        $vehicle->delete();

        return response()->json(['message' => 'Vehicle deleted.']);
    }

    // ─────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────

    /**
     * Ensure the authenticated user owns this vehicle.
     * Aborts with 403 otherwise.
     */
    private function authorizeOwnership(Request $request, Vehicle $vehicle): void
    {
        $customer = $request->user()->customer;

        abort_unless(
            $customer && $vehicle->customer_id === $customer->id,
            403,
            'You do not have access to this vehicle.'
        );
    }
}
