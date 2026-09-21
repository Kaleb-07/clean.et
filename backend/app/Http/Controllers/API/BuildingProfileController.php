<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBuildingProfileRequest;
use App\Http\Resources\BuildingProfileResource;
use App\Models\BuildingProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Manages the authenticated customer's saved building profiles.
 *
 * Profiles are used when creating building-cleaning bookings so the customer
 * doesn't re-enter floor-count / area data for every booking.
 */
class BuildingProfileController extends Controller
{
    // ─────────────────────────────────────────────
    //  GET /api/building-profiles
    // ─────────────────────────────────────────────
    public function index(Request $request): AnonymousResourceCollection
    {
        $customer = $request->user()->customer;

        abort_unless($customer, 404, 'Customer profile not found.');

        $profiles = $customer
            ->buildingProfiles()
            ->withCount('bookings')
            ->latest()
            ->get();

        return BuildingProfileResource::collection($profiles);
    }

    // ─────────────────────────────────────────────
    //  POST /api/building-profiles
    // ─────────────────────────────────────────────
    public function store(StoreBuildingProfileRequest $request): BuildingProfileResource
    {
        $customer = $request->user()->customer;

        abort_unless($customer, 404, 'Customer profile not found.');

        $profile = $customer->buildingProfiles()->create($request->validated());

        return new BuildingProfileResource($profile);
    }

    // ─────────────────────────────────────────────
    //  GET /api/building-profiles/{buildingProfile}
    // ─────────────────────────────────────────────
    public function show(Request $request, BuildingProfile $buildingProfile): BuildingProfileResource
    {
        $this->authorizeOwnership($request, $buildingProfile);

        $buildingProfile->loadCount('bookings');

        return new BuildingProfileResource($buildingProfile);
    }

    // ─────────────────────────────────────────────
    //  PUT /api/building-profiles/{buildingProfile}
    // ─────────────────────────────────────────────
    public function update(
        StoreBuildingProfileRequest $request,
        BuildingProfile $buildingProfile
    ): BuildingProfileResource {
        $this->authorizeOwnership($request, $buildingProfile);

        $buildingProfile->update($request->validated());

        return new BuildingProfileResource($buildingProfile->fresh());
    }

    // ─────────────────────────────────────────────
    //  DELETE /api/building-profiles/{buildingProfile}
    // ─────────────────────────────────────────────
    public function destroy(Request $request, BuildingProfile $buildingProfile): JsonResponse
    {
        $this->authorizeOwnership($request, $buildingProfile);

        $activeCount = $buildingProfile->bookings()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count();

        if ($activeCount > 0) {
            return response()->json([
                'message' => "Cannot delete a building profile with {$activeCount} active booking(s). Cancel or complete them first.",
            ], 422);
        }

        $buildingProfile->delete();

        return response()->json(['message' => 'Building profile deleted.']);
    }

    // ─────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────
    private function authorizeOwnership(Request $request, BuildingProfile $profile): void
    {
        $customer = $request->user()->customer;

        abort_unless(
            $customer && $profile->customer_id === $customer->id,
            403,
            'You do not have access to this building profile.'
        );
    }
}
