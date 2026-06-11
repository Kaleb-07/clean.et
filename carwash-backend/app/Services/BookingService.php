<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\User;
use App\Notifications\BookingNotification;

class BookingService
{
    public function getAll($user)
    {
        // Admin sees all bookings
        if ($user->isAdmin()) {
            return Booking::with(['user', 'service'])->latest()->get();
        }

        // Customer sees only their bookings
        return Booking::with(['service'])
            ->where('user_id', $user->id)
            ->latest()
            ->get();
    }

    public function getById($id, $user)
    {
        $booking = Booking::with(['user', 'service'])->findOrFail($id);

        // Security check
        if (!$user->isAdmin() && $booking->user_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        return $booking;
    }

    public function create($data, $user)
         {
                $booking = Booking::create([
                'user_id' => $user->id,
                'service_id' => $data['service_id'],
                'booking_date' => $data['booking_date'],
                'booking_time' => $data['booking_time'],
                'status' => Booking::STATUS_PENDING,
            ]);

            // Notify admin
            $admins = User::where('role', 'admin')->get();

            foreach ($admins as $admin) {
                $admin->notify(new BookingNotification("New booking created"));
            }

            return $booking;
        }

     public function update($id, $data)
      {
       $booking = Booking::findOrFail($id);
            $booking->update($data);

        return $booking;
      }
public function delete($id, $actor)
{
    $booking = Booking::findOrFail($id);

    $isAdmin = $actor->role === 'admin';
    $isOwner = $booking->user_id === $actor->id;

    if (!$isAdmin && !$isOwner) {
        abort(403, 'Unauthorized');
    }

    $booking->delete();

    return true;
}
    public function updateStatus($id, $status)
    {
        $booking = Booking::findOrFail($id);

        $validStatuses = [
            Booking::STATUS_PENDING,
            Booking::STATUS_IN_PROGRESS,
            Booking::STATUS_COMPLETED,
        ];

        if (!in_array($status, $validStatuses)) {<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\User;
use App\Notifications\BookingNotification;

class BookingService
{
    public function getAll($user)
    {
        // Admin sees all bookings
        if ($user->isAdmin()) {
            return Booking::with(['user', 'service'])->latest()->get();
        }

        // Customer sees only their bookings – eager load both relationships to prevent N+1
        return Booking::with(['service', 'user'])
            ->where('user_id', $user->id)
            ->latest()
            ->get();
    }

    public function getById($id, $user)
    {
        $booking = Booking::with(['user', 'service'])->findOrFail($id);

        // Security check
        if (!$user->isAdmin() && $booking->user_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        return $booking;
    }

    public function create($data, $user)
    {
        $booking = Booking::create([
            'user_id' => $user->id,
            'service_id' => $data['service_id'],
            'booking_date' => $data['booking_date'],
            'booking_time' => $data['booking_time'],
            'status' => Booking::STATUS_PENDING,
        ]);

        // Notify admin
        $admins = User::where('role', 'admin')->get();

        foreach ($admins as $admin) {
            $admin->notify(new BookingNotification("New booking created"));
        }

        return $booking;
    }

    public function update($id, $data)
    {
        $booking = Booking::findOrFail($id);
        $booking->update($data);

        return $booking;
    }

    public function delete($id, $actor)
    {
        $booking = Booking::findOrFail($id);

        $isAdmin = $actor->role === 'admin';
        $isOwner = $booking->user_id === $actor->id;

        if (!$isAdmin && !$isOwner) {
            abort(403, 'Unauthorized');
        }

        $booking->delete();

        return true;
    }

    public function updateStatus($id, $status)
    {
        // Eager load user to prevent N+1 when notifying (optional but recommended)
        $booking = Booking::with('user')->findOrFail($id);

        $validStatuses = [
            Booking::STATUS_PENDING,
            Booking::STATUS_IN_PROGRESS,
            Booking::STATUS_COMPLETED,
        ];

        if (!in_array($status, $validStatuses)) {
            abort(400, 'Invalid status');
        }

        $booking->update(['status' => $status]);

        $booking->user->notify(
            new BookingNotification("Your booking status is now: " . $status)
        );

        return $booking;
    }
}
            abort(400, 'Invalid status');
        }

        $booking->update(['status' => $status]);

        $booking->user->notify(
            new BookingNotification("Your booking status is now: " . $status)
        );

        return $booking;
    }
}
