<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tour extends Model
{
    use HasFactory;

    protected $fillable = [
        'guide_id',
        'slug',
        'title',
        'short_description',
        'full_description',
        'audience_description',
        'duration_minutes',
        'price_rub',
        'currency',
        'cover_image_url',
        'gallery_json',
        'translation_json',
        'enabled_locales_json',
        'status',
        'is_featured',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'gallery_json' => 'array',
            'translation_json' => 'array',
            'enabled_locales_json' => 'array',
            'is_featured' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function guide(): BelongsTo
    {
        return $this->belongsTo(Guide::class);
    }

    public function tourPoints(): HasMany
    {
        return $this->hasMany(TourPoint::class)->orderBy('sort_order');
    }

    public function tracks(): HasMany
    {
        return $this->hasMany(Track::class)->orderBy('sort_order');
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function accessGrants(): HasMany
    {
        return $this->hasMany(AccessGrant::class);
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(TourRating::class);
    }
}
