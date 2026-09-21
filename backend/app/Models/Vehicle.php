<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'vehicle_class',
        'fleet_account_id',
        'plate_number',
        'color',
        'make',
        'model',
        'year',
    ];

    // ================= RELATIONSHIPS =================

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function fleetAccount()
    {
        return $this->belongsTo(FleetAccount::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
