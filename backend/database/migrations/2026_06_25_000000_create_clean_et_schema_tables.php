<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tenants Table
        if (!Schema::hasTable('tenants')) {
            Schema::create('tenants', function (Blueprint $table) {
                $table->id();
                $table->string('business_name');
                $table->string('plan', 100)->default('starter');
                $table->json('categories_enabled');
                $table->enum('status', ['active', 'suspended'])->default('active');
                $table->timestamps();
            });
        }

        // 2. Categories Table
        if (!Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->string('slug', 100)->unique();
                $table->timestamps();
            });
        }

        // 3. Sectors Table
        if (!Schema::hasTable('sectors')) {
            Schema::create('sectors', function (Blueprint $table) {
                $table->id();
                $table->foreignId('category_id')->constrained()->cascadeOnDelete();
                $table->string('name', 100);
                $table->string('slug', 100);
                $table->json('requirement_schema');
                $table->timestamps();
                $table->unique(['category_id', 'slug']);
            });
        }

        // 4. Update Users Table defensively
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'tenant_id')) {
                $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone', 20)->nullable()->unique();
            }
            if (!Schema::hasColumn('users', 'language')) {
                $table->enum('language', ['en', 'am', 'om', 'ti'])->default('en');
            }
            $table->string('email')->nullable()->change();
        });

        // Change users.role enum with a 3-step approach for MySQL strict mode:
        // Step 1: Expand ENUM to include BOTH old and new values
        // Step 2: Migrate data
        // Step 3: Narrow ENUM to new values only
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'super_admin', 'tenant_admin', 'staff', 'customer') NOT NULL DEFAULT 'customer'");
            DB::statement("UPDATE users SET role = 'tenant_admin' WHERE role = 'admin'");
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'tenant_admin', 'staff', 'customer') NOT NULL DEFAULT 'customer'");
        }

        // 5. Staff Profiles Table
        if (!Schema::hasTable('staff_profiles')) {
            Schema::create('staff_profiles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->string('role_title', 50);
                $table->json('sector_qualifications');
                $table->integer('jobs_completed')->default(0);
                $table->decimal('average_rating', 3, 2)->nullable();
                $table->timestamps();
            });
        }

        // 6. Staff Certifications Table
        if (!Schema::hasTable('staff_certifications')) {
            Schema::create('staff_certifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('staff_profile_id')->constrained()->cascadeOnDelete();
                $table->string('type', 50);
                $table->date('issued_at');
                $table->date('expires_at');
                $table->string('document_url', 500)->nullable();
                $table->timestamps();
            });
        }

        // 7. Customers Table
        if (!Schema::hasTable('customers')) {
            Schema::create('customers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
                $table->enum('subscription_tier', ['none', 'plus', 'premium', 'business'])->default('none');
                $table->timestamps();
            });
        }

        // 8. Fleet Accounts Table
        if (!Schema::hasTable('fleet_accounts')) {
            Schema::create('fleet_accounts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
                $table->string('company_name');
                $table->string('billing_contact_email')->nullable();
                $table->timestamps();
            });
        }

        // 9. Vehicles Table
        if (!Schema::hasTable('vehicles')) {
            Schema::create('vehicles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
                $table->enum('vehicle_class', ['sedan', 'suv', 'van', 'truck', 'bus', 'motorcycle', 'other']);
                $table->string('plate_number', 20)->nullable();
                $table->string('color', 50)->nullable();
                $table->string('make', 80)->nullable();
                $table->string('model', 80)->nullable();
                $table->integer('year')->nullable();
                $table->foreignId('fleet_account_id')->nullable()->constrained()->nullOnDelete();
                $table->timestamps();
            });
        }

        // 10. Building Profiles Table
        if (!Schema::hasTable('building_profiles')) {
            Schema::create('building_profiles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->decimal('area_sqm', 10, 2);
                $table->integer('floor_count');
                $table->json('room_inventory')->nullable();
                $table->text('access_notes')->nullable();
                $table->timestamps();
            });
        }

        // 11. Modify Bookings Table defensively
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'tenant_id')) {
                $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('bookings', 'sector_id')) {
                $table->foreignId('sector_id')->nullable()->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('bookings', 'customer_id')) {
                $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('bookings', 'staff_id')) {
                $table->foreignId('staff_id')->nullable()->constrained('staff_profiles')->nullOnDelete();
            }
            if (!Schema::hasColumn('bookings', 'vehicle_id')) {
                $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('bookings', 'building_profile_id')) {
                $table->foreignId('building_profile_id')->nullable()->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('bookings', 'requirement_data')) {
                $table->json('requirement_data')->nullable();
            }
            if (!Schema::hasColumn('bookings', 'price')) {
                $table->decimal('price', 10, 2)->default(0.00);
            }
            if (!Schema::hasColumn('bookings', 'currency')) {
                $table->string('currency', 3)->default('ETB');
            }
            if (!Schema::hasColumn('bookings', 'scheduled_at')) {
                $table->dateTime('scheduled_at')->nullable();
            }
            if (!Schema::hasColumn('bookings', 'recurring')) {
                $table->boolean('recurring')->default(false);
            }
            if (!Schema::hasColumn('bookings', 'recurrence_rule')) {
                $table->string('recurrence_rule', 50)->nullable();
            }
        });

        // Make service_id nullable on bookings
        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('service_id')->nullable()->change();
        });

        // Update bookings.status enum
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE bookings MODIFY COLUMN status ENUM('pending', 'confirmed', 'driver_assigned', 'picked_up', 'in_progress', 'completed', 'invoiced', 'cancelled') NOT NULL DEFAULT 'pending'");
        }

        // 12. Booking Completion Proofs Table
        if (!Schema::hasTable('booking_completion_proofs')) {
            Schema::create('booking_completion_proofs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
                $table->string('photo_url', 500);
                $table->string('checklist_item')->nullable();
                $table->timestamp('created_at')->nullable();
            });
        }

        // 13. Subscriptions Table
        if (!Schema::hasTable('subscriptions')) {
            Schema::create('subscriptions', function (Blueprint $table) {
                $table->id();
                $table->enum('owner_type', ['tenant', 'customer']);
                $table->unsignedBigInteger('owner_id');
                $table->string('plan', 50);
                $table->enum('billing_cycle', ['monthly', 'annual']);
                $table->enum('status', ['active', 'past_due', 'cancelled'])->default('active');
                $table->date('renews_at');
                $table->timestamps();
            });
        }

        // 14. Invoices Table
        if (!Schema::hasTable('invoices')) {
            Schema::create('invoices', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
                $table->decimal('amount', 10, 2);
                $table->string('currency', 3)->default('ETB');
                $table->string('period', 7);
                $table->enum('status', ['draft', 'sent', 'paid', 'overdue'])->default('draft');
                $table->date('due_at');
                $table->timestamps();
            });
        }

        // 15. Payments Table
        if (!Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
                $table->enum('provider', ['telebirr', 'cbe', 'cbe_birr', 'amole', 'stripe', 'cash', 'chapa']);
                $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');
                $table->decimal('amount', 10, 2);
                $table->string('provider_reference', 100)->nullable();
                $table->timestamps();
            });
        }

        // ================= SEED INITIAL DATA =================
        
        // Seed default tenant
        $tenantId = DB::table('tenants')->where('business_name', 'Marvels Clean.et')->value('id');
        if (!$tenantId) {
            $tenantId = DB::table('tenants')->insertGetId([
                'business_name' => 'Marvels Clean.et',
                'plan' => 'enterprise',
                'categories_enabled' => json_encode(['car-washing', 'building-cleaning']),
                'status' => 'active',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        // Seed default categories
        $carWashCategoryId = DB::table('categories')->where('slug', 'car-washing')->value('id');
        if (!$carWashCategoryId) {
            $carWashCategoryId = DB::table('categories')->insertGetId([
                'name' => 'Car Washing',
                'slug' => 'car-washing',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        $buildingCleanCategoryId = DB::table('categories')->where('slug', 'building-cleaning')->value('id');
        if (!$buildingCleanCategoryId) {
            $buildingCleanCategoryId = DB::table('categories')->insertGetId([
                'name' => 'Building Cleaning',
                'slug' => 'building-cleaning',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        // Seed Sectors
        // 1. Standard Bay Wash
        $standardBayWashId = DB::table('sectors')->where('slug', 'standard-bay-wash')->value('id');
        if (!$standardBayWashId) {
            $standardBayWashId = DB::table('sectors')->insertGetId([
                'category_id' => $carWashCategoryId,
                'name' => 'Standard Bay Wash',
                'slug' => 'standard-bay-wash',
                'requirement_schema' => json_encode([
                    'fields' => [
                        [
                            'key' => 'vehicle_class',
                            'label' => 'Vehicle Class',
                            'type' => 'select',
                            'required' => true,
                            'options' => ['small_car', 'suv_pickup', 'minibus_van', 'light_medium_truck', 'big_truck_cargo', 'large_bus']
                        ],
                        [
                            'key' => 'service_tier',
                            'label' => 'Service Tier',
                            'type' => 'select',
                            'required' => true,
                            'options' => ['basic', 'premium']
                        ]
                    ]
                ]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        // 2. Home-to-Home
        if (!DB::table('sectors')->where('slug', 'home-to-home')->exists()) {
            DB::table('sectors')->insert([
                'category_id' => $carWashCategoryId,
                'name' => 'Home-to-Home (Mobile)',
                'slug' => 'home-to-home',
                'requirement_schema' => json_encode([
                    'fields' => [
                        [
                            'key' => 'address',
                            'label' => 'Service Address',
                            'type' => 'address',
                            'required' => true
                        ],
                        [
                            'key' => 'vehicle_class',
                            'label' => 'Vehicle Class',
                            'type' => 'select',
                            'required' => true,
                            'options' => ['small_car', 'suv_pickup', 'minibus_van', 'light_medium_truck', 'big_truck_cargo', 'large_bus']
                        ],
                        [
                            'key' => 'water_power_accessible',
                            'label' => 'Water & Power Accessible?',
                            'type' => 'boolean',
                            'required' => true
                        ]
                    ]
                ]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        // 3. Pickup & Drop-off
        if (!DB::table('sectors')->where('slug', 'pickup-drop-off')->exists()) {
            DB::table('sectors')->insert([
                'category_id' => $carWashCategoryId,
                'name' => 'Pickup & Drop-off',
                'slug' => 'pickup-drop-off',
                'requirement_schema' => json_encode([
                    'fields' => [
                        [
                            'key' => 'pickup_address',
                            'label' => 'Pickup Address',
                            'type' => 'address',
                            'required' => true
                        ],
                        [
                            'key' => 'return_address',
                            'label' => 'Return Address (if different)',
                            'type' => 'address',
                            'required' => false
                        ],
                        [
                            'key' => 'preferred_return_time',
                            'label' => 'Preferred Return Time',
                            'type' => 'text',
                            'required' => true
                        ],
                        [
                            'key' => 'vehicle_class',
                            'label' => 'Vehicle Class',
                            'type' => 'select',
                            'required' => true,
                            'options' => ['small_car', 'suv_pickup', 'minibus_van', 'light_medium_truck', 'big_truck_cargo', 'large_bus']
                        ]
                    ]
                ]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        // 4. Corporate Fleet Washing
        if (!DB::table('sectors')->where('slug', 'corporate-fleet')->exists()) {
            DB::table('sectors')->insert([
                'category_id' => $carWashCategoryId,
                'name' => 'Corporate Fleet Washing',
                'slug' => 'corporate-fleet',
                'requirement_schema' => json_encode([
                    'fields' => [
                        [
                            'key' => 'company_account_id',
                            'label' => 'Company Account ID',
                            'type' => 'text',
                            'required' => true
                        ],
                        [
                            'key' => 'fleet_vehicles_count',
                            'label' => 'Number of Vehicles',
                            'type' => 'number',
                            'required' => true
                        ],
                        [
                            'key' => 'recurring_schedule',
                            'label' => 'Schedule Frequency',
                            'type' => 'select',
                            'required' => true,
                            'options' => ['weekly', 'biweekly', 'monthly']
                        ],
                        [
                            'key' => 'service_location',
                            'label' => 'Service Location',
                            'type' => 'text',
                            'required' => true
                        ]
                    ]
                ]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        // 5. Interior Building Cleaning
        if (!DB::table('sectors')->where('slug', 'interior-cleaning')->exists()) {
            DB::table('sectors')->insert([
                'category_id' => $buildingCleanCategoryId,
                'name' => 'Interior Cleaning',
                'slug' => 'interior-cleaning',
                'requirement_schema' => json_encode([
                    'fields' => [
                        [
                            'key' => 'total_area',
                            'label' => 'Total Floor Area (sqm)',
                            'type' => 'number',
                            'required' => true
                        ],
                        [
                            'key' => 'floor_count',
                            'label' => 'Number of Floors',
                            'type' => 'number',
                            'required' => true
                        ],
                        [
                            'key' => 'has_elevator',
                            'label' => 'Has Elevator?',
                            'type' => 'boolean',
                            'required' => true
                        ],
                        [
                            'key' => 'room_inventory',
                            'label' => 'Room Inventory details',
                            'type' => 'text',
                            'required' => false
                        ],
                        [
                            'key' => 'flooring_types',
                            'label' => 'Flooring Types (e.g. carpet, wood)',
                            'type' => 'text',
                            'required' => false
                        ],
                        [
                            'key' => 'frequency',
                            'label' => 'Frequency',
                            'type' => 'select',
                            'required' => true,
                            'options' => ['One-time', 'Daily', 'Weekly', 'Monthly']
                        ]
                    ]
                ]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        // 6. Exterior Building Cleaning
        if (!DB::table('sectors')->where('slug', 'exterior-cleaning')->exists()) {
            DB::table('sectors')->insert([
                'category_id' => $buildingCleanCategoryId,
                'name' => 'Exterior Facade Cleaning',
                'slug' => 'exterior-cleaning',
                'requirement_schema' => json_encode([
                    'fields' => [
                        [
                            'key' => 'floor_count',
                            'label' => 'Number of Floors',
                            'type' => 'number',
                            'required' => true
                        ],
                        [
                            'key' => 'facade_material',
                            'label' => 'Facade Material (e.g. Glass)',
                            'type' => 'text',
                            'required' => true
                        ],
                        [
                            'key' => 'facade_area',
                            'label' => 'Facade Area (sqm)',
                            'type' => 'number',
                            'required' => true
                        ],
                        [
                            'key' => 'window_count',
                            'label' => 'Window Count/Type',
                            'type' => 'text',
                            'required' => false
                        ]
                    ]
                ]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        // Add sector_id to services if it doesn't exist, then link to Standard Bay Wash
        if (!Schema::hasColumn('services', 'sector_id')) {
            Schema::table('services', function (Blueprint $table) {
                $table->foreignId('sector_id')->nullable()->constrained('sectors')->nullOnDelete();
            });
        }
        DB::table('services')->update([
            'sector_id' => $standardBayWashId
        ]);

        // Migrate existing users to customers/tenant admins
        $users = DB::table('users')->get();
        foreach ($users as $user) {
            $updateData = [];
            if (empty($user->tenant_id)) {
                $updateData['tenant_id'] = ($user->role === 'admin') ? $tenantId : null;
            }
            if (empty($user->phone)) {
                $updateData['phone'] = '+251911' . str_pad($user->id, 6, '0', STR_PAD_LEFT);
            }
            
            // Map old simple role to new role enum
            if ($user->role === 'admin') {
                $updateData['role'] = 'tenant_admin';
            } elseif ($user->role === 'customer') {
                $updateData['role'] = 'customer';
            }

            if (!empty($updateData)) {
                DB::table('users')->where('id', $user->id)->update($updateData);
            }

            if ($user->role !== 'admin') {
                DB::table('customers')->insertOrIgnore([
                    'user_id' => $user->id,
                    'subscription_tier' => 'none',
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);
            }
        }

        // Migrate bookings
        $bookings = DB::table('bookings')->get();
        foreach ($bookings as $booking) {
            $customer = DB::table('customers')->where('user_id', $booking->user_id)->first();
            $service = DB::table('services')->where('id', $booking->service_id)->first();
            
            if ($customer && $service && empty($booking->sector_id)) {
                // Register a default vehicle for standard bay wash migration
                $vehicleId = DB::table('vehicles')->where('customer_id', $customer->id)->value('id');
                if (!$vehicleId) {
                    $vehicleId = DB::table('vehicles')->insertGetId([
                        'customer_id' => $customer->id,
                        'vehicle_class' => 'small_car',
                        'created_at' => Carbon::now(),
                        'updated_at' => Carbon::now(),
                    ]);
                }

                $scheduledAt = Carbon::parse($booking->booking_date . ' ' . $booking->booking_time);

                DB::table('bookings')->where('id', $booking->id)->update([
                    'tenant_id' => $tenantId,
                    'sector_id' => $standardBayWashId,
                    'customer_id' => $customer->id,
                    'vehicle_id' => $vehicleId,
                    'price' => $service->price,
                    'scheduled_at' => $scheduledAt,
                    'requirement_data' => json_encode([
                        'vehicle_class' => 'small_car',
                        'service_tier' => (stripos($service->name, 'premium') !== false) ? 'premium' : 'basic'
                    ])
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('booking_completion_proofs');
        Schema::dropIfExists('building_profiles');
        Schema::dropIfExists('vehicles');
        Schema::dropIfExists('fleet_accounts');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('staff_certifications');
        Schema::dropIfExists('staff_profiles');

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropForeign(['sector_id']);
            $table->dropForeign(['customer_id']);
            $table->dropForeign(['staff_id']);
            $table->dropForeign(['vehicle_id']);
            $table->dropForeign(['building_profile_id']);

            $table->dropColumn([
                'tenant_id', 'sector_id', 'customer_id', 'staff_id', 'vehicle_id', 
                'building_profile_id', 'requirement_data', 'price', 'currency', 
                'scheduled_at', 'recurring', 'recurrence_rule'
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropColumn(['tenant_id', 'phone', 'language']);
        });

        Schema::dropIfExists('sectors');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('tenants');

        Schema::enableForeignKeyConstraints();
    }
};
