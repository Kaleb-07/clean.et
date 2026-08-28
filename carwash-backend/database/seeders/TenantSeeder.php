<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Service;
use App\Models\StaffProfile;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TenantSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Create System Categories ──────────────────────────────────────
        $carWashCategory = Category::firstOrCreate(
            ['slug' => 'car-washing'],
            ['name' => 'Car Washing']
        );

        $buildingCleanCategory = Category::firstOrCreate(
            ['slug' => 'building-cleaning'],
            ['name' => 'Building Cleaning']
        );

        // ── 2. Create Cleaning Service Divisions & Managers ────────────────
        // DIVISION 1: Car Washing Division
        $carWashDivision = Tenant::firstOrCreate(
            ['business_name' => 'Clean.et Car Washing Division'],
            [
                'plan'               => 'enterprise',
                'categories_enabled' => ['car-washing'],
                'status'             => 'active',
            ]
        );

        $carWashManager = User::where('email', 'carwash.admin@clean.et')->first();
        if (!$carWashManager) {
            $carWashManager = User::create([
                'tenant_id' => $carWashDivision->id,
                'name'      => 'Solomon Teklu (Car Wash Division Head)',
                'email'     => 'carwash.admin@clean.et',
                'password'  => Hash::make('admin123'),
                'role'      => 'tenant_admin',
                'phone'     => '+251911223344',
            ]);
        }

        // DIVISION 2: Building Cleaning Division
        $buildingDivision = Tenant::firstOrCreate(
            ['business_name' => 'Clean.et Building Cleaning Division'],
            [
                'plan'               => 'enterprise',
                'categories_enabled' => ['building-cleaning'],
                'status'             => 'active',
            ]
        );

        $buildingManager = User::where('email', 'building.admin@clean.et')->first();
        if (!$buildingManager) {
            $buildingManager = User::create([
                'tenant_id' => $buildingDivision->id,
                'name'      => 'Bethlehem Girma (Building Division Head)',
                'email'     => 'building.admin@clean.et',
                'password'  => Hash::make('admin123'),
                'role'      => 'tenant_admin',
                'phone'     => '+251922334455',
            ]);
        }

        // ── 3. Create Sub-Center Services for Car Washing Division ──────────
        $carServices = [
            [
                'name'        => 'Home-to-Home Mobile Doorstep Wash',
                'category'    => 'car-washing',
                'sub_center'  => 'mobile-doorstep',
                'price'       => 450.00,
                'duration'    => 45,
                'description' => 'Mobile doorstep washing service. We bring equipment, water, and power directly to your home.',
            ],
            [
                'name'        => 'Pickup & Drop-off Valet Wash',
                'category'    => 'car-washing',
                'sub_center'  => 'valet-pickup',
                'price'       => 650.00,
                'duration'    => 60,
                'description' => 'Valet service. We pick up your vehicle, wash at our facility, and return it spotless.',
            ],
            [
                'name'        => 'Corporate Fleet Washing Package',
                'category'    => 'car-washing',
                'sub_center'  => 'corporate-fleet',
                'price'       => 1200.00,
                'duration'    => 90,
                'description' => 'Tailored recurring fleet wash solutions for corporate cars, trucks, and commercial vans.',
            ],
            [
                'name'        => 'Standard Bay Station Wash',
                'category'    => 'car-washing',
                'sub_center'  => 'bay-wash',
                'price'       => 350.00,
                'duration'    => 30,
                'description' => 'Standard professional foam wash & interior vacuuming at our fully-equipped bay stations.',
            ],
        ];

        foreach ($carServices as $cs) {
            Service::firstOrCreate(
                [
                    'tenant_id' => $carWashDivision->id,
                    'name'      => $cs['name'],
                ],
                $cs
            );
        }

        // ── 4. Create Sub-Center Services for Building Cleaning Division ─────
        $buildingServices = [
            [
                'name'        => 'Exterior Facade & High-Rise Glass Cleaning',
                'category'    => 'building-cleaning',
                'sub_center'  => 'exterior-facade',
                'price'       => 3500.00,
                'duration'    => 180,
                'description' => 'Specialized facade and window washing using certified safety equipment & IRATA rope access.',
            ],
            [
                'name'        => 'Interior Building Deep Sanitization',
                'category'    => 'building-cleaning',
                'sub_center'  => 'interior-deep',
                'price'       => 2200.00,
                'duration'    => 120,
                'description' => 'Deep interior building sanitization, carpet vacuuming, surface cleaning, and dust elimination.',
            ],
        ];

        foreach ($buildingServices as $bs) {
            Service::firstOrCreate(
                [
                    'tenant_id' => $buildingDivision->id,
                    'name'      => $bs['name'],
                ],
                $bs
            );
        }

        // ── 5. Create Staff Crew Technicians ──────────────────────────────────
        $tech1User = User::where('email', 'tech1@clean.et')->first();
        if (!$tech1User) {
            $tech1User = User::create([
                'tenant_id' => $carWashDivision->id,
                'name'      => 'Tewodros Kassahun',
                'email'     => 'tech1@clean.et',
                'password'  => Hash::make('staff123'),
                'role'      => 'staff',
                'phone'     => '+251911998877',
            ]);
        }

        StaffProfile::firstOrCreate(
            ['user_id' => $tech1User->id],
            [
                'tenant_id'             => $carWashDivision->id,
                'role_title'            => 'Lead Mobile Detailer',
                'sector_qualifications' => ['car-washing'],
                'jobs_completed'        => 14,
                'average_rating'        => 4.90,
            ]
        );

        $tech2User = User::where('email', 'tech2@clean.et')->first();
        if (!$tech2User) {
            $tech2User = User::create([
                'tenant_id' => $buildingDivision->id,
                'name'      => 'Dawit Zerihun',
                'email'     => 'tech2@clean.et',
                'password'  => Hash::make('staff123'),
                'role'      => 'staff',
                'phone'     => '+251922887766',
            ]);
        }

        StaffProfile::firstOrCreate(
            ['user_id' => $tech2User->id],
            [
                'tenant_id'             => $buildingDivision->id,
                'role_title'            => 'High-Rise Rope Safety Specialist',
                'sector_qualifications' => ['building-cleaning'],
                'jobs_completed'        => 28,
                'average_rating'        => 5.00,
            ]
        );
    }
}
