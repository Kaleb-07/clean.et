<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_name',
        'plan',
        'categories_enabled',
        'status',
    ];

    protected $casts = [
        'categories_enabled' => 'array',
    ];

    // ================= RELATIONSHIPS =================

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function staffProfiles()
    {
        return $this->hasMany(StaffProfile::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function subscriptions()
    {
        return $this->morphMany(Subscription::class, 'owner');
    }

    // ================= HELPERS =================

    protected static ?int $currentTenantId = null;

    public static function setCurrentId(?int $id): void
    {
        self::$currentTenantId = $id;
    }

    public static function getCurrentId(): ?int
    {
        return self::$currentTenantId;
    }

    public function hasCategory(string $slug): bool
    {
        return in_array($slug, $this->categories_enabled ?? []);
    }
}

