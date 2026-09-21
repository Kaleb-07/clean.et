<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ServiceRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name'        => 'required|string|min:2|max:255',
            'description' => 'nullable|string|max:1000',
            'price'       => 'required|numeric|min:0|max:1000000',
            'image'       => 'nullable|string',
            'duration'    => 'nullable|integer|min:1|max:1440',
            'category'    => 'nullable|string',
            'sub_center'  => 'nullable|string',
            'tenant_id'   => 'nullable|integer',
            'sector_id'   => 'nullable|integer',
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'Service Offering Name is required.',
            'name.min'      => 'Service Offering Name must be at least 2 characters.',
            'price.required' => 'Service Base Price is required.',
            'price.numeric'  => 'Service Base Price must be a valid number.',
            'price.min'      => 'Service Base Price cannot be negative.',
            'duration.integer' => 'Duration must be a whole number of minutes.',
            'duration.min'     => 'Duration must be at least 1 minute.',
        ];
    }
}