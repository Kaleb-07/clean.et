<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,

            'customer' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'phone' => $this->user->phone,
            ],

            // Return legacy service info if available
            'service' => $this->service ? [
                'id' => $this->service->id,
                'name' => $this->service->name,
                'price' => $this->service->price,
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

            // Associated customer profiles/vehicles if present
            'vehicle_id'          => $this->vehicle_id,
            'building_profile_id' => $this->building_profile_id,
            'recurring'           => $this->recurring,
            'recurrence_rule'     => $this->recurrence_rule,

            'created_at' => $this->created_at,
        ];
    }
}