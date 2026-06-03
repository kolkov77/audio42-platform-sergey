<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessGrant;
use App\Models\Guide;
use App\Models\Tour;
use App\Support\Audio42Locale;
use App\Support\GuideAudio;
use App\Support\TourDuration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicGuideController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $locale = Audio42Locale::fromRequest($request);

        $guides = Guide::query()
            ->with([
                'tours' => fn ($query) => $query
                    ->where('status', 'published')
                    ->tap(fn ($query) => Audio42Locale::applyTourLocaleFilter($query, $locale))
                    ->withCount('ratings')
                    ->withAvg('ratings', 'rating')
                    ->orderByDesc('published_at')
                    ->orderByDesc('id'),
            ])
            ->where('is_public', true)
            ->get()
            ->map(fn (Guide $guide) => $this->serializeGuideSummary($guide, $locale));

        return response()->json([
            'guides' => $guides,
        ]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $locale = Audio42Locale::fromRequest($request);

        $guide = Guide::query()
            ->with([
                'tours' => fn ($query) => $query
                    ->where('status', 'published')
                    ->tap(fn ($query) => Audio42Locale::applyTourLocaleFilter($query, $locale))
                    ->withCount('ratings')
                    ->withAvg('ratings', 'rating')
                    ->orderByDesc('published_at')
                    ->orderByDesc('id'),
            ])
            ->where('slug', $slug)
            ->where('is_public', true)
            ->first();

        if (! $guide) {
            return response()->json([
                'message' => 'Экскурсовод не найден или профиль пока не опубликован.',
            ], 404);
        }

        $viewerAccessByTourId = $this->viewerAccessByTourId($request, $guide->tours->pluck('id')->all());

        return response()->json([
            'guide' => [
                'id' => $guide->id,
                'slug' => $guide->slug,
                'display_name' => $guide->display_name,
                'headline' => Audio42Locale::string($guide, $locale, 'headline'),
                'bio' => Audio42Locale::string($guide, $locale, 'bio'),
                'photo_url' => $guide->photo_url,
                'about_audio_url' => GuideAudio::hasUsableAudio($guide->about_audio_url) ? GuideAudio::publicStreamUrl($guide) : null,
                'about_audio_file_name' => $guide->about_audio_file_name,
                'website_url' => $guide->website_url,
                'social_links' => $guide->social_links_json ?? [],
                'trust_points' => Audio42Locale::array($guide, $locale, 'trust_points', $guide->trust_points_json ?? []),
                'viewer_accesses' => array_values($viewerAccessByTourId),
                'tours' => $guide->tours
                    ->map(fn (Tour $tour) => $this->serializeTourCard($tour, $locale, false, $viewerAccessByTourId[$tour->id] ?? null))
                    ->values(),
            ],
        ]);
    }

    private function serializeGuideSummary(Guide $guide, string $locale): array
    {
        return [
            'id' => $guide->id,
            'slug' => $guide->slug,
            'display_name' => $guide->display_name,
            'headline' => Audio42Locale::string($guide, $locale, 'headline'),
            'bio' => Audio42Locale::string($guide, $locale, 'bio'),
            'photo_url' => $guide->photo_url,
            'about_audio_url' => GuideAudio::hasUsableAudio($guide->about_audio_url) ? GuideAudio::publicStreamUrl($guide) : null,
            'about_audio_file_name' => $guide->about_audio_file_name,
            'website_url' => $guide->website_url,
            'trust_points' => Audio42Locale::array($guide, $locale, 'trust_points', $guide->trust_points_json ?? []),
            'tours' => $guide->tours
                ->map(fn (Tour $tour) => $this->serializeTourCard($tour, $locale, false))
                ->values(),
        ];
    }

    private function serializeTourCard(Tour $tour, string $locale, bool $withGuide = true, ?array $viewerAccess = null): array
    {
        $tourLocale = Audio42Locale::isTourLocaleEnabled($tour, $locale) ? $locale : Audio42Locale::DEFAULT;

        $payload = [
            'id' => $tour->id,
            'slug' => $tour->slug,
            'title' => Audio42Locale::string($tour, $tourLocale, 'title'),
            'short_description' => Audio42Locale::string($tour, $tourLocale, 'short_description'),
            'duration_minutes' => $this->durationMinutesForTour($tour),
            'price_rub' => (float) $tour->price_rub,
            'cover_image_url' => $tour->cover_image_url,
            'enabled_locales' => Audio42Locale::tourLocales($tour->enabled_locales_json ?? []),
            'active_locale' => $tourLocale,
            'rating' => [
                'average' => $tour->ratings_avg_rating !== null ? round((float) $tour->ratings_avg_rating, 1) : null,
                'count' => $tour->ratings_count ?? 0,
            ],
            'viewer_access' => $viewerAccess,
        ];

        if ($withGuide) {
            $payload['guide'] = [
                'id' => $tour->guide?->id,
                'display_name' => $tour->guide?->display_name,
            ];
        }

        return $payload;
    }

    private function viewerAccessByTourId(Request $request, array $tourIds): array
    {
        $user = $request->user();

        if ($tourIds === []) {
            return [];
        }

        $query = AccessGrant::query()
            ->with('tour')
            ->whereIn('tour_id', $tourIds)
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>', now())
            ->orderBy('expires_at');

        if ($user) {
            $query->where('user_id', $user->id);
        } else {
            $orderNumbers = $request->session()->get('checkout_order_numbers', []);

            if ($orderNumbers === []) {
                return [];
            }

            $query->whereHas('order', fn ($orderQuery) => $orderQuery->whereIn('order_number', $orderNumbers));
        }

        return $query->get()
            ->mapWithKeys(fn (AccessGrant $grant) => [
                $grant->tour_id => [
                    'tour_id' => $grant->tour_id,
                    'tour_slug' => $grant->tour?->slug,
                    'tour_title' => $grant->tour?->title,
                    'starts_at' => $grant->starts_at?->toIso8601String(),
                    'expires_at' => $grant->expires_at?->toIso8601String(),
                    'status' => $grant->status,
                    'is_active' => true,
                ],
            ])
            ->all();
    }

    private function durationMinutesForTour(Tour $tour): ?int
    {
        return TourDuration::minutes($tour, publishedOnly: true, persistDetected: true);
    }
}
