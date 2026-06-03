<?php

namespace App\Support;

use App\Models\Tour;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class Audio42Locale
{
    public const DEFAULT = 'ru';

    public const SUPPORTED = ['ru', 'en', 'zh', 'de', 'fr'];

    public const TRANSLATABLE_FIELDS = [
        'title',
        'short_description',
        'full_description',
        'audience_description',
        'headline',
        'bio',
        'description',
        'title_override',
        'description_override',
        'trust_points',
        'gallery_captions',
    ];

    public static function fromRequest(Request $request): string
    {
        return self::normalize((string) $request->query('locale', self::DEFAULT));
    }

    public static function normalize(?string $locale): string
    {
        $locale = strtolower(trim((string) $locale));

        if ($locale === 'zh-cn' || $locale === 'zh_cn' || $locale === 'cn') {
            return 'zh';
        }

        return in_array($locale, self::SUPPORTED, true) ? $locale : self::DEFAULT;
    }

    public static function enabledLocales(?array $value): array
    {
        $locales = collect($value ?? [])
            ->map(fn ($locale) => self::normalize((string) $locale))
            ->filter(fn ($locale) => $locale !== self::DEFAULT)
            ->unique()
            ->values()
            ->all();

        return array_values(array_intersect(self::SUPPORTED, [self::DEFAULT, ...$locales]));
    }

    public static function tourLocales(?array $value): array
    {
        $locales = collect($value ?? [])
            ->map(fn ($locale) => self::normalize((string) $locale))
            ->values()
            ->all();

        foreach ($locales as $locale) {
            if ($locale !== self::DEFAULT) {
                return [$locale];
            }
        }

        return [self::DEFAULT];
    }

    public static function applyTourLocaleFilter($query, string $locale)
    {
        $locale = self::normalize($locale);

        if ($locale !== self::DEFAULT) {
            return $query->whereJsonContains('enabled_locales_json', $locale);
        }

        $foreignLocales = array_values(array_filter(self::SUPPORTED, fn ($item) => $item !== self::DEFAULT));

        return $query->where(function ($localeQuery) use ($foreignLocales) {
            $localeQuery
                ->whereNull('enabled_locales_json')
                ->orWhereJsonLength('enabled_locales_json', 0)
                ->orWhere(function ($defaultQuery) use ($foreignLocales) {
                    foreach ($foreignLocales as $foreignLocale) {
                        $defaultQuery->whereJsonDoesntContain('enabled_locales_json', $foreignLocale);
                    }
                });
        });
    }

    public static function isTourLocaleEnabled(Tour $tour, string $locale): bool
    {
        $locale = self::normalize($locale);

        return in_array($locale, self::tourLocales($tour->enabled_locales_json ?? []), true);
    }

    public static function string(Model $model, string $locale, string $field): ?string
    {
        $base = $model->{$field};
        $locale = self::normalize($locale);

        if ($locale === self::DEFAULT) {
            return $base;
        }

        $translations = $model->translation_json ?? [];
        $translated = $translations[$locale][$field] ?? null;

        if (is_string($translated) && trim($translated) !== '') {
            return trim($translated);
        }

        return $base;
    }

    public static function array(Model $model, string $locale, string $field, ?array $base = null): array
    {
        $locale = self::normalize($locale);
        $base = $base ?? [];

        if ($locale === self::DEFAULT) {
            return $base;
        }

        $translations = $model->translation_json ?? [];
        $translated = $translations[$locale][$field] ?? null;

        if (is_array($translated)) {
            return collect($translated)
                ->map(fn ($item) => is_string($item) ? trim($item) : '')
                ->values()
                ->all();
        }

        return $base;
    }

    public static function cleanTranslations(?array $translations): array
    {
        $clean = [];

        foreach ($translations ?? [] as $locale => $fields) {
            $locale = self::normalize((string) $locale);

            if ($locale === self::DEFAULT || ! is_array($fields)) {
                continue;
            }

            foreach ($fields as $field => $value) {
                if (! in_array($field, self::TRANSLATABLE_FIELDS, true)) {
                    continue;
                }

                if (is_array($value)) {
                    $items = collect($value)
                        ->map(fn ($item) => is_string($item) ? trim($item) : '')
                        ->values()
                        ->all();

                    if (collect($items)->contains(fn ($item) => $item !== '')) {
                        $clean[$locale][$field] = $items;
                    }

                    continue;
                }

                $value = trim((string) $value);
                if ($value !== '') {
                    $clean[$locale][$field] = $value;
                }
            }
        }

        return $clean;
    }
}
