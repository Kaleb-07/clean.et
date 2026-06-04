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
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'customer', // ✅ forced to customer – ignores any client input
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
        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return null;
        }

        // Create a new token for the logged-in user
        $token = $user->createToken('auth_token')->plainTextToken;
        $user->token = $token;

        return $user;
    }
}
