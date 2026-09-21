<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

use App\Models\Traits\BelongsToTenant;

class StaffProfile extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'user_id',
        'tenant_id',
        'role_title',
        'sector_qualifications',
        'jobs_completed',
        'average_rating',
        'availability_status',
    ];

    protected $casts = [
        'sector_qualifications' => 'array',
        'average_rating'        => 'decimal:2',
    ];

    // ================= RELATIONSHIPS =================

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function certifications()
    {
        return $this->hasMany(StaffCertification::class);
    }

    public function assignedBookings()
    {
        return $this->hasMany(Booking::class, 'staff_id');
    }

    // ================= HELPERS =================

    public function isQualifiedFor(int $sectorId): bool
    {
        return in_array($sectorId, $this->sector_qualifications ?? []);
    }
}
