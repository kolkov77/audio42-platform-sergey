<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\PointOfInterest;
use App\Models\Tour;
use App\Models\TourPoint;
use App\Support\Audio42Locale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class GuidePointController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $this->currentGuide($request);
        $query = trim((string) $request->string('query'));

        $points = PointOfInterest::query()
            ->when($query !== '', function ($builder) use ($query): void {
                $this->applyTokenSearch($builder, $query, ['title', 'address_text', 'description']);
            })
            ->where('is_active', true)
            ->limit(300)
            ->get()
            ->map(fn (PointOfInterest $point) => [
                'id' => $point->id,
                'title' => $point->title,
                'address_text' => $point->address_text,
                'lat' => $point->lat,
                'lng' => $point->lng,
            ]);

        return response()->json([
            'points' => $points,
        ]);
    }

    public function store(Request $request, Tour $tour): JsonResponse
    {
        $guide = $this->currentGuide($request);
        abort_if($tour->guide_id !== $guide->id, 403, 'Нельзя редактировать чужой тур.');

        $validated = $request->validate([
            'point_id' => ['nullable', 'integer', 'exists:points_of_interest,id'],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'address_text' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'sort_order' => ['nullable', 'integer', 'min:1'],
            'title_override' => ['nullable', 'string', 'max:255'],
            'description_override' => ['nullable', 'string', 'max:1000'],
            'gallery_json' => ['nullable', 'array', 'max:12'],
            'gallery_json.*' => ['nullable', 'string', 'max:2048'],
            'gallery_captions_json' => ['nullable', 'array', 'max:12'],
            'gallery_captions_json.*' => ['nullable', 'string', 'max:100'],
            'translation_json' => ['nullable', 'array'],
            'is_route_visible' => ['nullable', 'boolean'],
        ]);

        abort_if(
            empty($validated['point_id']),
            422,
            'Выберите точку из общего справочника. Новые точки добавляет администратор.'
        );

        $point = PointOfInterest::query()
            ->where('is_active', true)
            ->findOrFail($validated['point_id']);

        $gallery = collect($validated['gallery_json'] ?? [])
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $captions = $this->normalizeCaptions($validated['gallery_captions_json'] ?? [], count($gallery));

        $tourPoint = TourPoint::query()->create([
            'tour_id' => $tour->id,
            'point_id' => $point->id,
            'title_override' => $validated['title_override'] ?? null,
            'description_override' => $validated['description_override'] ?? null,
            'gallery_json' => $gallery,
            'gallery_captions_json' => $captions,
            'translation_json' => Audio42Locale::cleanTranslations($validated['translation_json'] ?? []),
            'sort_order' => $validated['sort_order'] ?? ((int) $tour->tourPoints()->max('sort_order') + 1),
            'is_route_visible' => $validated['is_route_visible'] ?? true,
        ]);

        return response()->json([
            'message' => 'Точка добавлена в маршрут.',
            'tour_point' => [
                'id' => $tourPoint->id,
                'sort_order' => $tourPoint->sort_order,
                'point' => [
                    'id' => $point->id,
                    'title' => $point->title,
                    'address_text' => $point->address_text,
                    'lat' => $point->lat,
                    'lng' => $point->lng,
                ],
                'title_override' => $tourPoint->title_override,
                'description_override' => $tourPoint->description_override,
                'gallery_image_urls' => $tourPoint->gallery_json ?? [],
                'gallery_captions' => $tourPoint->gallery_captions_json ?? [],
                'gallery_items' => $tourPoint->galleryItems(),
                'translation_json' => $tourPoint->translation_json ?? [],
                'is_route_visible' => (bool) $tourPoint->is_route_visible,
            ],
        ], 201);
    }

    public function update(Request $request, Tour $tour, TourPoint $tourPoint): JsonResponse
    {
        $guide = $this->currentGuide($request);
        abort_if($tour->guide_id !== $guide->id, 403, 'Нельзя редактировать чужой тур.');
        abort_if($tourPoint->tour_id !== $tour->id, 404, 'Точка маршрута не относится к этому туру.');

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'address_text' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'title_override' => ['nullable', 'string', 'max:255'],
            'description_override' => ['nullable', 'string', 'max:1000'],
            'gallery_json' => ['nullable', 'array', 'max:12'],
            'gallery_json.*' => ['nullable', 'string', 'max:2048'],
            'gallery_captions_json' => ['nullable', 'array', 'max:12'],
            'gallery_captions_json.*' => ['nullable', 'string', 'max:100'],
            'translation_json' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:1'],
            'is_route_visible' => ['nullable', 'boolean'],
        ]);

        $gallery = array_key_exists('gallery_json', $validated)
            ? collect($validated['gallery_json'] ?? [])
                ->map(fn ($value) => trim((string) $value))
                ->filter()
                ->unique()
                ->values()
                ->all()
            : $tourPoint->gallery_json;

        $captions = array_key_exists('gallery_captions_json', $validated)
            ? $this->normalizeCaptions($validated['gallery_captions_json'] ?? [], count($gallery ?? []))
            : $this->normalizeCaptions($tourPoint->gallery_captions_json ?? [], count($gallery ?? []));

        $tourPoint->update([
            'title_override' => array_key_exists('title_override', $validated) ? ($validated['title_override'] ?: null) : $tourPoint->title_override,
            'description_override' => array_key_exists('description_override', $validated) ? ($validated['description_override'] ?: null) : $tourPoint->description_override,
            'gallery_json' => $gallery,
            'gallery_captions_json' => $captions,
            'translation_json' => array_key_exists('translation_json', $validated)
                ? Audio42Locale::cleanTranslations($validated['translation_json'] ?? [])
                : ($tourPoint->translation_json ?? []),
            'sort_order' => $validated['sort_order'] ?? $tourPoint->sort_order,
            'is_route_visible' => $validated['is_route_visible'] ?? $tourPoint->is_route_visible,
        ]);

        $tourPoint->load('point');
        $tourPoint->tracks()->update(['sort_order' => $tourPoint->sort_order]);

        return response()->json([
            'message' => 'Точка маршрута обновлена.',
            'tour_point' => [
                'id' => $tourPoint->id,
                'sort_order' => $tourPoint->sort_order,
                'point' => [
                    'id' => $tourPoint->point?->id,
                    'title' => $tourPoint->point?->title,
                    'address_text' => $tourPoint->point?->address_text,
                    'lat' => $tourPoint->point?->lat,
                    'lng' => $tourPoint->point?->lng,
                ],
                'title_override' => $tourPoint->title_override,
                'description_override' => $tourPoint->description_override,
                'gallery_image_urls' => $tourPoint->gallery_json ?? [],
                'gallery_captions' => $tourPoint->gallery_captions_json ?? [],
                'gallery_items' => $tourPoint->galleryItems(),
                'translation_json' => $tourPoint->translation_json ?? [],
                'is_route_visible' => $tourPoint->is_route_visible,
            ],
        ]);
    }

    public function destroy(Request $request, Tour $tour, TourPoint $tourPoint): JsonResponse
    {
        $guide = $this->currentGuide($request);
        abort_if($tour->guide_id !== $guide->id, 403, 'Нельзя редактировать чужой тур.');
        abort_if($tourPoint->tour_id !== $tour->id, 404, 'Точка маршрута не относится к этому туру.');

        $tourPoint->tracks()->update(['tour_point_id' => null]);
        $tourPoint->delete();

        return response()->json([
            'message' => 'Точка маршрута удалена. Привязанные треки сохранены без точки.',
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

    /**
     * @param array<int, string> $columns
     */
    private function applyTokenSearch($builder, string $query, array $columns): void
    {
        foreach ($this->searchTokens($query) as $token) {
            $variants = $this->searchTokenVariants($token);

            $builder->where(function ($nested) use ($columns, $variants): void {
                foreach ($columns as $column) {
                    foreach ($variants as $variant) {
                        $nested->orWhere($column, 'like', '%'.$variant.'%');
                    }
                }
            });
        }
    }

    /**
     * @return \Illuminate\Support\Collection<int, string>
     */
    private function searchTokens(string $query): Collection
    {
        return collect(preg_split('/[\s,.;:!?]+/u', $query) ?: [])
            ->map(fn ($token) => trim((string) $token))
            ->filter(fn ($token) => $token !== '')
            ->take(6)
            ->values();
    }

    /**
     * @return array<int, string>
     */
    private function searchTokenVariants(string $token): array
    {
        $normalized = mb_strtolower($token, 'UTF-8');
        $yoNormalized = str_replace('ё', 'е', $normalized);
        $withYo = str_replace('е', 'ё', $normalized);

        return collect([$token, $normalized, $yoNormalized, $withYo])
            ->flatMap(fn ($value) => [
                $value,
                mb_convert_case($value, MB_CASE_TITLE, 'UTF-8'),
                mb_strtoupper($value, 'UTF-8'),
            ])
            ->filter(fn ($value) => $value !== '')
            ->unique()
            ->values()
            ->all();
    }

    private function normalizeCaptions(array $captions, int $imageCount): array
    {
        return collect($captions)
            ->map(fn ($value) => trim((string) $value))
            ->take($imageCount)
            ->pad($imageCount, '')
            ->values()
            ->all();
    }
}
