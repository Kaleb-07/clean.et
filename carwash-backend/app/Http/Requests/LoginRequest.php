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
            'phone'    => 'required_without:email|string',
            'email'    => 'required_without:phone|string',
            'password' => 'required|string',
        ];
    }
}