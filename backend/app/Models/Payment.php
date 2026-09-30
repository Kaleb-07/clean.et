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
        'checkout_url',
        'phone_number',
        'chapa_tx_ref',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    // ================= RELATIONSHIPS =================

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Convenience accessor: reach the booking via the invoice.
     */
    public function booking()
    {
        return $this->hasOneThrough(
            Booking::class,
            Invoice::class,
            'id',          // FK on invoices
            'id',          // FK on bookings
            'invoice_id',  // local key on payments
            'booking_id'   // local key on invoices
        );
    }
}
