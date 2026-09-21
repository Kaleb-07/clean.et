<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AuthResource extends JsonResource
{
    public function toArray($request)
    {
        $activeSub = $this->customer?->activeSubscription() ?? (
            $this->customer?->subscription_tier && $this->customer->subscription_tier !== 'none' ? [
                'plan'      => $this->customer->subscription_tier,
                'status'    => 'active',
                'renews_at' => now()->addMonth()->toIso8601String(),
            ] : null
        );

        return [
            'user' => [
                'id'                  => $this->id,
                'tenant_id'           => $this->tenant_id,
                'name'                => $this->name,
                'phone'               => $this->phone,
                'email'               => $this->email,
                'role'                => $this->role,
                'language'            => $this->language,
                'subscription_tier'   => $this->customer?->subscription_tier ?? 'none',
                'active_subscription' => $activeSub,
                'tenant'              => $this->tenant ? [
                    'id'                 => $this->tenant->id,
                    'business_name'      => $this->tenant->business_name,
                    'categories_enabled' => $this->tenant->categories_enabled,
                    'plan'               => $this->tenant->plan,
                    'status'             => $this->tenant->status,
                ] : null,
            ],
            'active_subscription' => $activeSub,
            'token'               => $this->token ?? null,
        ];
    }
}