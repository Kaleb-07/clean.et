<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FleetAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'company_name',
        'billing_contact_email',
    ];

    // ================= RELATIONSHIPS =================

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function vehicles()
    {
        return $this->hasMany(Vehicle::class);
    }
}
