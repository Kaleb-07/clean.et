<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBuildingProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:120'],
            'area_sqm'      => ['required', 'numeric', 'min:1', 'max:999999'],
            'floor_count'   => ['required', 'integer', 'min:1', 'max:200'],
            'access_notes'  => ['nullable', 'string', 'max:500'],
            // room_inventory: flexible JSON — key→count pairs
            'room_inventory'             => ['nullable', 'array'],
            'room_inventory.*'           => ['integer', 'min:0'],
        ];
    }
}
