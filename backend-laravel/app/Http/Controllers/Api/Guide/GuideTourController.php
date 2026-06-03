<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\Tour;
use App\Support\Audio42Locale;
use App\Support\TourDuration;
use App\Support\TrackAudio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GuideTourController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $guide = $this->currentGuide($request);

        $tours = $guide->tours()
            ->withCount(['tourPoints', 'tracks'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (Tour $tour) => $this->serializeTour($tour));

        return response()->json([
            'guide' => [
                'id' => $guide->id,
                'display_name' => $guide->display_name,
            ],
            'tours' => $tours,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $guide = $this->currentGuide($request);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'price_rub' => ['required', 'numeric', 'min:0'],
            'short_description' => ['nullable', 'string', 'max:300'],
            'full_description' => ['nullable', 'string', 'max:1000'],
            'audience_description' => ['nullable', 'string', 'max:1000'],
            'duration_minutes' => ['nullable', 'integer', 'min:1'],
            'cover_image_url' => ['nullable', 'string', 'max:2048'],
            'gallery_json' => ['nullable', 'array', 'max:12'],
            'gallery_json.*' => ['nullable', 'string', 'max:2048'],
            'translation_json' => ['nullable', 'array'],
            'enabled_locales_json' => ['nullable', 'array', 'max:4'],
            'enabled_locales_json.*' => ['string', 'max:8'],
        ], [
            'title.required' => 'Укажите название тура.',
            'price_rub.required' => 'Укажите стоимость.',
            'short_description.max' => 'Краткое описание должно быть не длиннее 300 символов.',
            'full_description.max' => 'Подробное описание должно быть не длиннее 1000 символов.',
            'audience_description.max' => 'Поле "Для кого" должно быть не длиннее 1000 символов.',
        ]);

        $gallery = collect($validated['gallery_json'] ?? [])
            ->map(fn ($item) => trim((string) $item))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $tour = Tour::query()->create([
            'guide_id' => $guide->id,
            'slug' => $this->uniqueSlug($validated['title']),
            'title' => $validated['title'],
            'short_description' => $validated['short_description'] ?? null,
            'full_description' => $validated['full_description'] ?? null,
            'audience_description' => $validated['audience_description'] ?? null,
            'duration_minutes' => $validated['duration_minutes'] ?? null,
            'price_rub' => $validated['price_rub'],
            'cover_image_url' => $validated['cover_image_url'] ?? null,
            'gallery_json' => $gallery,
            'translation_json' => Audio42Locale::cleanTranslations($validated['translation_json'] ?? []),
            'enabled_locales_json' => Audio42Locale::tourLocales($validated['enabled_locales_json'] ?? []),
            'status' => 'draft',
        ]);

        return response()->json([
            'message' => 'Тур создан.',
            'tour' => $this->serializeTour($tour->loadCount(['tourPoints', 'tracks'])),
        ], 201);
    }

    public function show(Request $request, Tour $tour): JsonResponse
    {
        $guide = $this->currentGuide($request);
        abort_if($tour->guide_id !== $guide->id, 403, 'Нельзя просматривать чужой тур.');

        $tour->load([
            'tourPoints.point',
            'tracks.tourPoint.point',
        ])->loadCount(['tourPoints', 'tracks']);

        return response()->json([
            'guide' => [
                'id' => $guide->id,
                'display_name' => $guide->display_name,
            ],
            'tour' => array_merge($this->serializeTour($tour), [
                'cover_image_url' => $tour->cover_image_url,
                'gallery_image_urls' => $tour->gallery_json ?? [],
                'points' => $tour->tourPoints
                    ->sortBy('sort_order')
                    ->values()
                    ->map(fn (object $tourPoint) => $this->serializeTourPoint($tourPoint))
                    ->all(),
                'tracks' => $tour->tracks
                    ->sortBy('sort_order')
                    ->values()
                    ->map(fn (object $track) => $this->serializeTrack($track))
                    ->all(),
            ]),
        ]);
    }

    public function update(Request $request, Tour $tour): JsonResponse
    {
        $guide = $this->currentGuide($request);
        abort_if($tour->guide_id !== $guide->id, 403, 'Нельзя редактировать чужой тур.');

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'price_rub' => ['sometimes', 'required', 'numeric', 'min:0'],
            'short_description' => ['nullable', 'string', 'max:300'],
            'full_description' => ['nullable', 'string', 'max:1000'],
            'audience_description' => ['nullable', 'string', 'max:1000'],
            'duration_minutes' => ['nullable', 'integer', 'min:1'],
            'cover_image_url' => ['nullable', 'string', 'max:2048'],
            'gallery_json' => ['nullable', 'array', 'max:12'],
            'gallery_json.*' => ['nullable', 'string', 'max:2048'],
            'translation_json' => ['nullable', 'array'],
            'enabled_locales_json' => ['nullable', 'array', 'max:4'],
            'enabled_locales_json.*' => ['string', 'max:8'],
            'status' => ['sometimes', 'string', 'in:draft,published,archived'],
        ]);

        if (array_key_exists('gallery_json', $validated)) {
            $validated['gallery_json'] = collect($validated['gallery_json'] ?? [])
                ->map(fn ($item) => trim((string) $item))
                ->filter()
                ->unique()
                ->values()
                ->all();
        }

        if (array_key_exists('translation_json', $validated)) {
            $validated['translation_json'] = Audio42Locale::cleanTranslations($validated['translation_json'] ?? []);
        }

        if (array_key_exists('enabled_locales_json', $validated)) {
            $validated['enabled_locales_json'] = Audio42Locale::tourLocales($validated['enabled_locales_json'] ?? []);
        }

        if (array_key_exists('title', $validated) && $validated['title'] !== $tour->title) {
            $validated['slug'] = $this->uniqueSlug($validated['title'], $tour->id);
        }

        if (($validated['status'] ?? null) === 'published' && ! $tour->published_at) {
            $validated['published_at'] = now();
        }

        $tour->update($validated);

        return response()->json([
            'message' => 'Тур обновлён.',
            'tour' => $this->serializeTour($tour->fresh()->loadCount(['tourPoints', 'tracks'])),
        ]);
    }

    public function destroy(Request $request, Tour $tour): JsonResponse
    {
        $guide = $this->currentGuide($request);
        abort_if($tour->guide_id !== $guide->id, 403, 'Нельзя удалять чужой тур.');

        if ($tour->orderItems()->exists() || $tour->accessGrants()->exists()) {
            $tour->update([
                'status' => 'archived',
            ]);

            return response()->json([
                'message' => 'По туру уже есть продажи или доступы. Тур снят с публикации и переведён в архив.',
                'action' => 'archived',
                'tour_id' => $tour->id,
            ]);
        }

        $tour->tracks()->get()->each(fn ($track) => TrackAudio::deleteManagedFile($track->audio_url));
        $tour->tracks()->delete();
        $tour->tourPoints()->delete();
        $tourId = $tour->id;
        $tour->delete();

        return response()->json([
            'message' => 'Тур удалён.',
            'action' => 'deleted',
            'tour_id' => $tourId,
        ]);
    }

    private function currentGuide(Request $request): Guide
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();
        $guide = $user?->guide;

        abort_if(! $guide, 403, 'Доступ только для экскурсовода.');

        return $guide;
    }

    private function uniqueSlug(string $title, ?int $ignoreTourId = null): string
    {
        $base = Str::slug($title, '-');
        $base = $base !== '' ? $base : 'tour';
        $slug = $base;
        $index = 2;

        while (Tour::query()
            ->when($ignoreTourId, fn ($query) => $query->where('id', '!=', $ignoreTourId))
            ->where('slug', $slug)
            ->exists()) {
            $slug = $base.'-'.$index;
            $index++;
        }

        return $slug;
    }

    private function serializeTour(Tour $tour): array
    {
        return [
            'id' => $tour->id,
            'slug' => $tour->slug,
            'title' => $tour->title,
            'short_description' => $tour->short_description,
            'full_description' => $tour->full_description,
            'audience_description' => $tour->audience_description,
            'duration_minutes' => TourDuration::minutes($tour, publishedOnly: false, persistDetected: true),
            'price_rub' => (float) $tour->price_rub,
            'cover_image_url' => $tour->cover_image_url,
            'gallery_image_urls' => $tour->gallery_json ?? [],
            'translation_json' => $tour->translation_json ?? [],
            'enabled_locales' => Audio42Locale::tourLocales($tour->enabled_locales_json ?? []),
            'status' => $tour->status,
            'tour_points_count' => $tour->tour_points_count ?? 0,
            'tracks_count' => $tour->tracks_count ?? 0,
            'published_at' => optional($tour->published_at)->toIso8601String(),
        ];
    }

    private function serializeTourPoint(object $tourPoint): array
    {
        return [
            'id' => $tourPoint->id,
            'sort_order' => $tourPoint->sort_order,
            'title_override' => $tourPoint->title_override,
            'description_override' => $tourPoint->description_override,
            'gallery_image_urls' => $tourPoint->gallery_json ?? [],
            'gallery_captions' => $tourPoint->gallery_captions_json ?? [],
            'gallery_items' => method_exists($tourPoint, 'galleryItems') ? $tourPoint->galleryItems() : [],
            'translation_json' => $tourPoint->translation_json ?? [],
            'is_route_visible' => (bool) $tourPoint->is_route_visible,
            'point' => [
                'id' => $tourPoint->point?->id,
                'title' => $tourPoint->point?->title,
                'address_text' => $tourPoint->point?->address_text,
                'lat' => $tourPoint->point?->lat,
                'lng' => $tourPoint->point?->lng,
            ],
        ];
    }

    private function serializeTrack(object $track): array
    {
        $tourPointTitle = $track->tourPoint?->title_override ?: $track->tourPoint?->point?->title;

        return [
            'id' => $track->id,
            'title' => $tourPointTitle ?: $track->title,
            'description' => $track->description,
            'translation_json' => $track->translation_json ?? [],
            'audio_url' => TrackAudio::hasUsableAudio($track->audio_url) ? TrackAudio::internalStreamUrl($track) : null,
            'audio_file_name' => $track->audio_file_name ?: $this->fallbackAudioFileName($track->audio_url),
            'duration_seconds' => $track->duration_seconds,
            'sort_order' => $track->sort_order,
            'track_type' => $track->track_type ?: 'main',
            'is_demo' => (bool) $track->is_demo,
            'is_published' => (bool) $track->is_published,
            'tour_point_id' => $track->tour_point_id,
            'tour_point_title' => $tourPointTitle,
        ];
    }

    private function fallbackAudioFileName(?string $audioUrl): ?string
    {
        if (! $audioUrl || ! str_starts_with($audioUrl, TrackAudio::LEGACY_UPLOAD_PREFIX)) {
            return null;
        }

        return basename($audioUrl);
    }
}
