<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationPreferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_get_default_notification_preferences(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/notifications/preferences');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'appointment_updates' => true,
                    'reminders'           => true,
                    'chat_messages'       => true,
                    'promotions'          => false,
                    'email_notifications' => true,
                    'sms_notifications'   => false,
                ],
            ]);
    }

    public function test_user_can_update_notification_preferences(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/notifications/preferences', [
            'promotions'        => true,
            'sms_notifications' => true,
            'reminders'         => false,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'appointment_updates' => true,
                    'reminders'           => false,
                    'chat_messages'       => true,
                    'promotions'          => true,
                    'email_notifications' => true,
                    'sms_notifications'   => true,
                ],
            ]);

        $this->assertFalse($user->fresh()->getNotificationPreferences()['reminders']);
        $this->assertTrue($user->fresh()->getNotificationPreferences()['promotions']);
    }

    public function test_notification_service_respects_user_preferences(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => [
                'appointment_updates' => false,
                'promotions'          => true,
            ],
        ]);

        $service = app(NotificationService::class);

        // Appointment update should be skipped
        $service->notify($user, 'Test Booking', 'Update body', [], 'booking_update');
        $this->assertDatabaseMissing('app_notifications', [
            'user_id' => $user->id,
            'title'   => 'Test Booking',
        ]);

        // Promo should be allowed because user enabled it
        $service->notify($user, 'Promo Deal', '20% off', [], 'promo');
        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $user->id,
            'title'   => 'Promo Deal',
        ]);
    }
}
