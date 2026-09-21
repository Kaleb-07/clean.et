<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'action',
        'description',
        'ip_address',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function log(string $action, ?string $description = null, ?array $metadata = null, ?int $userId = null): self
    {
        return static::create([
            'user_id'     => $userId ?? auth()->id(),
            'action'      => $action,
            'description' => $description,
            'ip_address'  => request()->ip(),
            'metadata'    => $metadata,
        ]);
    }
}
