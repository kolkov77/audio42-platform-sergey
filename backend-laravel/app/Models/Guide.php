<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Guide extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'slug',
        'display_name',
        'headline',
        'bio',
        'photo_url',
        'about_audio_url',
        'about_audio_file_name',
        'website_url',
        'social_links_json',
        'trust_points_json',
        'translation_json',
        'enabled_locales_json',
        'is_public',
        'reward_percent',
    ];

    protected function casts(): array
    {
        return [
            'social_links_json' => 'array',
            'trust_points_json' => 'array',
            'translation_json' => 'array',
            'enabled_locales_json' => 'array',
            'is_public' => 'boolean',
            'reward_percent' => 'float',
        ];
    }

    public function rewardPercent(): float
    {
        return (float) ($this->reward_percent ?? 40);
    }

    public function rewardRate(): float
    {
        return $this->rewardPercent() / 100;
    }

    public function rewardRub(float $salesRub): float
    {
        return round($salesRub * $this->rewardRate(), 2);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function promotions(): HasMany
    {
        return $this->hasMany(GuidePromotion::class);
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(GuidePayout::class)->orderByDesc('paid_on')->orderByDesc('id');
    }

    public function tours(): HasMany
    {
        return $this->hasMany(Tour::class);
    }
}
