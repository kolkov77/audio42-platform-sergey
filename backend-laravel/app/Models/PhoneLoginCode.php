<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PhoneLoginCode extends Model
{
    protected $fillable = [
        'phone',
        'code_hash',
        'purpose',
        'attempts',
        'sent_at',
        'expires_at',
        'consumed_at',
        'ip_address',
        'user_agent',
        'provider',
        'provider_message_id',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }
}
