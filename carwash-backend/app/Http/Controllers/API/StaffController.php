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
            'name'                  => 'required|string|min:2|max:255',
            'phone'                 => 'nullable|string|min:6|max:30',
            'email'                 => 'nullable|email|max:255',
            'password'              => 'nullable|string|min:4',
            'role_title'            => 'required|string|min:2|max:100',
            'qualifications'        => 'nullable|array',
            'sector_qualifications' => 'nullable|array',
        ], [
            'name.required'       => 'Technician Full Name is required.',
            'name.min'            => 'Technician Full Name must be at least 2 characters.',
            'role_title.required' => 'Role Title / Designation is required.',
            'role_title.min'      => 'Role Title / Designation must be at least 2 characters.',
            'email.email'         => 'Please enter a valid email address.',
            'phone.min'           => 'Phone number must be at least 6 digits.',
        ]);

        $phone = $request->phone ? trim($request->phone) : null;
        if (!$phone || User::where('phone', $phone)->exists()) {
            $phone = '+2519' . rand(10000000, 99999999);
        }

        $email = $request->email ? trim($request->email) : null;
        if (!$email || User::where('email', $email)->exists()) {
            $email = 'tech_' . time() . '_' . rand(100, 999) . '@clean.et';
        }

        $password = $request->password ? $request->password : 'password123';
        $quals = $request->qualifications ?? $request->sector_qualifications ?? [];

        $staffProfile = DB::transaction(function () use ($request, $phone, $email, $password, $quals) {
            $tenantId = $request->user()?->tenant_id;

            $user = User::create([
                'name'      => trim($request->name),
                'phone'     => $phone,
                'email'     => $email,
                'password'  => Hash::make($password),
                'role'      => 'staff',
                'tenant_id' => $tenantId,
            ]);

            return $user->staffProfile()->create([
                'tenant_id'             => $tenantId,
                'role_title'            => trim($request->role_title),
                'sector_qualifications' => $quals,
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

    // PUT /api/staff/{id}
    public function update(Request $request, $id)
    {
        $staffProfile = StaffProfile::with('user')->findOrFail($id);

        $request->validate([
            'name'                  => 'nullable|string|max:255',
            'phone'                 => 'nullable|string|max:30',
            'email'                 => 'nullable|email',
            'role_title'            => 'nullable|string|max:100',
            'qualifications'        => 'nullable|array',
            'sector_qualifications' => 'nullable|array',
        ]);

        DB::transaction(function () use ($request, $staffProfile) {
            if ($staffProfile->user) {
                $userUpdate = [];
                if ($request->filled('name')) $userUpdate['name'] = trim($request->name);
                if ($request->filled('phone')) $userUpdate['phone'] = trim($request->phone);
                if ($request->filled('email')) $userUpdate['email'] = trim($request->email);
                if (!empty($userUpdate)) {
                    $staffProfile->user->update($userUpdate);
                }
            }

            $quals = $request->qualifications ?? $request->sector_qualifications ?? $staffProfile->sector_qualifications;
            $roleTitle = $request->role_title ? trim($request->role_title) : $staffProfile->role_title;

            $staffProfile->update([
                'role_title'            => $roleTitle,
                'sector_qualifications' => $quals,
            ]);
        });

        return response()->json($staffProfile->load(['user', 'certifications']));
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
