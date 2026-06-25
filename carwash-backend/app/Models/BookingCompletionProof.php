<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BookingCompletionProof extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'booking_id',
        'photo_url',
        'checklist_item',
        'created_at',
    ];

    // ================= RELATIONSHIPS =================

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
