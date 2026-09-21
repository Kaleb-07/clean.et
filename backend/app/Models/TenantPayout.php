<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TenantPayout extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'gross_amount',
        'commission_rate',
        'commission_amount',
        'net_payout',
        'period_start',
        'period_end',
        'status',
        'payout_method',
        'reference_number',
        'notes',
        'processed_at',
    ];

    protected $casts = [
        'gross_amount'      => 'decimal:2',
        'commission_rate'   => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'net_payout'        => 'decimal:2',
        'period_start'      => 'date',
        'period_end'        => 'date',
        'processed_at'      => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
