<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Models\Tour;
use App\Support\Audio42Locale;
use App\Support\TourDuration;
use App\Support\TrackAudio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTourController extends Controller
{
    use AuthorizesBackofficeRoles;

    public function index(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin', 'accountant']);

        $tours = Tour::query()
            ->with(['guide'])
            ->withCount(['tourPoints', 'tracks'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (Tour $tour) => $this->serializeTour($tour));

        return response()->json([
            'tours' => $tours,
        ]);
    }

    public function update(Request $request, Tour $tour): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'short_description' => ['nullable', 'string', 'max:300'],
            'full_description' => ['nullable', 'string', 'max:1000'],
            'audience_description' => ['nullable', 'string', 'max:1000'],
            'duration_minutes' => ['nullable', 'integer', 'min:1'],
            'price_rub' => ['sometimes', 'required', 'numeric', 'min:0'],
            'cover_image_url' => ['nullable', 'string', 'max:2048'],
            'gallery_json' => ['nullable', 'array', 'max:12'],
            'gallery_json.*' => ['nullable', 'string', 'max:2048'],
            'translation_json' => ['nullable', 'array'],
            'enabled_locales_json' => ['nullable', 'array', 'max:4'],
            'enabled_locales_json.*' => ['string', 'max:8'],
            'status' => ['sometimes', 'required', 'string', 'in:draft,published,archived'],
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

        if (($validated['status'] ?? null) === 'published' && ! $tour->published_at) {
            $validated['published_at'] = now();
        }

        $tour->update($validated);

        return response()->json([
            'message' => 'Тур обновлён.',
            'tour' => $this->serializeTour($tour->fresh(['guide'])->loadCount(['tourPoints', 'tracks'])),
        ]);
    }

    public function destroy(Request $request, Tour $tour): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);

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
            'published_at' => optional($tour->published_at)?->toIso8601String(),
            'tour_points_count' => $tour->tour_points_count ?? 0,
            'tracks_count' => $tour->tracks_count ?? 0,
            'guide' => $tour->guide ? [
                'id' => $tour->guide->id,
                'slug' => $tour->guide->slug,
                'display_name' => $tour->guide->display_name,
            ] : null,
        ];
    }
}
