<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Sector;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class TenantSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Create default Tenant ──────────────────────────────────────────
        $tenant = Tenant::firstOrCreate(
            ['business_name' => 'Clean.et Platform'],
            [
                'plan'               => 'enterprise',
                'categories_enabled' => ['car-washing', 'building-cleaning'],
                'status'             => 'active',
            ]
        );

        // ── 2. Link admin user to tenant ──────────────────────────────────────
        User::where('email', env('ADMIN_EMAIL', 'admin@example.com'))
            ->whereNull('tenant_id')
            ->update([
                'tenant_id' => $tenant->id,
                'role'      => 'tenant_admin',
            ]);

        // ── 3. Categories ─────────────────────────────────────────────────────
        $carWash = Category::firstOrCreate(
            ['slug' => 'car-washing'],
            ['name' => 'Car Washing']
        );

        $buildingClean = Category::firstOrCreate(
            ['slug' => 'building-cleaning'],
            ['name' => 'Building Cleaning']
        );

        // ── 4. Car Washing Sectors ────────────────────────────────────────────

        Sector::firstOrCreate(
            ['category_id' => $carWash->id, 'slug' => 'standard-bay-wash'],
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
                                ['value' => 'light_medium_truck', 'label' => 'Light / Medium Truck'],
                                ['value' => 'big_truck_cargo',    'label' => 'Big Truck / Cargo'],
                                ['value' => 'large_bus',          'label' => 'Large Bus'],
                            ],
                        ],
                        [
                            'key'      => 'service_tier',
                            'label'    => 'Service Tier',
                            'type'     => 'select',
                            'required' => true,
                            'options'  => [
                                ['value' => 'basic',   'label' => 'Basic'],
                                ['value' => 'premium', 'label' => 'Premium'],
                            ],
                        ],
                    ],
                ],
            ]
        );

        Sector::firstOrCreate(
            ['category_id' => $carWash->id, 'slug' => 'home-to-home'],
            [
                'name'               => 'Home-to-Home',
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
                                ['value' => 'light_medium_truck', 'label' => 'Light / Medium Truck'],
                                ['value' => 'big_truck_cargo',    'label' => 'Big Truck / Cargo'],
                                ['value' => 'large_bus',          'label' => 'Large Bus'],
                            ],
                        ],
                        [
                            'key'      => 'service_tier',
                            'label'    => 'Service Tier',
                            'type'     => 'select',
                            'required' => true,
                            'options'  => [
                                ['value' => 'basic',   'label' => 'Basic'],
                                ['value' => 'premium', 'label' => 'Premium'],
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

        Sector::firstOrCreate(
            ['category_id' => $carWash->id, 'slug' => 'pickup-drop-off'],
            [
                'name'               => 'Pickup & Drop-off',
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
                                ['value' => 'light_medium_truck', 'label' => 'Light / Medium Truck'],
                                ['value' => 'big_truck_cargo',    'label' => 'Big Truck / Cargo'],
                                ['value' => 'large_bus',          'label' => 'Large Bus'],
                            ],
                        ],
                        [
                            'key'      => 'service_tier',
                            'label'    => 'Service Tier',
                            'type'     => 'select',
                            'required' => true,
                            'options'  => [
                                ['value' => 'basic',   'label' => 'Basic'],
                                ['value' => 'premium', 'label' => 'Premium'],
                            ],
                        ],
                        [
                            'key'      => 'pickup_address',
                            'label'    => 'Pickup Address',
                            'type'     => 'text',
                            'required' => true,
                        ],
                    ],
                ],
            ]
        );

        Sector::firstOrCreate(
            ['category_id' => $carWash->id, 'slug' => 'corporate-fleet'],
            [
                'name'               => 'Corporate Fleet',
                'requirement_schema' => [
                    'fields' => [
                        [
                            'key'      => 'vehicle_count',
                            'label'    => 'Number of Vehicles',
                            'type'     => 'number',
                            'required' => true,
                        ],
                        [
                            'key'      => 'vehicle_class',
                            'label'    => 'Primary Vehicle Class',
                            'type'     => 'select',
                            'required' => true,
                            'options'  => [
                                ['value' => 'small_car',          'label' => 'Small Car'],
                                ['value' => 'suv_pickup',         'label' => 'SUV / Pickup'],
                                ['value' => 'minibus_van',        'label' => 'Minibus / Van'],
                                ['value' => 'light_medium_truck', 'label' => 'Light / Medium Truck'],
                                ['value' => 'big_truck_cargo',    'label' => 'Big Truck / Cargo'],
                                ['value' => 'large_bus',          'label' => 'Large Bus'],
                            ],
                        ],
                        [
                            'key'      => 'frequency',
                            'label'    => 'Wash Frequency',
                            'type'     => 'select',
                            'required' => true,
                            'options'  => [
                                ['value' => 'daily',   'label' => 'Daily'],
                                ['value' => 'weekly',  'label' => 'Weekly'],
                                ['value' => 'monthly', 'label' => 'Monthly'],
                            ],
                        ],
                    ],
                ],
            ]
        );

        // ── 5. Building Cleaning Sectors ──────────────────────────────────────

        Sector::firstOrCreate(
            ['category_id' => $buildingClean->id, 'slug' => 'interior-cleaning'],
            [
                'name'               => 'Interior Cleaning',
                'requirement_schema' => [
                    'fields' => [
                        [
                            'key'      => 'total_area',
                            'label'    => 'Total Area (sqm)',
                            'type'     => 'number',
                            'required' => true,
                        ],
                        [
                            'key'      => 'frequency',
                            'label'    => 'Frequency',
                            'type'     => 'select',
                            'required' => true,
                            'options'  => [
                                ['value' => 'One-time', 'label' => 'One-time'],
                                ['value' => 'Daily',    'label' => 'Daily'],
                                ['value' => 'Weekly',   'label' => 'Weekly'],
                                ['value' => 'Monthly',  'label' => 'Monthly'],
                            ],
                        ],
                        [
                            'key'      => 'floor_count',
                            'label'    => 'Number of Floors',
                            'type'     => 'number',
                            'required' => true,
                        ],
                    ],
                ],
            ]
        );

        Sector::firstOrCreate(
            ['category_id' => $buildingClean->id, 'slug' => 'exterior-cleaning'],
            [
                'name'               => 'Exterior Cleaning',
                'requirement_schema' => [
                    'fields' => [
                        [
                            'key'      => 'floor_count',
                            'label'    => 'Number of Floors',
                            'type'     => 'number',
                            'required' => true,
                        ],
                        [
                            'key'      => 'facade_area',
                            'label'    => 'Facade Area (sqm)',
                            'type'     => 'number',
                            'required' => true,
                        ],
                        [
                            'key'      => 'building_type',
                            'label'    => 'Building Type',
                            'type'     => 'select',
                            'required' => false,
                            'options'  => [
                                ['value' => 'residential', 'label' => 'Residential'],
                                ['value' => 'commercial',  'label' => 'Commercial'],
                                ['value' => 'industrial',  'label' => 'Industrial'],
                            ],
                        ],
                    ],
                ],
            ]
        );

        $this->command->info('✅ Tenant, Categories, and Sectors seeded successfully!');
        $this->command->info("   Tenant ID: {$tenant->id} — {$tenant->business_name}");
        $this->command->info('   Categories: car-washing, building-cleaning');
        $this->command->info('   Sectors: standard-bay-wash, home-to-home, pickup-drop-off, corporate-fleet, interior-cleaning, exterior-cleaning');
    }
}
