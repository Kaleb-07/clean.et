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

            'booking_date' => $this->booking_date,
            'booking_time' => $this->booking_time,

            'status' => $this->status,

            'created_at' => $this->created_at,
        ];
    }
}