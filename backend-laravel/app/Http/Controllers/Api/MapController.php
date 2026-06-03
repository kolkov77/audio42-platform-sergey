<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PointOfInterest;
use App\Models\Tour;
use App\Support\Audio42Locale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MapController extends Controller
{
    public function points(Request $request): JsonResponse
    {
        $locale = Audio42Locale::fromRequest($request);

        $tours = Tour::query()
            ->with(['guide', 'tourPoints.point'])
            ->where('status', 'published')
            ->tap(fn ($query) => Audio42Locale::applyTourLocaleFilter($query, $locale))
            ->get();

        $tourGroups = $tours
            ->flatMap(function (Tour $tour) use ($locale) {
                $tourLocale = Audio42Locale::isTourLocaleEnabled($tour, $locale) ? $locale : Audio42Locale::DEFAULT;

                return $tour->tourPoints->map(function ($tourPoint) use ($tour, $tourLocale): ?array {
                    if (! $tourPoint->point || $tourPoint->point->lat === null || $tourPoint->point->lng === null) {
                        return null;
                    }

                    return [
                        'point_id' => $tourPoint->point->id,
                        'title' => Audio42Locale::string($tourPoint, $tourLocale, 'title_override') ?: $tourPoint->point->title,
                        'lat' => $tourPoint->point->lat,
                        'lng' => $tourPoint->point->lng,
                        'tour' => [
                            'id' => $tour->id,
                            'slug' => $tour->slug,
                            'title' => Audio42Locale::string($tour, $tourLocale, 'title'),
                            'guide_name' => $tour->guide?->display_name,
                        ],
                    ];
                });
            })
            ->filter()
            ->groupBy('point_id');

        $points = PointOfInterest::query()
            ->where('is_active', true)
            ->whereNotNull('lat')
            ->whereNotNull('lng')
            ->orderBy('title')
            ->limit(500)
            ->get()
            ->map(function (PointOfInterest $point) use ($tourGroups) {
                $group = $tourGroups->get($point->id, collect());
                $first = $group->first();

                return [
                    'point_id' => $point->id,
                    'title' => $first['title'] ?? $point->title,
                    'lat' => $point->lat,
                    'lng' => $point->lng,
                    'tours' => $group->map(fn ($item) => $item['tour'])->values(),
                ];
            })
            ->values();

        return response()->json([
            'points' => $points,
        ]);
    }

    public function tourMap(Request $request, string $slug): JsonResponse
    {
        $locale = Audio42Locale::fromRequest($request);

        $tour = Tour::query()
            ->with(['guide', 'tourPoints.point'])
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first();

        if (! $tour) {
            return response()->json([
                'message' => 'Карта экскурсии появится после публикации тура.',
            ], 404);
        }

        if (! Audio42Locale::isTourLocaleEnabled($tour, $locale)) {
            return response()->json([
                'message' => 'РљР°СЂС‚Р° С‚СѓСЂР° РЅРµРґРѕСЃС‚СѓРїРЅР° РґР»СЏ РІС‹Р±СЂР°РЅРЅРѕРіРѕ СЏР·С‹РєР°.',
            ], 404);
        }

        $tourLocale = Audio42Locale::isTourLocaleEnabled($tour, $locale) ? $locale : Audio42Locale::DEFAULT;
        $routePoints = $tour->tourPoints
            ->filter(fn ($tourPoint) => $tourPoint->point && $tourPoint->point->lat !== null && $tourPoint->point->lng !== null)
            ->sortBy('sort_order')
            ->values()
            ->map(fn ($tourPoint) => [
                'id' => $tourPoint->id,
                'title' => Audio42Locale::string($tourPoint, $tourLocale, 'title_override') ?: $tourPoint->point?->title,
                'sort_order' => $tourPoint->sort_order,
                'lat' => $tourPoint->point?->lat,
                'lng' => $tourPoint->point?->lng,
            ]);

        return response()->json([
            'tour' => [
                'id' => $tour->id,
                'slug' => $tour->slug,
                'title' => Audio42Locale::string($tour, $tourLocale, 'title'),
            ],
            'points' => $routePoints,
            'polyline' => $routePoints->map(fn ($point) => [$point['lat'], $point['lng']])->values(),
        ]);
    }
}
