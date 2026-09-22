<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Central notification hub.
 * ─ Persists every notification to `app_notifications` (always)
 * ─ Also sends an Expo push notification if the user has a push token
 */
class NotificationService
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    // ── Booking lifecycle type map ─────────────────────────────────────────────
    private const STATUS_MAP = [
        'pending'         => [
            'type'  => 'booking_update',
            'title' => 'Booking Received',
            'body'  => "Your booking #{id} has been received and is awaiting confirmation.",
        ],
        'confirmed'       => [
            'type'  => 'booking_confirmed',
            'title' => 'Booking Confirmed',
            'body'  => "Great news! Your booking #{id} has been confirmed by our team.",
        ],
        'driver_assigned' => [
            'type'  => 'booking_update',
            'title' => 'Crew Assigned',
            'body'  => "A cleaning crew has been assigned to your booking #{id} and is on the way.",
        ],
        'picked_up'       => [
            'type'  => 'booking_update',
            'title' => 'Item Picked Up',
            'body'  => "Your vehicle for booking #{id} has been picked up from your location.",
        ],
        'in_progress'     => [
            'type'  => 'booking_update',
            'title' => 'Cleaning In Progress',
            'body'  => "Your cleaning service for booking #{id} is currently underway.",
        ],
        'completed'       => [
            'type'  => 'booking_update',
            'title' => 'Service Completed!',
            'body'  => "Booking #{id} is complete. Thank you for using Clean.et! Please check your invoice.",
        ],
        'invoiced'        => [
            'type'  => 'payment',
            'title' => 'Invoice Ready',
            'body'  => "Your invoice for booking #{id} is ready. Please proceed with payment.",
        ],
        'cancelled'       => [
            'type'  => 'booking_update',
            'title' => 'Booking Cancelled',
            'body'  => "Your booking #{id} has been cancelled. Contact support if you have questions.",
        ],
    ];

    // ── Core: persist + push ───────────────────────────────────────────────────

    /**
     * Save a notification to the database AND optionally send an Expo push.
     */
    public function notify(
        User   $user,
        string $title,
        string $body,
        array  $data = [],
        string $type = 'system'
    ): void {
        // 1. Always persist to DB
        try {
            Notification::create([
                'user_id' => $user->id,
                'type'    => $type,
                'title'   => $title,
                'body'    => $body,
                'data'    => $data ?: null,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to persist notification', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
        }

        // 2. Fire Expo push if token is available
        $this->sendPush($user, $title, $body, $data);
    }

    // ── Booking lifecycle ──────────────────────────────────────────────────────

    public function notifyBookingCreated(User $user, int $bookingId, string $sectorName = ''): void
    {
        $sector = $sectorName ? " ({$sectorName})" : '';
        $this->notify(
            $user,
            'Booking Received',
            "Your booking #{$bookingId}{$sector} has been received and is awaiting confirmation.",
            ['booking_id' => $bookingId, 'screen' => "/booking/status/{$bookingId}"],
            'booking_update'
        );
    }

    public function notifyBookingStatus(User $user, int $bookingId, string $status): void
    {
        $map  = self::STATUS_MAP[$status] ?? [
            'type'  => 'booking_update',
            'title' => 'Booking Update',
            'body'  => "Booking #{id} status changed to: {$status}.",
        ];

        $title = $map['title'];
        $body  = str_replace('{id}', (string) $bookingId, $map['body']);

        $this->notify(
            $user,
            $title,
            $body,
            ['booking_id' => $bookingId, 'status' => $status, 'screen' => "/booking/status/{$bookingId}"],
            $map['type']
        );
    }

    public function notifyBookingCancelled(User $user, int $bookingId): void
    {
        $this->notifyBookingStatus($user, $bookingId, 'cancelled');
    }

    // ── Payment ────────────────────────────────────────────────────────────────

    public function notifyPaymentConfirmed(User $user, float $amount, string $provider, int $bookingId): void
    {
        $this->notify(
            $user,
            'Payment Confirmed',
            'ETB ' . number_format($amount, 2) . ' paid via ' . strtoupper($provider) . " for booking #{$bookingId}. Thank you!",
            ['booking_id' => $bookingId, 'amount' => $amount, 'screen' => "/invoices"],
            'payment'
        );
    }

    // ── Auth ───────────────────────────────────────────────────────────────────

    public function notifyLogin(User $user): void
    {
        $this->notify(
            $user,
            'Welcome back, ' . ($user->name ?? 'there') . '!',
            'You have successfully logged in to Clean.et on ' . now()->format('M d, Y \a\t h:i A') . '.',
            ['screen' => '/home'],
            'system'
        );
    }

    public function notifyRegistration(User $user): void
    {
        $this->notify(
            $user,
            'Welcome to Clean.et! 🎉',
            'Your account has been created successfully. Start booking professional cleaning services now.',
            ['screen' => '/home'],
            'system'
        );
    }

    // ── Profile ────────────────────────────────────────────────────────────────

    public function notifyProfileUpdated(User $user): void
    {
        $this->notify(
            $user,
            'Profile Updated',
            'Your profile information has been updated successfully.',
            ['screen' => '/profile'],
            'profile'
        );
    }

    // ── Crew / Staff ───────────────────────────────────────────────────────────

    public function notifyCrewAssigned(User $user, int $bookingId, string $crewName = ''): void
    {
        $crew = $crewName ? " — {$crewName}" : '';
        $this->notify(
            $user,
            'Crew Assigned',
            "A verified cleaning crew{$crew} has been assigned to your booking #{$bookingId}.",
            ['booking_id' => $bookingId, 'screen' => "/booking/status/{$bookingId}"],
            'booking_update'
        );
    }

    // ── Internal: Expo Push ────────────────────────────────────────────────────

    private function sendPush(User $user, string $title, string $body, array $data = []): void
    {
        $token = $user->push_token ?? null;

        if (!$token || !str_starts_with($token, 'ExponentPushToken[')) {
            return;
        }

        try {
            $response = Http::timeout(5)->post(self::EXPO_PUSH_URL, [
                'to'    => $token,
                'title' => $title,
                'body'  => $body,
                'data'  => $data,
                'sound' => 'default',
            ]);

            if (!$response->successful()) {
                Log::warning('Expo push failed', [
                    'user_id' => $user->id,
                    'status'  => $response->status(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Expo push exception', ['user_id' => $user->id, 'error' => $e->getMessage()]);
        }
    }
}
