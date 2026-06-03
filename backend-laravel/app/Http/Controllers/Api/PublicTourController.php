<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tour;
use App\Models\TourRating;
use App\Models\Track;
use App\Support\Audio42Locale;
use App\Support\GuideAudio;
use App\Support\TourDuration;
use App\Support\TourViewerAccess;
use App\Support\TrackAudio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicTourController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $locale = Audio42Locale::fromRequest($request);

        $tours = Tour::query()
            ->with([
                'guide',
                'tracks' => fn ($query) => $query
                    ->where('is_published', true)
                    ->orderBy('sort_order'),
            ])
            ->withCount('ratings')
            ->withAvg('ratings', 'rating')
            ->where('status', 'published')
            ->tap(fn ($query) => Audio42Locale::applyTourLocaleFilter($query, $locale))
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get()
            ->map(function (Tour $tour) use ($locale): array {
                $demoTrack = $tour->tracks->first(fn ($track) => $track->is_demo || $track->sort_order <= 3);
                $tourLocale = Audio42Locale::isTourLocaleEnabled($tour, $locale) ? $locale : Audio42Locale::DEFAULT;

                return [
                    'id' => $tour->id,
                    'slug' => $tour->slug,
                    'title' => Audio42Locale::string($tour, $tourLocale, 'title'),
                    'short_description' => Audio42Locale::string($tour, $tourLocale, 'short_description'),
                    'duration_minutes' => $this->durationMinutesForTour($tour),
                    'price_rub' => (float) $tour->price_rub,
                    'cover_image_url' => $tour->cover_image_url,
                    'gallery_image_urls' => $tour->gallery_json ?? [],
                    'enabled_locales' => Audio42Locale::tourLocales($tour->enabled_locales_json ?? []),
                    'active_locale' => $tourLocale,
                    'rating' => $this->ratingPayload($tour),
                    'guide' => [
                        'id' => $tour->guide?->id,
                        'slug' => $tour->guide?->slug,
                        'display_name' => $tour->guide?->display_name,
                        'about_audio_url' => $tour->guide && GuideAudio::hasUsableAudio($tour->guide->about_audio_url)
                            ? GuideAudio::publicStreamUrl($tour->guide)
                            : null,
                        'about_audio_file_name' => $tour->guide?->about_audio_file_name,
                    ],
                    'demo_track' => $demoTrack ? [
                        'id' => $demoTrack->id,
                        'title' => Audio42Locale::string($demoTrack, $tourLocale, 'title'),
                        'description' => Audio42Locale::string($demoTrack, $tourLocale, 'description'),
                        'audio_url' => $this->publicAudioUrl($demoTrack),
                    ] : null,
                ];
            });

        return response()->json([
            'tours' => $tours,
        ]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $locale = Audio42Locale::fromRequest($request);

        $tour = Tour::query()
            ->with([
                'guide',
                'tourPoints.point',
                'tracks' => fn ($query) => $query
                    ->where('is_published', true)
                    ->with('tourPoint')
                    ->orderBy('sort_order'),
            ])
            ->withCount('ratings')
            ->withAvg('ratings', 'rating')
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first();

        if (! $tour) {
            return response()->json([
                'message' => 'Экскурсия не найдена или ещё не опубликована.',
            ], 404);
        }

        if (! Audio42Locale::isTourLocaleEnabled($tour, $locale)) {
            return response()->json([
                'message' => 'Р­РєСЃРєСѓСЂСЃРёСЏ РЅРµРґРѕСЃС‚СѓРїРЅР° РґР»СЏ РІС‹Р±СЂР°РЅРЅРѕРіРѕ СЏР·С‹РєР°.',
            ], 404);
        }

        $tourLocale = Audio42Locale::isTourLocaleEnabled($tour, $locale) ? $locale : Audio42Locale::DEFAULT;
        $viewerAccess = TourViewerAccess::resolve($request, $tour);
        $isFreeTour = (float) $tour->price_rub <= 0;
        $hasActiveAccess = $isFreeTour || $viewerAccess !== null;
        $orderedTracks = $tour->tracks
            ->sortBy(fn ($track) => [
                $track->tourPoint?->sort_order ?? $track->sort_order,
                $track->sort_order,
                $track->id,
            ])
            ->values();

        return response()->json([
            'tour' => [
                'id' => $tour->id,
                'slug' => $tour->slug,
                'title' => Audio42Locale::string($tour, $tourLocale, 'title'),
                'short_description' => Audio42Locale::string($tour, $tourLocale, 'short_description'),
                'full_description' => Audio42Locale::string($tour, $tourLocale, 'full_description'),
                'audience_description' => Audio42Locale::string($tour, $tourLocale, 'audience_description'),
                'duration_minutes' => $this->durationMinutesForTour($tour),
                'price_rub' => (float) $tour->price_rub,
                'cover_image_url' => $tour->cover_image_url,
                'gallery_image_urls' => $tour->gallery_json ?? [],
                'enabled_locales' => Audio42Locale::tourLocales($tour->enabled_locales_json ?? []),
                'active_locale' => $tourLocale,
                'rating' => $this->ratingPayload($tour),
                'user_rating' => $this->viewerRating($request, $tour),
                'guide' => [
                    'id' => $tour->guide?->id,
                    'slug' => $tour->guide?->slug,
                    'display_name' => $tour->guide?->display_name,
                    'headline' => $tour->guide ? Audio42Locale::string($tour->guide, $tourLocale, 'headline') : null,
                    'bio' => $tour->guide ? Audio42Locale::string($tour->guide, $tourLocale, 'bio') : null,
                    'photo_url' => $tour->guide?->photo_url,
                    'about_audio_url' => $tour->guide && GuideAudio::hasUsableAudio($tour->guide->about_audio_url)
                        ? GuideAudio::publicStreamUrl($tour->guide)
                        : null,
                    'about_audio_file_name' => $tour->guide?->about_audio_file_name,
                    'website_url' => $tour->guide?->website_url,
                    'social_links' => $tour->guide?->social_links_json ?? [],
                    'trust_points' => $tour->guide
                        ? Audio42Locale::array($tour->guide, $tourLocale, 'trust_points', $tour->guide->trust_points_json ?? [])
                        : [],
                ],
                'viewer_access' => $viewerAccess,
                'points' => $tour->tourPoints->map(fn ($tourPoint) => [
                    'id' => $tourPoint->id,
                    'sort_order' => $tourPoint->sort_order,
                    'title' => Audio42Locale::string($tourPoint, $tourLocale, 'title_override') ?: $tourPoint->point?->title,
                    'description' => Audio42Locale::string($tourPoint, $tourLocale, 'description_override'),
                    'lat' => $tourPoint->point?->lat,
                    'lng' => $tourPoint->point?->lng,
                    'gallery_image_urls' => $tourPoint->gallery_json ?? [],
                    'gallery_captions' => Audio42Locale::array($tourPoint, $tourLocale, 'gallery_captions', $tourPoint->gallery_captions_json ?? []),
                    'gallery_items' => $this->localizedGalleryItems($tourPoint, $tourLocale),
                ])->values(),
                'tracks' => $orderedTracks->map(function ($track) use ($hasActiveAccess, $tourLocale) {
                    $isDemo = $track->is_demo || $track->sort_order <= 3;
                    $isAccessible = $isDemo || $hasActiveAccess;
                    $tourPointTitle = $track->tourPoint
                        ? (Audio42Locale::string($track->tourPoint, $tourLocale, 'title_override') ?: $track->tourPoint?->point?->title)
                        : null;
                    $tourPointDescription = $track->tourPoint
                        ? Audio42Locale::string($track->tourPoint, $tourLocale, 'description_override')
                        : null;

                    return [
                        'id' => $track->id,
                        'title' => $tourPointTitle ?: Audio42Locale::string($track, $tourLocale, 'title'),
                        'description' => Audio42Locale::string($track, $tourLocale, 'description') ?: $tourPointDescription,
                        'is_demo' => $isDemo,
                        'is_accessible' => $isAccessible,
                        'sort_order' => $track->sort_order,
                        'track_type' => $track->track_type ?: 'main',
                        'tour_point_id' => $track->tour_point_id,
                        'gallery_image_urls' => $track->tourPoint?->gallery_json ?? [],
                        'gallery_captions' => $track->tourPoint
                            ? Audio42Locale::array($track->tourPoint, $tourLocale, 'gallery_captions', $track->tourPoint->gallery_captions_json ?? [])
                            : [],
                        'gallery_items' => $track->tourPoint ? $this->localizedGalleryItems($track->tourPoint, $tourLocale) : [],
                        'audio_url' => $isAccessible ? $this->publicAudioUrl($track) : null,
                    ];
                })->values(),
            ],
        ]);
    }

    private function publicAudioUrl(Track $track): ?string
    {
        if (! TrackAudio::hasUsableAudio($track->audio_url)) {
            return null;
        }

        return TrackAudio::publicStreamUrl($track);
    }

    private function durationMinutesForTour(Tour $tour): ?int
    {
        return TourDuration::minutes($tour, publishedOnly: true, persistDetected: true);
    }

    private function ratingPayload(Tour $tour): array
    {
        return [
            'average' => $tour->ratings_avg_rating !== null ? round((float) $tour->ratings_avg_rating, 1) : null,
            'count' => $tour->ratings_count ?? 0,
        ];
    }

    private function viewerRating(Request $request, Tour $tour): ?int
    {
        $user = $request->user();
        $raterKey = $user ? 'user:'.$user->id : null;

        if (! $raterKey && $request->session()->has('tour_rating_key')) {
            $raterKey = 'guest:'.$request->session()->get('tour_rating_key');
        }

        if (! $raterKey) {
            return null;
        }

        $rating = TourRating::query()
            ->where('tour_id', $tour->id)
            ->where('rater_key', $raterKey)
            ->value('rating');

        return $rating !== null ? (int) $rating : null;
    }

    private function localizedGalleryItems(object $tourPoint, string $locale): array
    {
        $items = $tourPoint->galleryItems();
        $captions = Audio42Locale::array($tourPoint, $locale, 'gallery_captions', $tourPoint->gallery_captions_json ?? []);

        return collect($items)
            ->map(function ($item, $index) use ($captions) {
                $item['caption'] = ($captions[$index] ?? $item['caption'] ?? null) ?: null;

                return $item;
            })
            ->values()
            ->all();
    }
}
