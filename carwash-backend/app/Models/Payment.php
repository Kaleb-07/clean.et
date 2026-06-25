<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'provider',
        'status',
        'amount',
        'provider_reference',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    // ================= RELATIONSHIPS =================

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
