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
        // Only seed default admin in local or testing environments
        if (!app()->environment('local', 'testing')) {
            return;
        }

        $email = env('ADMIN_EMAIL', 'admin@example.com');
        $password = env('ADMIN_PASSWORD', 'admin123');

        // Always update or create the admin user so password is set consistently
        User::updateOrCreate(
            ['email' => $email],
            [
                'name'     => 'Admin User',
                'password' => Hash::make($password),
                'role'     => 'tenant_admin',
            ]
        );
    }
}
