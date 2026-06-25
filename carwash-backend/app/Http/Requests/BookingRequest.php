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
        $isPost = $this->isMethod('post');

        return [
            // Require either service_id (legacy) or sector_id (new)
            'service_id'          => ($isPost ? 'required_without:sector_id' : 'nullable') . '|exists:services,id',
            'sector_id'           => ($isPost ? 'required_without:service_id' : 'nullable') . '|exists:sectors,id',

            // Require scheduled_at (new) or booking_date & booking_time (legacy)
            'scheduled_at'        => ($isPost ? 'required_without:booking_date' : 'nullable') . '|date|after_or_equal:today',
            'booking_date'        => ($isPost ? 'required_without:scheduled_at' : 'nullable') . '|date|after_or_equal:today',
            'booking_time'        => 'required_with:booking_date|date_format:H:i',

            // Assets and dynamic structures
            'requirement_data'    => 'nullable|array',
            'vehicle_id'          => 'nullable|exists:vehicles,id',
            'building_profile_id' => 'nullable|exists:building_profiles,id',

            // Recurring details
            'recurring'           => 'nullable|boolean',
            'recurrence_rule'     => 'nullable|string|max:50',
        ];
    }
}