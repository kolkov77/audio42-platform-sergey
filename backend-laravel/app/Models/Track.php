<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Track extends Model
{
    use HasFactory;

    protected $fillable = [
        'tour_id',
        'tour_point_id',
        'title',
        'description',
        'translation_json',
        'audio_url',
        'audio_file_name',
        'duration_seconds',
        'sort_order',
        'track_type',
        'is_demo',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_demo' => 'boolean',
            'is_published' => 'boolean',
            'translation_json' => 'array',
        ];
    }

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    public function tourPoint(): BelongsTo
    {
        return $this->belongsTo(TourPoint::class);
    }
}
