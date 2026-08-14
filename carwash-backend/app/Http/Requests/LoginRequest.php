<?php

namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'phone'    => 'required_without:email|nullable|string',
            'email'    => 'required_without:phone|nullable|string',
            'password' => 'required|string|min:6',
        ];
    }

    public function messages()
    {
        return [
            'phone.required_without' => 'Please enter a valid phone number or email.',
            'email.required_without' => 'Please enter a valid phone number or email.',
            'password.required'      => 'Password is required.',
            'password.min'           => 'Password must be at least 6 characters.',
        ];
    }
}