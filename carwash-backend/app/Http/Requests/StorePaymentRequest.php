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
            'invoice_id' => ['required', 'integer', 'exists:invoices,id'],
            'provider'   => ['required', 'string', 'in:telebirr,cbe_birr,amole,stripe,cash'],
            /**
             * For mobile-money providers the client passes the provider's redirect URL
             * returned from the payment gateway; for cash it may be omitted.
             */
            'return_url' => ['nullable', 'url'],
        ];
    }
}
