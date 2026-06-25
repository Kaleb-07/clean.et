<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum guard already enforces authentication
    }

    public function rules(): array
    {
        return [
            'vehicle_class'    => ['required', 'string', 'in:sedan,suv,van,truck,bus,motorcycle,other'],
            'plate_number'     => ['nullable', 'string', 'max:20'],
            'color'            => ['nullable', 'string', 'max:50'],
            'make'             => ['nullable', 'string', 'max:80'],
            'model'            => ['nullable', 'string', 'max:80'],
            'year'             => ['nullable', 'integer', 'min:1970', 'max:' . (date('Y') + 1)],
            'fleet_account_id' => ['nullable', 'integer', 'exists:fleet_accounts,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'vehicle_class.in' => 'Vehicle class must be one of: sedan, suv, van, truck, bus, motorcycle, other.',
        ];
    }
}
