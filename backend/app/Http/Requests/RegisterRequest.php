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
            'name'      => 'required|string|min:2|max:255',
            'phone'     => 'required|string|max:20|unique:users,phone',
            'email'     => 'nullable|email|unique:users,email',
            'password'  => 'required|min:6|confirmed',
            'language'  => 'nullable|string|in:en,am',
            'tenant_id' => 'nullable|exists:tenants,id',
        ];
    }

    public function messages()
    {
        return [
            'name.required'      => 'Full name is required.',
            'name.min'           => 'Name must be at least 2 characters.',
            'phone.required'     => 'Phone number is required.',
            'phone.unique'       => 'This phone number is already registered.',
            'email.email'        => 'Please enter a valid email address.',
            'email.unique'       => 'This email address is already registered.',
            'password.required'  => 'Password is required.',
            'password.min'       => 'Password must be at least 6 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
        ];
    }
}