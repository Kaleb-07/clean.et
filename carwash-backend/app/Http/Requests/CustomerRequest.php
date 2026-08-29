<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CustomerRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $customerId = $this->route('id') ?? $this->route('customer') ?? $this->id;

        return [
            'name'     => 'required|string|min:2|max:255',
            'email'    => 'nullable|email|max:255|unique:users,email,' . $customerId,
            'phone'    => 'nullable|string|min:6|max:30',
            'password' => 'nullable|string|min:4',
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'Client Full Name is required.',
            'name.min'      => 'Client Full Name must be at least 2 characters.',
            'email.email'   => 'Please provide a valid email address.',
            'email.unique'  => 'This email address is already registered to another account.',
            'phone.min'     => 'Phone number must be at least 6 digits.',
            'password.min'  => 'Password must be at least 4 characters.',
        ];
    }
}