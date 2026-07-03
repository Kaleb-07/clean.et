<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Models\Traits\BelongsToTenant;

class Booking extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'sector_id',
        'customer_id',
        'staff_id',
        'vehicle_id',
        'building_profile_id',
        'service_id',
        'user_id',
        'status',
        'requirement_data',
        'price',
        'currency',
        'scheduled_at',
        'booking_date',
        'booking_time',
        'recurring',
        'recurrence_rule',
    ];

    protected $casts = [
        'requirement_data' => 'array',
        'price'            => 'decimal:2',
        'scheduled_at'     => 'datetime',
        'booking_date'     => 'date:Y-m-d',
        'recurring'        => 'boolean',
    ];

    // ================= STATUS CONSTANTS =================

    const STATUS_PENDING         = 'pending';
    const STATUS_CONFIRMED       = 'confirmed';
    const STATUS_DRIVER_ASSIGNED = 'driver_assigned';
    const STATUS_PICKED_UP       = 'picked_up';
    const STATUS_IN_PROGRESS     = 'in_progress';
    const STATUS_COMPLETED       = 'completed';
    const STATUS_INVOICED        = 'invoiced';
    const STATUS_CANCELLED       = 'cancelled';

    const VALID_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_CONFIRMED,
        self::STATUS_DRIVER_ASSIGNED,
        self::STATUS_PICKED_UP,
        self::STATUS_IN_PROGRESS,
        self::STATUS_COMPLETED,
        self::STATUS_INVOICED,
        self::STATUS_CANCELLED,
    ];

    // ================= RELATIONSHIPS =================

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sector()
    {
        return $this->belongsTo(Sector::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    // Legacy user relationship (kept for backward compat)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function staff()
    {
        return $this->belongsTo(StaffProfile::class, 'staff_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function building()
    {
        return $this->belongsTo(BuildingProfile::class, 'building_profile_id');
    }

    // Legacy service relationship (kept for backward compat)
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function completionProofs()
    {
        return $this->hasMany(BookingCompletionProof::class);
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    // ================= SCOPES =================

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    public function scopeForTenant($query, int $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    // ================= HELPERS =================

    public function isCancellable(): bool
    {
        return !in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_INVOICED, self::STATUS_CANCELLED]);
    }
}