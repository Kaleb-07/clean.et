<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@example.com');
        $password = env('ADMIN_PASSWORD');

        if (app()->environment('production') && empty($password)) {
            // Do not seed default admin in production without a password configured
            return;
        }

        if (empty($password)) {
            $password = 'admin123'; // Safe fallback for local/dev environments
        }

        // Check if admin already exists to avoid duplicates
        if (!User::where('email', $email)->exists()) {
            User::create([
                'name' => 'Admin User',
                'email' => $email,
                'password' => Hash::make($password),
                'role' => 'admin',
            ]);
        }
    }
}
