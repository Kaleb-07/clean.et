<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    /**
     * Register a new user.
     * Role is forced to 'customer' for public self-registration.
     *
     * @param array $data
     * @return \App\Models\User
     */
    public function register(array $data): User
    {
        $user = User::create([
            'name'      => $data['name'],
            'phone'     => $data['phone'] ?? null,
            'email'     => $data['email'] ?? null,
            'language'  => $data['language'] ?? 'en',
            'tenant_id' => $data['tenant_id'] ?? null,
            'password'  => Hash::make($data['password']),
            'role'      => 'customer', // forced to customer for public registration
        ]);

        // Automatically create a Customer profile for the registered user
        $user->customerProfile()->create([
            'subscription_tier' => 'none',
        ]);

        // Create a Sanctum token for the new user
        $token = $user->createToken('auth_token')->plainTextToken;
        $user->token = $token;

        return $user;
    }

    /**
     * Attempt to log in a user.
     *
     * @param array $data
     * @return \App\Models\User|null
     */
    public function login(array $data): ?User
    {
        $identifier = $data['phone'] ?? $data['email'] ?? null;
        if (!$identifier) {
            return null;
        }

        $user = User::where('phone', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return null;
        }

        // Create a new token for the logged-in user
        $token = $user->createToken('auth_token')->plainTextToken;
        $user->token = $token;

        return $user;
    }
}
