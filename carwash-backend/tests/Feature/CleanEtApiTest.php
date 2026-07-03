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
use App\Models\Subscription;
use App\Models\FleetAccount;
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
                'booking_date' => now()->addDays(2)->toDateString(),
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

    /**
     * Test admin can generate an invoice for a completed booking.
     */
    public function test_admin_can_generate_invoice_for_completed_booking(): void
    {
        $admin = User::factory()->create([
            'phone' => '+251911111111',
            'role' => 'tenant_admin',
            'tenant_id' => $this->tenant->id,
        ]);

        $user = User::factory()->create([
            'phone' => '+251933445566',
            'role' => 'customer',
            'tenant_id' => $this->tenant->id
        ]);
        $customer = Customer::create(['user_id' => $user->id]);

        $booking = Booking::create([
            'tenant_id' => $this->tenant->id,
            'sector_id' => $this->bayWashSector->id,
            'user_id' => $user->id,
            'customer_id' => $customer->id,
            'price' => 500.00,
            'currency' => 'ETB',
            'scheduled_at' => now(),
            'booking_date' => now()->toDateString(),
            'booking_time' => '12:00',
            'status' => 'completed',
        ]);

        $response = $this->actingAs($admin)
            ->postJson("/api/admin/invoices/generate/{$booking->id}");

        $response->assertStatus(201)
            ->assertJsonFragment(['amount' => 500]);

        $this->assertDatabaseHas('invoices', [
            'booking_id' => $booking->id,
            'amount' => 500.00,
            'status' => 'sent',
        ]);

        $this->assertEquals('invoiced', $booking->fresh()->status);
    }

    /**
     * Test status update to invoiced automatically creates an invoice.
     */
    public function test_status_update_creates_invoice_on_invoiced(): void
    {
        $admin = User::factory()->create([
            'phone' => '+251911111111',
            'role' => 'tenant_admin',
            'tenant_id' => $this->tenant->id,
        ]);

        $user = User::factory()->create([
            'phone' => '+251933445566',
            'role' => 'customer',
            'tenant_id' => $this->tenant->id
        ]);
        $customer = Customer::create(['user_id' => $user->id]);

        $booking = Booking::create([
            'tenant_id' => $this->tenant->id,
            'sector_id' => $this->bayWashSector->id,
            'user_id' => $user->id,
            'customer_id' => $customer->id,
            'price' => 750.00,
            'currency' => 'ETB',
            'scheduled_at' => now(),
            'booking_date' => now()->toDateString(),
            'booking_time' => '12:00',
            'status' => 'completed',
        ]);

        $response = $this->actingAs($admin)
            ->patchJson("/api/bookings/{$booking->id}/status", [
                'status' => 'invoiced',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['status' => 'invoiced']);

        $this->assertDatabaseHas('invoices', [
            'booking_id' => $booking->id,
            'amount' => 750.00,
            'status' => 'sent',
        ]);
    }

    /**
     * Test subscription plans listing and subscribing.
     */
    public function test_can_list_plans_and_subscribe(): void
    {
        $user = User::factory()->create([
            'phone' => '+251933445566',
            'role' => 'customer',
            'tenant_id' => $this->tenant->id
        ]);
        $customer = Customer::create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->getJson('/api/subscriptions/plans');

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => 'plus'])
            ->assertJsonFragment(['id' => 'premium']);

        $response = $this->actingAs($user)
            ->postJson('/api/subscriptions/subscribe', [
                'plan' => 'plus',
                'billing_cycle' => 'monthly',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['amount' => '1500.00']);

        $this->assertDatabaseHas('subscriptions', [
            'owner_id' => $customer->id,
            'plan' => 'plus',
            'status' => 'cancelled',
        ]);

        $this->assertDatabaseHas('invoices', [
            'customer_id' => $customer->id,
            'booking_id' => null,
            'amount' => 1500.00,
        ]);
    }

    /**
     * Test payment verification activates subscription and updates tier.
     */
    public function test_payment_verification_activates_subscription(): void
    {
        $admin = User::factory()->create([
            'phone' => '+251911111111',
            'role' => 'tenant_admin',
            'tenant_id' => $this->tenant->id,
        ]);

        $user = User::factory()->create([
            'phone' => '+251933445566',
            'role' => 'customer',
            'tenant_id' => $this->tenant->id
        ]);
        $customer = Customer::create(['user_id' => $user->id]);

        // Initiate subscription
        $this->actingAs($user)
            ->postJson('/api/subscriptions/subscribe', [
                'plan' => 'plus',
                'billing_cycle' => 'monthly',
            ]);

        $invoice = Invoice::where('customer_id', $customer->id)->whereNull('booking_id')->first();
        $payment = Payment::create([
            'invoice_id' => $invoice->id,
            'provider' => 'telebirr',
            'status' => 'pending',
            'amount' => $invoice->amount,
        ]);

        // Verify payment
        $response = $this->actingAs($admin)
            ->postJson("/api/payments/{$payment->id}/verify");

        $response->assertStatus(200);

        $this->assertEquals('active', Subscription::where('owner_id', $customer->id)->first()->status);
        $this->assertEquals('plus', $customer->fresh()->subscription_tier);
    }

    /**
     * Test Fleet Accounts CRUD lifecycle and vehicle linking.
     */
    public function test_fleet_account_lifecycle(): void
    {
        $user = User::factory()->create([
            'phone' => '+251955667788',
            'role' => 'customer',
            'tenant_id' => $this->tenant->id
        ]);
        $customer = Customer::create(['user_id' => $user->id]);

        // 1. Create Fleet Account
        $response = $this->actingAs($user)
            ->postJson('/api/fleet-accounts', [
                'company_name' => 'Acme Cleaning Corp',
                'billing_contact_email' => 'billing@acme.com'
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.company_name', 'Acme Cleaning Corp');

        $fleetId = $response->json('data.id');

        // 2. List Fleet Accounts
        $response = $this->actingAs($user)
            ->getJson('/api/fleet-accounts');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.company_name', 'Acme Cleaning Corp');

        // 3. Add Vehicle to Fleet
        $vehicle = Vehicle::create([
            'customer_id' => $customer->id,
            'vehicle_class' => 'sedan',
            'plate_number' => 'AA-3-B78945',
            'color' => 'Silver',
            'make' => 'Toyota',
            'model' => 'Corolla',
            'year' => 2022
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/fleet-accounts/{$fleetId}/vehicles", [
                'vehicle_ids' => [$vehicle->id]
            ]);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.vehicles')
            ->assertJsonPath('data.vehicles.0.id', $vehicle->id);

        $this->assertEquals($fleetId, $vehicle->fresh()->fleet_account_id);

        // 4. Remove Vehicle from Fleet
        $response = $this->actingAs($user)
            ->deleteJson("/api/fleet-accounts/{$fleetId}/vehicles/{$vehicle->id}");

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data.vehicles');

        $this->assertNull($vehicle->fresh()->fleet_account_id);

        // 5. Update Fleet Account
        $response = $this->actingAs($user)
            ->putJson("/api/fleet-accounts/{$fleetId}", [
                'company_name' => 'Acme Cleaning Corp Updated',
                'billing_contact_email' => 'billing@acme.com'
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.company_name', 'Acme Cleaning Corp Updated');

        // 6. Delete Fleet Account
        $response = $this->actingAs($user)
            ->deleteJson("/api/fleet-accounts/{$fleetId}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('fleet_accounts', ['id' => $fleetId]);
    }

    /**
     * Test Super Admin Tenant management API actions and access rules.
     */
    public function test_super_admin_tenant_management_lifecycle(): void
    {
        $superAdmin = User::factory()->create([
            'phone' => '+251999888777',
            'role' => 'super_admin',
            'tenant_id' => $this->tenant->id,
        ]);

        $customer = User::factory()->create([
            'phone' => '+251944556677',
            'role' => 'customer',
            'tenant_id' => $this->tenant->id,
        ]);

        // 1. Create a new Tenant
        $response = $this->actingAs($superAdmin)
            ->postJson('/api/tenants', [
                'business_name' => 'Elite Wash Addis',
                'plan' => 'growth',
                'categories_enabled' => ['car-washing']
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.business_name', 'Elite Wash Addis')
            ->assertJsonPath('data.plan', 'growth');

        $tenantId = $response->json('data.id');

        // 2. List all Tenants
        $response = $this->actingAs($superAdmin)
            ->getJson('/api/tenants');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data'); // default seeded tenant + new one

        // 3. View detail of Tenant
        $response = $this->actingAs($superAdmin)
            ->getJson("/api/tenants/{$tenantId}");

        $response->assertStatus(200)
            ->assertJsonPath('data.business_name', 'Elite Wash Addis');

        // 4. Update Tenant Settings
        $response = $this->actingAs($superAdmin)
            ->putJson("/api/tenants/{$tenantId}", [
                'business_name' => 'Elite Wash Addis Updated',
                'plan' => 'enterprise',
                'categories_enabled' => ['car-washing', 'building-cleaning']
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.business_name', 'Elite Wash Addis Updated')
            ->assertJsonPath('data.plan', 'enterprise');

        // 5. Suspend Tenant status
        $response = $this->actingAs($superAdmin)
            ->patchJson("/api/tenants/{$tenantId}/status", [
                'status' => 'suspended'
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'suspended');

        // 6. Access Control: Customer must be blocked
        $response = $this->actingAs($customer)
            ->getJson('/api/tenants');

        $response->assertStatus(403);
    }
}


