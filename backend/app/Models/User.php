<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'tenant_id',
        'name',
        'phone',
        'email',
        'password',
        'role',
        'language',
        'push_token',
        'notification_preferences',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'notification_preferences' => 'array',
    ];

    public function getNotificationPreferences(): array
    {
        $defaults = [
            'appointment_updates' => true,
            'reminders'           => true,
            'chat_messages'       => true,
            'promotions'          => false,
            'email_notifications' => true,
            'sms_notifications'   => false,
        ];

        return array_merge($defaults, $this->notification_preferences ?? []);
    }

    // ================= RELATIONSHIPS =================

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function staffProfile()
    {
        return $this->hasOne(StaffProfile::class);
    }

    public function staff()
    {
        return $this->hasOne(StaffProfile::class);
    }

    public function customerProfile()
    {
        return $this->hasOne(Customer::class);
    }

    public function customer()
    {
        return $this->hasOne(Customer::class);
    }

    // ================= HELPERS =================

    public function isAdmin(): bool
    {
        return in_array($this->role, ['super_admin', 'tenant_admin', 'admin']);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isTenantAdmin(): bool
    {
        return in_array($this->role, ['tenant_admin', 'admin']);
    }

    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    public function getIsAdminAttribute(): bool
    {
        return $this->isAdmin();
    }
}