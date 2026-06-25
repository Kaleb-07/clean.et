<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name'      => 'required|string|max:255',
            'phone'     => 'required|string|max:20|unique:users,phone',
            'email'     => 'nullable|email|unique:users,email',
            'password'  => 'required|min:6|confirmed',
            'language'  => 'nullable|string|in:en,am,om,ti',
            'tenant_id' => 'nullable|exists:tenants,id',
        ];
    }
}
