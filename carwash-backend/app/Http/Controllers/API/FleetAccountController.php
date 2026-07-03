<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\FleetAccount;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Manages the corporate fleet accounts for the authenticated customer.
 *
 * Allows listing, creating, viewing, updating, and deleting fleet accounts,
 * as well as associating and disassociating owned vehicles with a fleet.
 */
class FleetAccountController extends Controller
{
    // ─────────────────────────────────────────────
    //  GET /api/fleet-accounts
    // ─────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $customer = $request->user()->customer;
        abort_unless($customer, 404, 'Customer profile not found.');

        $fleetAccounts = $customer->fleetAccounts()
            ->with('vehicles')
            ->latest()
            ->get();

        return response()->json([
            'data' => $fleetAccounts->map(fn($f) => $this->formatFleetAccount($f))
        ]);
    }

    // ─────────────────────────────────────────────
    //  POST /api/fleet-accounts
    // ─────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $customer = $request->user()->customer;
        abort_unless($customer, 404, 'Customer profile not found.');

        $validated = $request->validate([
            'company_name'          => 'required|string|max:255',
            'billing_contact_email' => 'nullable|email|max:255',
        ]);

        $fleetAccount = $customer->fleetAccounts()->create($validated);

        return response()->json([
            'message' => 'Fleet account created successfully.',
            'data'    => $this->formatFleetAccount($fleetAccount->load('vehicles'))
        ], 201);
    }

    // ─────────────────────────────────────────────
    //  GET /api/fleet-accounts/{id}
    // ─────────────────────────────────────────────
    public function show(Request $request, $id): JsonResponse
    {
        $fleetAccount = $this->authorizeOwnership($request, $id);
        $fleetAccount->load('vehicles');

        return response()->json([
            'data' => $this->formatFleetAccount($fleetAccount)
        ]);
    }

    // ─────────────────────────────────────────────
    //  PUT /api/fleet-accounts/{id}
    // ─────────────────────────────────────────────
    public function update(Request $request, $id): JsonResponse
    {
        $fleetAccount = $this->authorizeOwnership($request, $id);

        $validated = $request->validate([
            'company_name'          => 'required|string|max:255',
            'billing_contact_email' => 'nullable|email|max:255',
        ]);

        $fleetAccount->update($validated);

        return response()->json([
            'message' => 'Fleet account updated successfully.',
            'data'    => $this->formatFleetAccount($fleetAccount->load('vehicles'))
        ]);
    }

    // ─────────────────────────────────────────────
    //  DELETE /api/fleet-accounts/{id}
    // ─────────────────────────────────────────────
    public function destroy(Request $request, $id): JsonResponse
    {
        $fleetAccount = $this->authorizeOwnership($request, $id);

        // Before deleting, detach any vehicles
        $fleetAccount->vehicles()->update(['fleet_account_id' => null]);

        $fleetAccount->delete();

        return response()->json([
            'message' => 'Fleet account deleted successfully.'
        ]);
    }

    // ─────────────────────────────────────────────
    //  POST /api/fleet-accounts/{id}/vehicles (Link)
    // ─────────────────────────────────────────────
    public function addVehicles(Request $request, $id): JsonResponse
    {
        $fleetAccount = $this->authorizeOwnership($request, $id);
        $customer = $request->user()->customer;

        $validated = $request->validate([
            'vehicle_ids'   => 'required|array',
            'vehicle_ids.*' => 'integer|exists:vehicles,id',
        ]);

        // Widen search to customer's vehicles to avoid piggy-backing on another customer's vehicle
        $vehicles = $customer->vehicles()
            ->whereIn('id', $validated['vehicle_ids'])
            ->get();

        foreach ($vehicles as $vehicle) {
            $vehicle->update(['fleet_account_id' => $fleetAccount->id]);
        }

        return response()->json([
            'message' => count($vehicles) . ' vehicle(s) added to fleet successfully.',
            'data'    => $this->formatFleetAccount($fleetAccount->load('vehicles'))
        ]);
    }

    // ─────────────────────────────────────────────
    //  DELETE /api/fleet-accounts/{id}/vehicles/{vehicleId} (Unlink)
    // ─────────────────────────────────────────────
    public function removeVehicle(Request $request, $id, $vehicleId): JsonResponse
    {
        $fleetAccount = $this->authorizeOwnership($request, $id);
        
        $vehicle = $fleetAccount->vehicles()
            ->where('id', $vehicleId)
            ->firstOrFail();

        $vehicle->update(['fleet_account_id' => null]);

        return response()->json([
            'message' => 'Vehicle removed from fleet successfully.',
            'data'    => $this->formatFleetAccount($fleetAccount->load('vehicles'))
        ]);
    }

    // ─────────────────────────────────────────────
    //  Private Helpers
    // ─────────────────────────────────────────────

    private function authorizeOwnership(Request $request, $id): FleetAccount
    {
        $customer = $request->user()->customer;
        abort_unless($customer, 404, 'Customer profile not found.');

        $fleetAccount = FleetAccount::where('id', $id)
            ->where('customer_id', $customer->id)
            ->first();

        abort_unless($fleetAccount, 403, 'You do not have access to this fleet account.');

        return $fleetAccount;
    }

    private function formatFleetAccount(FleetAccount $f): array
    {
        return [
            'id'                    => $f->id,
            'company_name'          => $f->company_name,
            'billing_contact_email' => $f->billing_contact_email,
            'created_at'            => $f->created_at?->toISOString(),
            'vehicles'              => $f->vehicles->map(fn($v) => [
                'id'            => $v->id,
                'vehicle_class' => $v->vehicle_class,
                'plate_number'  => $v->plate_number,
                'make'          => $v->make,
                'model'         => $v->model,
                'color'         => $v->color,
                'year'          => $v->year,
            ])->values()->toArray()
        ];
    }
}
