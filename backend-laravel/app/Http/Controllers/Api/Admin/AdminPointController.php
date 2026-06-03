<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Models\PointOfInterest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AdminPointController extends Controller
{
    use AuthorizesBackofficeRoles;

    public function index(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);

        $query = trim((string) $request->string('query'));

        $points = PointOfInterest::query()
            ->withCount(['tourPoints'])
            ->when($query !== '', function ($builder) use ($query): void {
                $this->applyTokenSearch($builder, $query, ['title', 'address_text', 'description', 'city']);
            })
            ->orderByDesc('id')
            ->limit(300)
            ->get()
            ->map(fn (PointOfInterest $point) => $this->serializePoint($point));

        return response()->json([
            'points' => $points,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);
        $validated = $this->validatePayload($request);

        $point = PointOfInterest::query()->create([
            'slug' => $this->uniquePointSlug($validated['title']),
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'city' => $validated['city'] ?? 'Кемерово',
            'address_text' => $validated['address_text'] ?? null,
            'lat' => $validated['lat'],
            'lng' => $validated['lng'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Точка создана.',
            'point' => $this->serializePoint($point->loadCount(['tourPoints'])),
        ], 201);
    }

    public function update(Request $request, PointOfInterest $point): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);
        $validated = $this->validatePayload($request, true);

        $point->update([
            'title' => $validated['title'] ?? $point->title,
            'description' => array_key_exists('description', $validated) ? ($validated['description'] ?: null) : $point->description,
            'city' => $validated['city'] ?? $point->city,
            'address_text' => array_key_exists('address_text', $validated) ? ($validated['address_text'] ?: null) : $point->address_text,
            'lat' => array_key_exists('lat', $validated) ? $validated['lat'] : $point->lat,
            'lng' => array_key_exists('lng', $validated) ? $validated['lng'] : $point->lng,
            'is_active' => $validated['is_active'] ?? $point->is_active,
        ]);

        return response()->json([
            'message' => 'Точка обновлена.',
            'point' => $this->serializePoint($point->fresh()->loadCount(['tourPoints'])),
        ]);
    }

    public function destroy(Request $request, PointOfInterest $point): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);
        $pointId = $point->id;

        if ($point->tourPoints()->exists()) {
            $point->update(['is_active' => false]);

            return response()->json([
                'message' => 'Точка уже используется в маршрутах, поэтому она скрыта из выбора, но не удалена физически.',
                'action' => 'disabled',
                'point_id' => $pointId,
            ]);
        }

        $point->delete();

        return response()->json([
            'message' => 'Точка удалена.',
            'action' => 'deleted',
            'point_id' => $pointId,
        ]);
    }

    private function validatePayload(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'city' => ['nullable', 'string', 'max:255'],
            'address_text' => ['nullable', 'string', 'max:255'],
            'lat' => [$required, 'numeric'],
            'lng' => [$required, 'numeric'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'title.required' => 'Укажите название точки.',
            'title.max' => 'Название точки должно быть не длиннее 255 символов.',
            'description.max' => 'Описание точки должно быть не длиннее 5000 символов.',
            'city.max' => 'Название города должно быть не длиннее 255 символов.',
            'address_text.max' => 'Адрес должен быть не длиннее 255 символов.',
            'lat.required' => 'Укажите координаты точки.',
            'lng.required' => 'Укажите координаты точки.',
            'lat.numeric' => 'Координаты должны быть числами.',
            'lng.numeric' => 'Координаты должны быть числами.',
        ]);
    }

    private function serializePoint(PointOfInterest $point): array
    {
        return [
            'id' => $point->id,
            'slug' => $point->slug,
            'title' => $point->title,
            'description' => $point->description,
            'city' => $point->city,
            'address_text' => $point->address_text,
            'lat' => $point->lat,
            'lng' => $point->lng,
            'is_active' => (bool) $point->is_active,
            'tour_points_count' => $point->tour_points_count ?? 0,
            'created_at' => optional($point->created_at)?->toIso8601String(),
        ];
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

    private function uniquePointSlug(string $title): string
    {
        $base = Str::slug($title, '-');
        $base = $base !== '' ? $base : 'point';
        $slug = $base;
        $index = 2;

        while (PointOfInterest::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$index;
            $index++;
        }

        return $slug;
    }
}
