<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TourPoint extends Model
{
    use HasFactory;

    protected $fillable = [
        'tour_id',
        'point_id',
        'title_override',
        'description_override',
        'gallery_json',
        'gallery_captions_json',
        'translation_json',
        'sort_order',
        'is_route_visible',
    ];

    protected function casts(): array
    {
        return [
            'gallery_json' => 'array',
            'gallery_captions_json' => 'array',
            'translation_json' => 'array',
            'is_route_visible' => 'boolean',
        ];
    }

    public function galleryItems(): array
    {
        $images = collect($this->gallery_json ?? [])
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->values();

        $captions = collect($this->gallery_captions_json ?? [])
            ->map(fn ($value) => trim((string) $value))
            ->values();

        return $images
            ->map(fn ($image, $index) => [
                'image_url' => $image,
                'caption' => ($captions->get($index) ?: null),
            ])
            ->values()
            ->all();
    }

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    public function point(): BelongsTo
    {
        return $this->belongsTo(PointOfInterest::class, 'point_id');
    }

    public function tracks(): HasMany
    {
        return $this->hasMany(Track::class);
    }
}
