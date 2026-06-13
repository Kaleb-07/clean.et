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
            ],

            'service' => [
                'id' => $this->service->id,
                'name' => $this->service->name,
                'price' => $this->service->price,
            ],

            'booking_date' => $this->booking_date
                ? (is_string($this->booking_date)
                    ? $this->booking_date
                    : $this->booking_date->format('Y-m-d'))
                : null,
            'booking_time' => substr($this->getRawOriginal('booking_time') ?? '', 0, 5),

            'status' => $this->status,

            'created_at' => $this->created_at,
        ];
    }
}