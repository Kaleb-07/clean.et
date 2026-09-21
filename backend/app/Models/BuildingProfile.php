<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BuildingProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'name',
        'area_sqm',
        'floor_count',
        'room_inventory',
        'access_notes',
    ];

    protected $casts = [
        'area_sqm'       => 'decimal:2',
        'room_inventory' => 'array',
    ];

    // ================= RELATIONSHIPS =================

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    // ================= HELPERS =================

    /**
     * Determine the exterior cleaning access-method tier per Technical Reference §10.
     * low_rise:  up to 3 floors — standard crew
     * mid_rise:  4–6 floors    — platform-trained operator
     * high_rise: 7+ floors     — IRATA/SPRAT certified rope-access
     */
    public function getExteriorAccessTier(): string
    {
        if ($this->floor_count <= 3) return 'low_rise';
        if ($this->floor_count <= 6) return 'mid_rise';
        return 'high_rise';
    }
}
