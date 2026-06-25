<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Payment
 */
class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'invoice_id'         => $this->invoice_id,
            'provider'           => $this->provider,
            'status'             => $this->status,
            'amount'             => (float) $this->amount,
            'provider_reference' => $this->provider_reference,
            'checkout_url'       => $this->checkout_url ?? null,
            'created_at'         => $this->created_at?->toISOString(),
        ];
    }
}
