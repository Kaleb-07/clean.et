<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'price',
        'image',
        'duration',
        'category',
        'sector_id',
    ];

    protected $casts = [
        'price'    => 'decimal:2',
        'duration' => 'integer',
    ];

    // ================= RELATIONSHIPS =================

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}