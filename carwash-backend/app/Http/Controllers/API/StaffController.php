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
    public function index()
    {
        $staff = StaffProfile::with(['user', 'certifications'])->get();
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

        $booking = Booking::findOrFail($id);
        $staff = StaffProfile::findOrFail($request->staff_id);

        if ($booking->sector_id && !$staff->isQualifiedFor($booking->sector_id)) {
            return response()->json([
                'message' => 'Staff member is not qualified for this sector cleaning.'
            ], 422);
        }

        $booking->update([
            'staff_id' => $staff->id,
            'status'   => Booking::STATUS_DRIVER_ASSIGNED,
        ]);

        return new BookingResource($booking->load(['sector.category', 'customer.user', 'staff.user', 'vehicle', 'building', 'service']));
    }
}
