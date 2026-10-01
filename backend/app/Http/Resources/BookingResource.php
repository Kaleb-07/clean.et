<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,

            'customer' => ($this->user ?? $this->customer?->user) ? [
                'id' => ($this->user ?? $this->customer?->user)->id,
                'name' => ($this->user ?? $this->customer?->user)->name,
                'email' => ($this->user ?? $this->customer?->user)->email,
                'phone' => ($this->user ?? $this->customer?->user)->phone,
            ] : null,

            'tenant' => $this->tenant ? [
                'id' => $this->tenant->id,
                'business_name' => $this->tenant->business_name,
                'plan' => $this->tenant->plan,
            ] : null,

            // Return legacy service info if available
            'service' => $this->service ? [
                'id' => $this->service->id,
                'name' => $this->service->name,
                'price' => $this->service->price,
                'sub_center' => $this->service->sub_center ?? null,
            ] : null,

            // Return sector and category details
            'sector' => $this->sector ? [
                'id' => $this->sector->id,
                'name' => $this->sector->name,
                'slug' => $this->sector->slug,
                'category' => $this->sector->category ? [
                    'id' => $this->sector->category->id,
                    'name' => $this->sector->category->name,
                    'slug' => $this->sector->category->slug,
                ] : null,
            ] : null,

            'requirement_data'    => $this->requirement_data,
            'price'               => $this->price,
            'currency'            => $this->currency ?? 'ETB',
            'scheduled_at'        => $this->scheduled_at ? $this->scheduled_at->toIso8601String() : null,
            'address'             => $this->requirement_data['address'] ?? $this->requirement_data['location'] ?? null,
            'notes'               => $this->requirement_data['notes'] ?? $this->requirement_data['special_instructions'] ?? null,

            // Legacy date/time fields for compatibility
            'booking_date' => $this->booking_date
                ? (is_string($this->booking_date)
                    ? $this->booking_date
                    : $this->booking_date->format('Y-m-d'))
                : ($this->scheduled_at ? $this->scheduled_at->format('Y-m-d') : null),
            'booking_time' => $this->booking_time
                ? substr($this->getRawOriginal('booking_time') ?? '', 0, 5)
                : ($this->scheduled_at ? $this->scheduled_at->format('H:i') : null),

            'status' => $this->status,

            'staff' => $this->staff ? [
                'id'         => $this->staff->id,
                'user_id'    => $this->staff->user_id,
                'role_title' => $this->staff->role_title,
                'name'       => $this->staff->user?->name,
                'phone'      => $this->staff->user?->phone,
                'user'       => $this->staff->user ? [
                    'id'    => $this->staff->user->id,
                    'name'  => $this->staff->user->name,
                    'phone' => $this->staff->user->phone,
                    'email' => $this->staff->user->email,
                ] : null,
            ] : null,

            // Associated customer profiles/vehicles if present
            'vehicle_id'          => $this->vehicle_id,
            'building_profile_id' => $this->building_profile_id,
            'recurring'           => $this->recurring,
            'recurrence_rule'     => $this->recurrence_rule,

            'invoice_id'          => $this->invoice?->id,

            // Payment info — lets the staff app know if the customer already paid online.
            // Uses the eager-loaded payments collection (no extra queries).
            'payment_status'   => $this->invoice?->payments
                ?->firstWhere(fn ($p) => in_array($p->status, ['completed', 'paid']))
                ?->status ?? null,
            'payment_provider' => $this->invoice?->payments
                ?->firstWhere(fn ($p) => in_array($p->status, ['completed', 'paid']))
                ?->provider ?? null,

            'completion_proofs'   => $this->whenLoaded('completionProofs', fn () =>
                $this->completionProofs->map(fn ($proof) => [
                    'id'             => $proof->id,
                    'photo_url'      => $proof->photo_url,
                    'checklist_item' => $proof->checklist_item,
                    'created_at'     => $proof->created_at?->toISOString(),
                ])->values()
            ),

            'created_at' => $this->created_at,
        ];
    }
}