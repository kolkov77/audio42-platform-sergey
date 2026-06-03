<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Models\AdBanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminAdBannerController extends Controller
{
    use AuthorizesBackofficeRoles;

    private const SLOTS_BY_PAGE = [
        'excursions' => ['block_start', 'block_middle', 'block_end', 'after_intro', 'after_second_card'],
        'tour' => ['block_start', 'block_middle', 'block_end', 'after_route'],
        'guide' => ['block_start', 'block_middle', 'block_end', 'after_hero'],
    ];

    public function index(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);

        return response()->json([
            'ad_banners' => AdBanner::query()
                ->orderByDesc('id')
                ->get()
                ->map(fn (AdBanner $banner) => $this->serializeBanner($banner)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->requireAnyRole($request, ['admin']);
        $validated = $this->validatePayload($request);

        $banner = AdBanner::query()->create([
            ...$validated,
            'is_active' => $validated['is_active'] ?? true,
            'created_by_user_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Баннер создан.',
            'ad_banner' => $this->serializeBanner($banner),
        ], 201);
    }

    public function update(Request $request, AdBanner $adBanner): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);
        $validated = $this->validatePayload($request, true);

        $nextPageKey = $validated['page_key'] ?? $adBanner->page_key;
        $nextSlotKey = $validated['slot_key'] ?? $adBanner->slot_key;
        $this->validateSlot($nextPageKey, $nextSlotKey);

        $adBanner->update($validated);

        return response()->json([
            'message' => 'Баннер обновлен.',
            'ad_banner' => $this->serializeBanner($adBanner->fresh()),
        ]);
    }

    public function destroy(Request $request, AdBanner $adBanner): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);

        $adBanner->delete();

        return response()->json([
            'message' => 'Баннер удален.',
            'ad_banner_id' => $adBanner->id,
        ]);
    }

    private function validatePayload(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';
        $validated = $request->validate([
            'name_internal' => [$required, 'string', 'max:255'],
            'page_key' => [$required, 'string', Rule::in(array_keys(self::SLOTS_BY_PAGE))],
            'slot_key' => [$required, 'string', 'max:64'],
            'image_url' => [$required, 'string', 'url', 'max:2048'],
            'target_url' => [$required, 'string', 'url', 'max:2048'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (isset($validated['page_key'], $validated['slot_key'])) {
            $this->validateSlot($validated['page_key'], $validated['slot_key']);
        }

        return $validated;
    }

    private function validateSlot(string $pageKey, string $slotKey): void
    {
        if (in_array($slotKey, self::SLOTS_BY_PAGE[$pageKey] ?? [], true)) {
            return;
        }

        throw ValidationException::withMessages([
            'slot_key' => ['Выберите место показа для выбранной страницы.'],
        ]);
    }

    private function serializeBanner(AdBanner $banner): array
    {
        return [
            'id' => $banner->id,
            'name_internal' => $banner->name_internal,
            'page_key' => $banner->page_key,
            'slot_key' => $banner->slot_key,
            'image_url' => $banner->image_url,
            'target_url' => $banner->target_url,
            'alt_text' => $banner->alt_text,
            'is_active' => (bool) $banner->is_active,
            'created_at' => optional($banner->created_at)?->toIso8601String(),
        ];
    }
}
