<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Scopes\TenantScope;

class Service extends Model
{
    use HasFactory;

    protected static function booted()
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function ($service) {
            if (!$service->tenant_id && auth()->check() && auth()->user()->tenant_id) {
                $service->tenant_id = auth()->user()->tenant_id;
            }
        });
    }

    protected $fillable = [
        'tenant_id',
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

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}