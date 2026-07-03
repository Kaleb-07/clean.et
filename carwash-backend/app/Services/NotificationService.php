<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends push notifications to customers via the Expo Push API.
 * Fire-and-forget: errors are logged but never propagated.
 */
class NotificationService
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /**
     * Send an Expo push notification to a user who has a registered push token.
     *
     * @param User   $user    The recipient
     * @param string $title   Notification title
     * @param string $body    Notification body text
     * @param array  $data    Optional extra payload sent to the app
     */
    public function notify(User $user, string $title, string $body, array $data = []): void
    {
        $token = $user->push_token ?? null;

        // Skip if no token registered
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
                Log::warning('Expo push notification failed', [
                    'user_id' => $user->id,
                    'status'  => $response->status(),
                    'body'    => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            // Never let notification errors bubble up
            Log::error('Expo push notification exception', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    /**
     * Convenience: send a booking status update notification.
     */
    public function notifyBookingStatus(User $user, int $bookingId, string $status): void
    {
        $messages = [
            'pending'         => ['📋 Booking Received',       "Your booking #{$bookingId} is pending confirmation."],
            'confirmed'       => ['✅ Booking Confirmed',       "Your booking #{$bookingId} has been confirmed!"],
            'driver_assigned' => ['🚗 Driver Assigned',         "A driver has been assigned to booking #{$bookingId}."],
            'picked_up'       => ['🔄 Item Picked Up',          "Your item for booking #{$bookingId} has been picked up."],
            'in_progress'     => ['🧹 Cleaning In Progress',    "Your cleaning for booking #{$bookingId} is underway."],
            'completed'       => ['🎉 Cleaning Completed',      "Booking #{$bookingId} is complete. Please check your invoice."],
            'invoiced'        => ['🧾 Invoice Ready',           "Your invoice for booking #{$bookingId} is ready for payment."],
            'cancelled'       => ['❌ Booking Cancelled',       "Booking #{$bookingId} has been cancelled."],
        ];

        [$title, $body] = $messages[$status] ?? ['📬 Booking Update', "Booking #{$bookingId} status changed to: {$status}."];

        $this->notify($user, $title, $body, [
            'booking_id' => $bookingId,
            'status'     => $status,
            'screen'     => "/booking/status/{$bookingId}",
        ]);
    }
}
