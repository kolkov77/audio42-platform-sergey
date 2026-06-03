<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MagicLoginLink extends Model
{
    protected $fillable = [
        'user_id',
        'email_snapshot',
        'token_hash',
        'entry_context',
        'frontend_base_url',
        'redirect_path',
        'requested_ip',
        'user_agent',
        'expires_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
