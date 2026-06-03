<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PageView extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'session_key',
        'visitor_key',
        'ip_address',
        'host',
        'device_type',
        'page_path',
        'page_query',
        'referrer_url',
        'referrer_host',
        'source_label',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'geo_country_code',
        'geo_country_name',
        'geo_city_name',
        'is_entry',
        'viewed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_entry' => 'boolean',
            'viewed_at' => 'datetime',
        ];
    }
}
