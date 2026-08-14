<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Only seed the database in local or testing environments
        if (!app()->environment('local', 'testing')) {
            return;
        }

        User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'role' => 'customer',
            ]
        );

        $this->call([
            AdminSeeder::class,
            TenantSeeder::class,
        ]);
    }
}
