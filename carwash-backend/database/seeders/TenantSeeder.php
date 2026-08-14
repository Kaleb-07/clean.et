<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BuildingProfile;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Sector;
use App\Models\Service;
use App\Models\StaffProfile;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TenantSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Create System Default Categories ──────────────────────────────
        $carWashCategory = Category::firstOrCreate(
            ['slug' => 'car-washing'],
            ['name' => 'Car Washing']
        );

        $buildingCleanCategory = Category::firstOrCreate(
            ['slug' => 'building-cleaning'],
            ['name' => 'Building Cleaning']
        );

        // ── 2. Create Multi-Tenant Companies & Tenant Admins ──────────────────

        // TENANT 1: Clean.et Platform HQ
        $tenant1 = Tenant::firstOrCreate(
            ['business_name' => 'Clean.et Platform HQ'],
            [
                'plan'               => 'enterprise',
                'categories_enabled' => ['car-washing', 'building-cleaning'],
                'status'             => 'active',
            ]
        );

        $admin1 = User::firstOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@example.com')],
            [
                'tenant_id' => $tenant1->id,
                'name'      => 'Platform HQ Admin',
                'password'  => Hash::make(env('ADMIN_PASSWORD', 'admin123')),
                'role'      => 'tenant_admin',
                'phone'     => '+251911000001',
            ]
        );

        // TENANT 2: Apex Car Detailing & Wash Ltd
        $tenant2 = Tenant::firstOrCreate(
            ['business_name' => 'Apex Car Detailing & Wash Ltd'],
            [
                'plan'               => 'growth',
                'categories_enabled' => ['car-washing'],
                'status'             => 'active',
            ]
        );

        $admin2 = User::firstOrCreate(
            ['email' => 'admin.apex@clean.et'],
            [
                'tenant_id' => $tenant2->id,
                'name'      => 'Solomon Teklu',
                'password'  => Hash::make('password123'),
                'role'      => 'tenant_admin',
                'phone'     => '+251911223344',
            ]
        );

        // TENANT 3: Skyline Commercial & High-Rise Cleaning Co
        $tenant3 = Tenant::firstOrCreate(
            ['business_name' => 'Skyline High-Rise & Commercial Cleaners'],
            [
                'plan'               => 'enterprise',
                'categories_enabled' => ['building-cleaning'],
                'status'             => 'active',
            ]
        );

        $admin3 = User::firstOrCreate(
            ['email' => 'admin.skyline@clean.et'],
            [
                'tenant_id' => $tenant3->id,
                'name'      => 'Bethlehem Girma',
                'password'  => Hash::make('password123'),
                'role'      => 'tenant_admin',
                'phone'     => '+251922334455',
            ]
        );

        // TENANT 4: OmniClean Hybrid Services
        $tenant4 = Tenant::firstOrCreate(
            ['business_name' => 'OmniClean Hybrid Services'],
            [
                'plan'               => 'starter',
                'categories_enabled' => ['car-washing', 'building-cleaning'],
                'status'             => 'active',
            ]
        );

        $admin4 = User::firstOrCreate(
            ['email' => 'admin.omniclean@clean.et'],
            [
                'tenant_id' => $tenant4->id,
                'name'      => 'Yonas Haile',
                'password'  => Hash::make('password123'),
                'role'      => 'tenant_admin',
                'phone'     => '+251933445566',
            ]
        );

        // ── 3. Create Services Catalog ────────────────────────────────────────
        Service::firstOrCreate(
            ['name' => 'Executive Exterior Car Wash'],
            ['description' => 'Full exterior foam wash, tire shine, and hand drying.', 'price' => 350.00]
        );

        Service::firstOrCreate(
            ['name' => 'Deluxe Interior & Exterior Detail'],
            ['description' => 'Deep steam vacuum, leather conditioning, engine bay wash.', 'price' => 850.00]
        );

        Service::firstOrCreate(
            ['name' => 'Exterior High-Rise Glass Steam Wash'],
            ['description' => 'Rope-access IRATA certified facade washing for 7+ floor buildings.', 'price' => 4200.00]
        );

        Service::firstOrCreate(
            ['name' => 'Post-Construction Deep Sanitation'],
            ['description' => 'Plaster removal, dust extraction, floor polishing.', 'price' => 3500.00]
        );

        // ── 4. Create Car Wash Sectors ────────────────────────────────────────
        Sector::firstOrCreate(
            ['category_id' => $carWashCategory->id, 'slug' => 'standard-bay-wash'],
            [
                'name'               => 'Standard Bay Wash',
                'requirement_schema' => [
                    'fields' => [
                        [
                            'key'      => 'vehicle_class',
                            'label'    => 'Vehicle Class',
                            'type'     => 'select',
                            'required' => true,
                            'options'  => [
                                ['value' => 'small_car',          'label' => 'Small Car'],
                                ['value' => 'suv_pickup',         'label' => 'SUV / Pickup'],
                                ['value' => 'minibus_van',        'label' => 'Minibus / Van'],
                            ],
                        ],
                    ],
                ],
            ]
        );

        Sector::firstOrCreate(
            ['category_id' => $carWashCategory->id, 'slug' => 'home-to-home'],
            [
                'name'               => 'Home-to-Home Mobile Wash',
                'requirement_schema' => [
                    'fields' => [
                        [
                            'key'      => 'vehicle_class',
                            'label'    => 'Vehicle Class',
                            'type'     => 'select',
                            'required' => true,
                            'options'  => [
                                ['value' => 'small_car',          'label' => 'Small Car'],
                                ['value' => 'suv_pickup',         'label' => 'SUV / Pickup'],
                            ],
                        ],
                        [
                            'key'      => 'address',
                            'label'    => 'Pickup Address',
                            'type'     => 'text',
                            'required' => true,
                        ],
                    ],
                ],
            ]
        );

        // ── 5. Create Building Cleaning Sectors ────────────────────────────────
        Sector::firstOrCreate(
            ['category_id' => $buildingCleanCategory->id, 'slug' => 'interior-cleaning'],
            [
                'name'               => 'Interior Property Cleaning',
                'requirement_schema' => [
                    'fields' => [
                        ['key' => 'total_area', 'label' => 'Total Area (sqm)', 'type' => 'number', 'required' => true],
                        ['key' => 'floor_count', 'label' => 'Floors', 'type' => 'number', 'required' => true],
                    ],
                ],
            ]
        );

        Sector::firstOrCreate(
            ['category_id' => $buildingCleanCategory->id, 'slug' => 'exterior-cleaning'],
            [
                'name'               => 'Exterior High-Rise Façade Clean',
                'requirement_schema' => [
                    'fields' => [
                        ['key' => 'facade_area', 'label' => 'Facade Area (sqm)', 'type' => 'number', 'required' => true],
                        ['key' => 'floor_count', 'label' => 'Floors', 'type' => 'number', 'required' => true],
                    ],
                ],
            ]
        );

        // ── 6. Create Staff Profiles for Tenants ──────────────────────────────
        
        // Staff 1 (Apex Car Wash)
        $staffUser1 = User::firstOrCreate(
            ['email' => 'staff.dawit@apex.et'],
            [
                'tenant_id' => $tenant2->id,
                'name'      => 'Dawit Yilma',
                'password'  => Hash::make('password123'),
                'role'      => 'staff',
                'phone'     => '+251911778899',
            ]
        );

        $staff1 = StaffProfile::firstOrCreate(
            ['user_id' => $staffUser1->id],
            [
                'tenant_id'             => $tenant2->id,
                'role_title'            => 'Master Detailing Technician',
                'sector_qualifications' => [1, 2],
                'jobs_completed'        => 28,
                'average_rating'       => 4.95,
            ]
        );

        // Staff 2 (Apex Car Wash)
        $staffUser2 = User::firstOrCreate(
            ['email' => 'staff.kaleb@apex.et'],
            [
                'tenant_id' => $tenant2->id,
                'name'      => 'Kaleb Tadesse',
                'password'  => Hash::make('password123'),
                'role'      => 'staff',
                'phone'     => '+251922889900',
            ]
        );

        $staff2 = StaffProfile::firstOrCreate(
            ['user_id' => $staffUser2->id],
            [
                'tenant_id'             => $tenant2->id,
                'role_title'            => 'Mobile Wash Specialist',
                'sector_qualifications' => [2],
                'jobs_completed'        => 19,
                'average_rating'       => 4.85,
            ]
        );

        // Staff 3 (Skyline Cleaning)
        $staffUser3 = User::firstOrCreate(
            ['email' => 'staff.elias@skyline.et'],
            [
                'tenant_id' => $tenant3->id,
                'name'      => 'Elias Worku',
                'password'  => Hash::make('password123'),
                'role'      => 'staff',
                'phone'     => '+251933990011',
            ]
        );

        $staff3 = StaffProfile::firstOrCreate(
            ['user_id' => $staffUser3->id],
            [
                'tenant_id'             => $tenant3->id,
                'role_title'            => 'IRATA Level 3 Rope Access Tech',
                'sector_qualifications' => [4],
                'jobs_completed'        => 42,
                'average_rating'       => 5.00,
            ]
        );

        // Staff 4 (Skyline Cleaning)
        $staffUser4 = User::firstOrCreate(
            ['email' => 'staff.hana@skyline.et'],
            [
                'tenant_id' => $tenant3->id,
                'name'      => 'Hana Alemu',
                'password'  => Hash::make('password123'),
                'role'      => 'staff',
                'phone'     => '+251944001122',
            ]
        );

        $staff4 = StaffProfile::firstOrCreate(
            ['user_id' => $staffUser4->id],
            [
                'tenant_id'             => $tenant3->id,
                'role_title'            => 'Post-Construction Sanitation Lead',
                'sector_qualifications' => [3, 4],
                'jobs_completed'        => 31,
                'average_rating'       => 4.90,
            ]
        );

        // ── 7. Create Customers & Assets ──────────────────────────────────────
        $customerUser1 = User::firstOrCreate(
            ['email' => 'customer1@clean.et'],
            [
                'name'     => 'Abebe Bikila',
                'password' => Hash::make('password123'),
                'role'     => 'customer',
                'phone'    => '+251911111111',
            ]
        );

        $customer1 = Customer::firstOrCreate(
            ['user_id' => $customerUser1->id],
            ['subscription_tier' => 'plus']
        );

        $customerUser2 = User::firstOrCreate(
            ['email' => 'customer2@clean.et'],
            [
                'name'     => 'Tigist Assefa',
                'password' => Hash::make('password123'),
                'role'     => 'customer',
                'phone'    => '+251922222222',
            ]
        );

        $customer2 = Customer::firstOrCreate(
            ['user_id' => $customerUser2->id],
            ['subscription_tier' => 'premium']
        );

        // Assets
        $vehicle1 = Vehicle::firstOrCreate(
            ['plate_number' => 'AA-3-98765'],
            [
                'customer_id'   => $customer1->id,
                'vehicle_class' => 'suv',
                'make'          => 'Toyota',
                'model'         => 'Land Cruiser',
                'color'         => 'Pearl White',
                'year'          => 2024,
            ]
        );

        $building1 = BuildingProfile::firstOrCreate(
            ['name' => 'Skyline Commercial Plaza Unit 4B'],
            [
                'customer_id'    => $customer2->id,
                'area_sqm'       => 450.00,
                'floor_count'    => 8,
                'room_inventory' => ['offices' => 12, 'restrooms' => 4, 'halls' => 2],
                'access_notes'   => 'IRATA rope-access required for 7th & 8th floor glass facade.',
            ]
        );

        // ── 8. Create Live Bookings across Tenants ─────────────────────────────

        // Booking 1: Apex Car Wash - Completed Deluxe Detail
        Booking::firstOrCreate(
            ['tenant_id' => $tenant2->id, 'customer_id' => $customer1->id, 'vehicle_id' => $vehicle1->id],
            [
                'sector_id'        => Sector::where('slug', 'standard-bay-wash')->first()?->id,
                'staff_id'         => $staff1->id,
                'user_id'          => $customerUser1->id,
                'status'           => Booking::STATUS_COMPLETED,
                'price'            => 850.00,
                'currency'         => 'ETB',
                'booking_date'     => now()->toDateString(),
                'booking_time'     => '09:00:00',
                'requirement_data' => ['service_tier' => 'premium', 'vehicle_class' => 'suv'],
            ]
        );

        // Booking 2: Skyline Cleaning - Completed High-Rise Glass Wash
        Booking::firstOrCreate(
            ['tenant_id' => $tenant3->id, 'customer_id' => $customer2->id, 'building_profile_id' => $building1->id],
            [
                'sector_id'        => Sector::where('slug', 'exterior-cleaning')->first()?->id,
                'staff_id'         => $staff3->id,
                'user_id'          => $customerUser2->id,
                'status'           => Booking::STATUS_COMPLETED,
                'price'            => 4200.00,
                'currency'         => 'ETB',
                'booking_date'     => now()->toDateString(),
                'booking_time'     => '11:30:00',
                'requirement_data' => ['access_tier' => 'high_rise', 'facade_area' => 450],
            ]
        );

        // Booking 3: Skyline Cleaning - Completed Post-Construction Clean
        Booking::firstOrCreate(
            ['tenant_id' => $tenant3->id, 'customer_id' => $customer2->id, 'price' => 3500.00],
            [
                'sector_id'        => Sector::where('slug', 'interior-cleaning')->first()?->id,
                'staff_id'         => $staff4->id,
                'user_id'          => $customerUser2->id,
                'status'           => Booking::STATUS_COMPLETED,
                'price'            => 3500.00,
                'currency'         => 'ETB',
                'booking_date'     => now()->subDay()->toDateString(),
                'booking_time'     => '10:00:00',
                'requirement_data' => ['total_area' => 250, 'floor_count' => 3],
            ]
        );

        // Booking 4: Apex Car Wash - Completed Engine Bay & Interior
        Booking::firstOrCreate(
            ['tenant_id' => $tenant2->id, 'customer_id' => $customer1->id, 'price' => 1200.00],
            [
                'sector_id'        => Sector::where('slug', 'standard-bay-wash')->first()?->id,
                'staff_id'         => $staff2->id,
                'user_id'          => $customerUser1->id,
                'status'           => Booking::STATUS_COMPLETED,
                'price'            => 1200.00,
                'currency'         => 'ETB',
                'booking_date'     => now()->subDays(2)->toDateString(),
                'booking_time'     => '14:00:00',
                'requirement_data' => ['service_tier' => 'deluxe_detail'],
            ]
        );

        // Booking 5: Apex Car Wash - In Progress Home Wash
        Booking::firstOrCreate(
            ['tenant_id' => $tenant2->id, 'customer_id' => $customer1->id, 'price' => 650.00],
            [
                'sector_id'        => Sector::where('slug', 'home-to-home')->first()?->id,
                'staff_id'         => $staff2->id,
                'user_id'          => $customerUser1->id,
                'status'           => Booking::STATUS_IN_PROGRESS,
                'price'            => 650.00,
                'currency'         => 'ETB',
                'booking_date'     => now()->toDateString(),
                'booking_time'     => '15:30:00',
                'requirement_data' => ['vehicle_class' => 'sedan'],
            ]
        );

        // Booking 6: Skyline Cleaning - Pending Office Clean
        Booking::firstOrCreate(
            ['tenant_id' => $tenant3->id, 'customer_id' => $customer2->id, 'price' => 1500.00],
            [
                'sector_id'        => Sector::where('slug', 'interior-cleaning')->first()?->id,
                'user_id'          => $customerUser2->id,
                'status'           => Booking::STATUS_PENDING,
                'price'            => 1500.00,
                'currency'         => 'ETB',
                'booking_date'     => now()->addDay()->toDateString(),
                'booking_time'     => '16:00:00',
                'requirement_data' => ['total_area' => 120, 'floor_count' => 2],
            ]
        );

        $this->command->info('✅ Multi-Tenant Ecosystem Seeded Successfully!');
        $this->command->info('   Tenants Seeded: 4 (Clean.et HQ, Apex Car Wash, Skyline High-Rise, OmniClean)');
        $this->command->info('   Tenant Admins: 4 accounts created');
        $this->command->info('   Staff Crew: 4 certified staff technicians');
        $this->command->info('   Services & Sectors: 4 Services, 4 Sectors');
        $this->command->info('   Bookings: 6 bookings seeded (Total Platform GMV: 11,900.00 ETB)');
    }
}
