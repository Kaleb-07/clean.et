<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StaffCertification extends Model
{
    use HasFactory;

    protected $fillable = [
        'staff_profile_id',
        'type',
        'issued_at',
        'expires_at',
        'document_url',
    ];

    protected $casts = [
        'issued_at'  => 'date',
        'expires_at' => 'date',
    ];

    // ================= RELATIONSHIPS =================

    public function staffProfile()
    {
        return $this->belongsTo(StaffProfile::class);
    }

    // ================= HELPERS =================

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function expiresWithinDays(int $days = 30): bool
    {
        return $this->expires_at->diffInDays(now(), false) >= -$days;
    }
}
