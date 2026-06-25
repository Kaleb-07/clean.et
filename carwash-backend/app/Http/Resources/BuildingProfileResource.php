<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\BuildingProfile
 */
class BuildingProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'name'                => $this->name,
            'area_sqm'            => (float) $this->area_sqm,
            'floor_count'         => $this->floor_count,
            'exterior_access_tier' => $this->getExteriorAccessTier(),
            'room_inventory'      => $this->room_inventory ?? [],
            'access_notes'        => $this->access_notes,
            'booking_count'       => $this->when(
                $this->relationLoaded('bookings'),
                fn () => $this->bookings->count()
            ),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
