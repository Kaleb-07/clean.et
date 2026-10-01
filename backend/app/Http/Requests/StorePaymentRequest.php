<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'invoice_id'      => ['required', 'integer', 'exists:invoices,id'],
            'provider'        => ['required', 'string', 'in:telebirr,cbe_birr,amole,stripe,cash,chapa'],
            'return_url'      => ['nullable', 'url'],
            // Cash-specific: amount physically collected by the crew member
            'amount_received' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
