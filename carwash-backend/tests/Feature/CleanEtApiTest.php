<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Category;
use App\Models\Sector;
use App\Models\Tenant;
use App\Models\Customer;
use App\Models\Vehicle;
use App\Models\BuildingProfile;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Support\Carbon;

class CleanEtApiTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant;
    protected $carWashCategory;
    protected $buildingCategory;
    protected $bayWashSector;
    protected $interiorSector;
    protected $exteriorSector;

    protected function setUp(): void
    {
        parent::setUp();

        // Database will be migrated by RefreshDatabase, but let's make sure
        // we seed the default structure since the migrations do it in up()
        $this->tenant = Tenant::first() ?? Tenant::create([
            'business_name' => 'Marvels Clean.et',
            'plan' => 'enterprise',
            'categories_enabled' => ['car-washing', 'building-cleaning'],
            'status' => 'active',
        ]);

        $this->carWashCategory = Category::where('slug', 'car-washing')->first() ?? Category::create([
            'name' => 'Car Washing',
            'slug' => 'car-washing',
        ]);

        $this->buildingCategory = Category::where('slug', 'building-cleaning')->first() ?? Category::create([
            'name' => 'Building Cleaning',
            'slug' => 'building-cleaning',
        ]);

        $this->bayWashSector = Sector::where('slug', 'standard-bay-wash')->first() ?? Sector::create([
            'category_id' => $this->carWashCategory->id,
            'name' => 'Standard Bay Wash',
            'slug' => 'standard-bay-wash',
            'requirement_schema' => [
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
            ]
        ]);

        $this->interiorSector = Sector::where('slug', 'interior-cleaning')->first() ?? Sector::create([
            'category_id' => $this->buildingCategory->id,
            'name' => 'Interior Cleaning',
            'slug' => 'interior-cleaning',
            'requirement_schema' => [
                'fields' => [
                    [
                        'key' => 'total_area',
                        'label' => 'Total Floor Area (sqm)',
                        'type' => 'number',
                        'required' => true
                    ],
                    [
                        'key' => 'frequency',
                        'label' => 'Frequency',
                        'type' => 'select',
                        'required' => true,
                        'options' => ['One-time', 'Daily', 'Weekly', 'Monthly']
                    ]
                ]
            ]
        ]);

        $this->exteriorSector = Sector::where('slug', 'exterior-cleaning')->first() ?? Sector::create([
            'category_id' => $this->buildingCategory->id,
            'name' => 'Exterior Facade Cleaning',
            'slug' => 'exterior-cleaning',
            'requirement_schema' => [
                'fields' => [
                    [
                        'key' => 'floor_count',
                        'label' => 'Number of Floors',
                        'type' => 'number',
                        'required' => true
                    ],
                    [
                        'key' => 'facade_area',
                        'label' => 'Facade Area (sqm)',
                        'type' => 'number',
                        'required' => true
                    ]
                ]
            ]
        ]);
    }

    /**
     * Test categories and sectors listing.
     */
    public function test_can_list_categories_and_sectors(): void
    {
        $response = $this->getJson('/api/categories');

        $response->assertStatus(200)
            ->assertJsonFragment(['slug' => 'car-washing'])
            ->assertJsonFragment(['slug' => 'building-cleaning'])
            ->assertJsonFragment(['slug' => 'standard-bay-wash'])
            ->assertJsonFragment(['slug' => 'interior-cleaning']);
    }

    /**
     * Test pricing calculations for Car Wash.
     */
    public function test_pricing_calculation_for_car_wash(): void
    {
        // 1. Small car basic
        $response = $this->postJson("/api/sectors/{$this->bayWashSector->id}/price", [
            'vehicle_class' => 'small_car',
            'service_tier' => 'basic',
        ]);
        $response->assertStatus(200)->assertJson(['price' => 400]);

        // 2. Small car premium
        $response = $this->postJson("/api/sectors/{$this->bayWashSector->id}/price", [
            'vehicle_class' => 'small_car',
            'service_tier' => 'premium',
        ]);
        $response->assertStatus(200)->assertJson(['price' => 550]);

        // 3. SUV basic
        $response = $this->postJson("/api/sectors/{$this->bayWashSector->id}/price", [
            'vehicle_class' => 'suv_pickup',
            'service_tier' => 'basic',
        ]);
        $response->assertStatus(200)->assertJson(['price' => 600]);
    }

    /**
     * Test pricing calculations for Interior building cleaning.
     */
    public function test_pricing_calculation_for_interior_cleaning(): void
    {
        // 100 sqm One-time (100 * 15)
        $response = $this->postJson("/api/sectors/{$this->interiorSector->id}/price", [
            'total_area' => 100,
            'frequency' => 'One-time',
        ]);
        $response->assertStatus(200)->assertJson(['price' => 1500]);

        // 50 sqm Daily (50 * 8)
        $response = $this->postJson("/api/sectors/{$this->interiorSector->id}/price", [
            'total_area' => 50,
            'frequency' => 'Daily',
        ]);
        $response->assertStatus(200)->assertJson(['price' => 400]);
    }

    /**
     * Test pricing calculations for Exterior building cleaning.
     */
    public function test_pricing_calculation_for_exterior_cleaning(): void
    {
        // 2 floors, 100 sqm (Low-rise flat base 2000 + 100 * 5)
        $response = $this->postJson("/api/sectors/{$this->exteriorSector->id}/price", [
            'floor_count' => 2,
            'facade_area' => 100,
        ]);
        $response->assertStatus(200)->assertJson(['price' => 2500]);

        // 5 floors, 200 sqm (Mid-rise flat base 5000 + 200 * 5)
        $response = $this->postJson("/api/sectors/{$this->exteriorSector->id}/price", [
            'floor_count' => 5,
            'facade_area' => 200,
        ]);
        $response->assertStatus(200)->assertJson(['price' => 6000]);
    }

    /**
     * Test user registration and phone authentication.
     */
    public function test_phone_authentication_flow(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Kaleb',
            'phone' => '+251911223344',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'phone', 'role']]]);

        $this->assertDatabaseHas('users', ['phone' => '+251911223344', 'role' => 'customer']);
        $this->assertDatabaseHas('customers', ['subscription_tier' => 'none']);
    }

    /**
     * Test vehicle and building profile CRUD APIs.
     */
    public function test_vehicle_and_building_profile_crud(): void
    {
        $user = User::factory()->create([
            'phone' => '+251922334455',
            'role' => 'customer',
            'tenant_id' => $this->tenant->id
        ]);
        Customer::create(['user_id' => $user->id]);

        // Create vehicle
        $response = $this->actingAs($user)
            ->postJson('/api/vehicles', [
                'vehicle_class' => 'suv',
                'make' => 'Toyota',
                'model' => 'Hilux',
                'color' => 'Silver',
                'plate_number' => 'ET-3-A1234',
                'year' => 2022
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['model' => 'Hilux']);

        // Create building profile
        $response = $this->actingAs($user)
            ->postJson('/api/building-profiles', [
                'name' => 'Office HQ',
                'area_sqm' => 450,
                'floor_count' => 3,
                'access_notes' => 'Ring bell at front gate',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Office HQ']);
    }

    /**
     * Test full booking creation with automatic pricing.
     */
    public function test_booking_creation_with_pricing_service(): void
    {
        $user = User::factory()->create([
            'phone' => '+251933445566',
            'role' => 'customer',
            'tenant_id' => $this->tenant->id
        ]);
        $customer = Customer::create(['user_id' => $user->id]);

        $vehicle = Vehicle::create([
            'customer_id' => $customer->id,
            'vehicle_class' => 'suv'
        ]);

        $response = $this->actingAs($user)
            ->postJson('/api/bookings', [
                'sector_id' => $this->bayWashSector->id,
                'vehicle_id' => $vehicle->id,
                'booking_date' => '2026-06-30',
                'booking_time' => '10:00',
                'requirement_data' => [
                    'vehicle_class' => 'small_car',
                    'service_tier' => 'premium',
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['status' => 'pending'])
            ->assertJsonFragment(['price' => '550.00']); // small_car + premium = 550
    }

    /**
     * Test user profile updates for phone and language.
     */
    public function test_user_profile_update_fields(): void
    {
        $user = User::factory()->create([
            'name' => 'Original Name',
            'phone' => '+251955555555',
            'email' => 'original@example.com',
            'language' => 'en',
            'role' => 'customer',
        ]);

        $response = $this->actingAs($user)
            ->putJson('/api/me', [
                'name' => 'Updated Name',
                'phone' => '+251966666666',
                'email' => 'updated@example.com',
                'language' => 'am',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'name' => 'Updated Name',
                'phone' => '+251966666666',
                'email' => 'updated@example.com',
                'language' => 'am',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'phone' => '+251966666666',
            'email' => 'updated@example.com',
            'language' => 'am',
        ]);
    }
}
