<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Sector;
use App\Models\User;
use App\Notifications\BookingNotification;
use Illuminate\Support\Facades\DB;

class BookingService
{
    public function __construct(
        protected PricingService          $pricing,
        protected SchemaValidationService $schemaValidator,
        protected NotificationService     $notifications,
    ) {}

    public function getAll(User $user): \Illuminate\Database\Eloquent\Collection
    {
        $query = Booking::with(['tenant', 'sector.category', 'customer.user', 'staff.user', 'vehicle', 'building', 'service', 'invoice']);

        if ($user->isCustomer()) {
            // Customer sees only their own bookings
            $customer = $user->customerProfile;
            $query->where(function($q) use ($customer, $user) {
                $q->where('customer_id', $customer?->id)
                  ->orWhere('user_id', $user->id);
            });
        } elseif ($user->isTenantAdmin() && $user->tenant_id) {
            // Tenant admin sees bookings for their tenant OR matching their division categories
            $tenant = $user->tenant;
            $categories = $tenant?->categories_enabled ?? [];
            $query->where(function($q) use ($user, $categories) {
                $q->where('tenant_id', $user->tenant_id);
                if (!empty($categories)) {
                    $q->orWhereHas('sector.category', function($catQuery) use ($categories) {
                        $catQuery->whereIn('slug', $categories);
                    });
                }
            });
        } elseif ($user->isStaff()) {
            // Staff sees only assigned jobs
            $profile = $user->staffProfile;
            $query->where('staff_id', $profile?->id);
        }
        // Super admin sees all

        return $query->latest()->get();
    }

    public function getById(int $id, User $user): Booking
    {
        $booking = Booking::with(['tenant', 'sector.category', 'customer.user', 'staff.user', 'vehicle', 'building', 'service', 'invoice'])
            ->findOrFail($id);

        $this->authorizeView($booking, $user);

        return $booking;
    }

    public function create(array $data, User $user): Booking
    {
        // Resolve sector — either direct sector_id or from legacy service_id
        $sector = null;
        if (!empty($data['sector_id'])) {
            $sector = Sector::with('category')->findOrFail($data['sector_id']);
        } elseif (!empty($data['service_id'])) {
            $service = \App\Models\Service::findOrFail($data['service_id']);
            $sector  = $service->sector()->with('category')->first();
        }

        // Validate dynamic requirements if sector found
        $requirementData = $data['requirement_data'] ?? [];
        if ($sector) {
            $this->schemaValidator->validate($sector, $requirementData);
        }

        // Compute price
        $price = ($sector) ? $this->pricing->calculate($sector, $requirementData) : 0.0;

        // Resolve customer profile
        $customer = $user->customerProfile;

        // Scheduled time
        $scheduledAt = $data['scheduled_at']
            ?? (isset($data['booking_date'], $data['booking_time'])
                ? ($data['booking_date'] . ' ' . $data['booking_time'])
                : now());

        // Resolve tenant_id for division assignment
        $tenantId = $data['tenant_id'] ?? $user->tenant_id;
        if (!$tenantId && !empty($data['service_id'])) {
            $tenantId = \App\Models\Service::find($data['service_id'])?->tenant_id;
        }
        if (!$tenantId && $sector && $sector->category) {
            $categorySlug = $sector->category->slug;
            // Prefer specific sector division tenants (where tenant_id != 1)
            $tenantId = \App\Models\Tenant::where('status', 'active')
                ->where('id', '!=', 1)
                ->whereJsonContains('categories_enabled', $categorySlug)
                ->value('id');

            if (!$tenantId) {
                $tenantId = \App\Models\Tenant::where('status', 'active')
                    ->whereJsonContains('categories_enabled', $categorySlug)
                    ->value('id');
            }
        }
        if (!$tenantId) {
            $tenantId = \App\Models\Tenant::first()?->id;
        }

        $booking = Booking::create([
            'tenant_id'           => $tenantId,
            'sector_id'           => $sector?->id,
            'service_id'          => $data['service_id'] ?? null,
            'user_id'             => $user->id,
            'customer_id'         => $customer?->id,
            'vehicle_id'          => $data['vehicle_id'] ?? null,
            'building_profile_id' => $data['building_profile_id'] ?? null,
            'requirement_data'    => $requirementData,
            'price'               => $price,
            'currency'            => 'ETB',
            'scheduled_at'        => $scheduledAt,
            'booking_date'        => $data['booking_date'] ?? null,
            'booking_time'        => $data['booking_time'] ?? null,
            'status'              => Booking::STATUS_PENDING,
            'recurring'           => $data['recurring'] ?? false,
            'recurrence_rule'     => $data['recurrence_rule'] ?? null,
        ]);

        // ── Notify customer immediately ──────────────────────────────────────
        if ($booking->user) {
            $sectorName = $sector?->name ?? '';
            $this->notifications->notifyBookingCreated($booking->user, $booking->id, $sectorName);
        }

        return $booking->load(['sector.category', 'customer.user', 'vehicle', 'building', 'service']);
    }

    public function update(int $id, array $data, User $user): Booking
    {
        $booking = Booking::findOrFail($id);
        $this->authorizeModify($booking, $user);

        $booking->update($data);

        return $booking->load(['sector.category', 'customer.user', 'vehicle', 'building', 'service']);
    }

    public function cancel(int $id, User $user): Booking
    {
        $booking = Booking::findOrFail($id);
        $this->authorizeModify($booking, $user);

        if (!$booking->isCancellable()) {
            abort(400, 'Booking cannot be cancelled at this stage.');
        }

        $booking->update(['status' => Booking::STATUS_CANCELLED]);

        // Notify customer
        $targetUser = $booking->user ?? $booking->customer?->user;
        if ($targetUser) {
            $this->notifications->notifyBookingCancelled($targetUser, $booking->id);
        }

        return $booking->load(['sector.category', 'customer.user', 'vehicle', 'service']);
    }

    public function updateStatus(int $id, string $status): Booking
    {
        if (!in_array($status, Booking::VALID_STATUSES, true)) {
            abort(422, "Invalid status '{$status}'.");
        }

        $booking = Booking::with(['user', 'customer.user'])->findOrFail($id);

        DB::transaction(function () use ($booking, $status) {
            $booking->update(['status' => $status]);

            // Auto-generate invoice when booking transitions to 'invoiced'
            if ($status === 'invoiced') {
                $this->generateInvoice($booking);
            }
        });

        // Fire notification (fire-and-forget, outside transaction)
        $targetUser = $booking->user ?? $booking->customer?->user;
        if ($targetUser) {
            $this->notifications->notifyBookingStatus($targetUser, $booking->id, $status);
        }

        return $booking->load(['sector.category', 'customer.user', 'vehicle', 'service']);
    }

    /**
     * Generate (or retrieve existing) invoice for a booking.
     * Safe to call multiple times — will not duplicate.
     */
    public function generateInvoice(Booking $booking): Invoice
    {
        // Return existing invoice if already created
        $existing = Invoice::where('booking_id', $booking->id)->first();
        if ($existing) {
            return $existing;
        }

        return Invoice::create([
            'tenant_id'   => $booking->tenant_id,
            'customer_id' => $booking->customer_id,
            'booking_id'  => $booking->id,
            'amount'      => $booking->price ?? 0,
            'currency'    => $booking->currency ?? 'ETB',
            'status'      => 'sent',
            'period'      => now()->format('Y-m'),
            'due_at'      => now()->addDays(7)->toDateString(),
        ]);
    }

    public function delete(int $id, User $user): void
    {
        $booking = Booking::findOrFail($id);
        $this->authorizeModify($booking, $user);
        $booking->delete();
    }

    // ─── Authorization Guards ─────────────────────────────────────────────────

    private function authorizeView(Booking $booking, User $user): void
    {
        if ($user->isSuperAdmin()) return;
        if ($user->isAdmin() && $booking->tenant_id === $user->tenant_id) return;
        if ($user->isStaff() && $booking->staff_id === $user->staffProfile?->id) return;
        if ($user->isCustomer() && ($booking->user_id === $user->id || $booking->customer_id === $user->customerProfile?->id)) return;
        abort(403, 'Unauthorized');
    }

    private function authorizeModify(Booking $booking, User $user): void
    {
        if ($user->isSuperAdmin()) return;
        if ($user->isAdmin() && $booking->tenant_id === $user->tenant_id) return;
        if ($user->isCustomer() && ($booking->user_id === $user->id || $booking->customer_id === $user->customerProfile?->id)) return;
        abort(403, 'Unauthorized');
    }
}
