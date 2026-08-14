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
        $rawIdentifier = trim($data['phone'] ?? $data['email'] ?? '');
        if (!$rawIdentifier) {
            return null;
        }

        $normalizedPhone = $this->normalizePhone($rawIdentifier);

        $user = User::withoutGlobalScopes()
            ->where('email', strtolower($rawIdentifier))
            ->orWhere('phone', $rawIdentifier)
            ->orWhere(function ($query) use ($normalizedPhone) {
                if ($normalizedPhone) {
                    $query->where('phone', $normalizedPhone);
                }
            })
            ->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return null;
        }

        // Create a new token for the logged-in user
        $token = $user->createToken('auth_token')->plainTextToken;
        $user->token = $token;

        return $user;
    }

    private function normalizePhone(?string $phone): ?string
    {
        if (!$phone) return null;
        $cleaned = preg_replace('/[^\d+]/', '', trim($phone));
        if (str_starts_with($cleaned, '0')) {
            return '+251' . substr($cleaned, 1);
        }
        if (str_starts_with($cleaned, '9') && strlen($cleaned) === 9) {
            return '+251' . $cleaned;
        }
        if (str_starts_with($cleaned, '251')) {
            return '+' . $cleaned;
        }
        return $cleaned;
    }
}
