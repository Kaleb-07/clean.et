<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Vehicle
 */
class VehicleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'vehicle_class'    => $this->vehicle_class,
            'plate_number'     => $this->plate_number,
            'color'            => $this->color,
            'make'             => $this->make,
            'model'            => $this->model,
            'year'             => $this->year,
            'fleet_account_id' => $this->fleet_account_id,
            'booking_count'    => $this->when(
                $this->relationLoaded('bookings'),
                fn () => $this->bookings->count()
            ),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
