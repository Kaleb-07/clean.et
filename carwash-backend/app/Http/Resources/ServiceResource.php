<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'description' => $this->description,
            'price'       => $this->price,
            'image'       => $this->image ?? null,
            'duration'    => $this->duration ?? 45,
            'category'    => $this->category ?? 'car-washing',
            'sub_center'  => $this->sub_center ?? null,
            'tenant_id'   => $this->tenant_id ?? null,
            'created_at'  => $this->created_at,
        ];
    }
}