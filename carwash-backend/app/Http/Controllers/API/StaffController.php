<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\StaffProfile;
use App\Models\Booking;
use App\Http\Resources\BookingResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    // GET /api/staff
    public function index(Request $request)
    {
        $query = StaffProfile::with(['user', 'certifications']);
        if ($request->user() && $request->user()->role === 'super_admin') {
            $query->withoutGlobalScopes();
        }

        $staff = $query->get();
        return response()->json($staff);
    }

    // POST /api/staff
    public function store(Request $request)
    {
        $request->validate([
            'name'                  => 'required|string|max:255',
            'phone'                 => 'required|string|max:20|unique:users,phone',
            'email'                 => 'nullable|email|unique:users,email',
            'password'              => 'required|string|min:6',
            'role_title'            => 'required|string|max:50',
            'sector_qualifications' => 'nullable|array',
            'sector_qualifications.*' => 'integer|exists:sectors,id',
        ]);

        $staffProfile = DB::transaction(function () use ($request) {
            $user = User::create([
                'name'      => $request->name,
                'phone'     => $request->phone,
                'email'     => $request->email,
                'password'  => Hash::make($request->password),
                'role'      => 'staff',
                'tenant_id' => $request->user()->tenant_id,
            ]);

            return $user->staffProfile()->create([
                'tenant_id'             => $request->user()->tenant_id,
                'role_title'            => $request->role_title,
                'sector_qualifications' => $request->sector_qualifications ?? [],
            ]);
        });

        return response()->json($staffProfile->load(['user', 'certifications']), 201);
    }

    // POST /api/bookings/{id}/assign
    public function assign(Request $request, $id)
    {
        $request->validate([
            'staff_id' => 'required|exists:staff_profiles,id',
        ]);

        $booking = Booking::withoutGlobalScopes()->findOrFail($id);
        $staff = StaffProfile::withoutGlobalScopes()->findOrFail($request->staff_id);

        $booking->update([
            'staff_id' => $staff->id,
            'status'   => Booking::STATUS_DRIVER_ASSIGNED,
        ]);

        return new BookingResource($booking->load(['tenant', 'sector.category', 'customer.user', 'staff.user', 'vehicle', 'building', 'service']));
    }

    // GET /api/staff/{id}
    public function show($id)
    {
        $staff = StaffProfile::with(['user', 'certifications'])->findOrFail($id);
        return response()->json($staff);
    }

    // DELETE /api/staff/{id}
    public function destroy($id)
    {
        $staffProfile = StaffProfile::with('user')->findOrFail($id);

        DB::transaction(function () use ($staffProfile) {
            // Delete the associated user account (cascades to tokens, etc.)
            if ($staffProfile->user) {
                $staffProfile->user->tokens()->delete();
                $staffProfile->user->delete();
            }
            $staffProfile->delete();
        });

        return response()->json(['message' => 'Staff member removed successfully.']);
    }
}
