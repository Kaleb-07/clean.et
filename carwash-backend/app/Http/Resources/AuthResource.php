<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AuthResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'user' => [
                'id'        => $this->id,
                'tenant_id' => $this->tenant_id,
                'name'      => $this->name,
                'phone'     => $this->phone,
                'email'     => $this->email,
                'role'      => $this->role,
                'language'  => $this->language,
            ],
            'token' => $this->token ?? null,
        ];
    }
}