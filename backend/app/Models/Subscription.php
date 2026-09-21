<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_type',
        'owner_id',
        'plan',
        'billing_cycle',
        'status',
        'renews_at',
    ];

    protected $casts = [
        'renews_at' => 'date',
    ];

    // ================= RELATIONSHIPS =================

    public function owner()
    {
        return $this->morphTo();
    }

    // ================= HELPERS =================

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
