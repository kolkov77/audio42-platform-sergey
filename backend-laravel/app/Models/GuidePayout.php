<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuidePayout extends Model
{
    use HasFactory;

    protected $fillable = [
        'guide_id',
        'recorded_by_user_id',
        'paid_on',
        'amount_rub',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'paid_on' => 'date',
        ];
    }

    public function guide(): BelongsTo
    {
        return $this->belongsTo(Guide::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}
