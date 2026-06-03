<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PointOfInterest extends Model
{
    use HasFactory;

    protected $table = 'points_of_interest';

    protected $fillable = [
        'slug',
        'title',
        'description',
        'city',
        'address_text',
        'lat',
        'lng',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function tourPoints(): HasMany
    {
        return $this->hasMany(TourPoint::class, 'point_id');
    }
}
