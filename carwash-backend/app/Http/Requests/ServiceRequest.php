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
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'price'       => 'required|numeric|min:0',
            'image'       => 'nullable|string',
            'duration'    => 'nullable|integer',
            'category'    => 'nullable|string',
            'sub_center'  => 'nullable|string',
            'tenant_id'   => 'nullable|integer',
            'sector_id'   => 'nullable|integer',
        ];
    }
}