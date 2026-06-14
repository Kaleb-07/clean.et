<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookingRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $rules = [
            'booking_date' => 'required|date|after_or_equal:today',
            'booking_time' => 'required|date_format:H:i',
        ];

        if ($this->isMethod('post')) {
            $rules['service_id'] = 'required|exists:services,id';
        } else {
            $rules['service_id'] = 'sometimes|required|exists:services,id';
        }

        return $rules;
    }
}