<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_change_password_with_correct_current_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('old_password123'),
        ]);

        $response = $this->actingAs($user)->postJson('/api/user/change-password', [
            'current_password'      => 'old_password123',
            'password'              => 'new_password123',
            'password_confirmation' => 'new_password123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status'  => 'success',
                'message' => 'Password updated successfully.',
            ]);

        $this->assertTrue(Hash::check('new_password123', $user->fresh()->password));
    }

    public function test_change_password_fails_with_wrong_current_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('old_password123'),
        ]);

        $response = $this->actingAs($user)->postJson('/api/user/change-password', [
            'current_password'      => 'wrong_password',
            'password'              => 'new_password123',
            'password_confirmation' => 'new_password123',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status'  => 'error',
                'message' => 'The current password is incorrect.',
            ]);
    }
}
