<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Sector extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'requirement_schema',
    ];

    protected $casts = [
        'requirement_schema' => 'array',
    ];

    // ================= RELATIONSHIPS =================

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function services()
    {
        return $this->hasMany(Service::class);
    }

    // ================= HELPERS =================

    /**
     * Returns the flat list of field definitions from requirement_schema.
     */
    public function getFields(): array
    {
        return $this->requirement_schema['fields'] ?? [];
    }

    /**
     * Returns required field keys.
     */
    public function getRequiredFieldKeys(): array
    {
        return array_map(
            fn($f) => $f['key'],
            array_filter($this->getFields(), fn($f) => $f['required'] ?? false)
        );
    }
}
