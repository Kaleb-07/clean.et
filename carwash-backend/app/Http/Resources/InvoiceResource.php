<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Invoice
 */
class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'amount'   => (float) $this->amount,
            'currency' => $this->currency ?? 'ETB',
            'period'   => $this->period,
            'status'   => $this->status,
            'due_at'   => $this->due_at?->toDateString(),
            'booking'  => $this->when(
                $this->relationLoaded('booking'),
                fn () => [
                    'id'           => $this->booking?->id,
                    'booking_date' => $this->booking?->booking_date,
                    'sector_name'  => $this->booking?->sector?->name,
                ]
            ),
            'payments' => $this->when(
                $this->relationLoaded('payments'),
                fn () => PaymentResource::collection($this->payments)
            ),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
