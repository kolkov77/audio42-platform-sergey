<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Models\PromoCode;
use App\Models\PromoCodeTour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminPromoCodeController extends Controller
{
    use AuthorizesBackofficeRoles;

    public function index(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin', 'accountant']);

        $promoCodes = PromoCode::query()
            ->with(['promoTours.tour'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (PromoCode $promoCode) => $this->serializePromoCode($promoCode));

        return response()->json([
            'promo_codes' => $promoCodes,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->requireAnyRole($request, ['admin']);
        $validated = $this->validatePayload($request);

        $promoCode = DB::transaction(function () use ($validated, $user) {
            $promoCode = PromoCode::query()->create([
                'name_internal' => $validated['name_internal'],
                'code' => mb_strtoupper(trim($validated['code'])),
                'discount_type' => $validated['discount_type'],
                'discount_value' => $validated['discount_value'],
                'starts_at' => $validated['starts_at'] ?? null,
                'ends_at' => $validated['ends_at'] ?? null,
                'scope_type' => $validated['scope_type'],
                'is_active' => $validated['is_active'] ?? true,
                'created_by_user_id' => $user->id,
            ]);

            foreach (($validated['tour_ids'] ?? []) as $tourId) {
                PromoCodeTour::query()->create([
                    'promo_code_id' => $promoCode->id,
                    'tour_id' => $tourId,
                ]);
            }

            return $promoCode->fresh(['promoTours.tour']);
        });

        return response()->json([
            'message' => 'Промокод создан.',
            'promo_code' => $this->serializePromoCode($promoCode),
        ], 201);
    }

    public function update(Request $request, PromoCode $promoCode): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);
        $validated = $this->validatePayload($request, $promoCode->id, true);

        DB::transaction(function () use ($validated, $promoCode): void {
            $promoCode->update([
                'name_internal' => $validated['name_internal'] ?? $promoCode->name_internal,
                'code' => array_key_exists('code', $validated) ? mb_strtoupper(trim($validated['code'])) : $promoCode->code,
                'discount_type' => $validated['discount_type'] ?? $promoCode->discount_type,
                'discount_value' => $validated['discount_value'] ?? $promoCode->discount_value,
                'starts_at' => $validated['starts_at'] ?? $promoCode->starts_at,
                'ends_at' => array_key_exists('ends_at', $validated) ? $validated['ends_at'] : $promoCode->ends_at,
                'scope_type' => $validated['scope_type'] ?? $promoCode->scope_type,
                'is_active' => $validated['is_active'] ?? $promoCode->is_active,
            ]);

            if (array_key_exists('tour_ids', $validated)) {
                PromoCodeTour::query()->where('promo_code_id', $promoCode->id)->delete();

                foreach ($validated['tour_ids'] as $tourId) {
                    PromoCodeTour::query()->create([
                        'promo_code_id' => $promoCode->id,
                        'tour_id' => $tourId,
                    ]);
                }
            }
        });

        return response()->json([
            'message' => 'Промокод обновлён.',
            'promo_code' => $this->serializePromoCode($promoCode->fresh(['promoTours.tour'])),
        ]);
    }

    private function validatePayload(Request $request, ?int $ignorePromoCodeId = null, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name_internal' => [$required, 'string', 'max:255'],
            'code' => [$required, 'string', 'max:255', Rule::unique('promo_codes', 'code')->ignore($ignorePromoCodeId)],
            'discount_type' => [$required, 'string', Rule::in(['fixed', 'percent', 'fixed_price'])],
            'discount_value' => [$required, 'numeric', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'scope_type' => [$required, 'string', Rule::in(['all_tours', 'selected_tours'])],
            'is_active' => ['nullable', 'boolean'],
            'tour_ids' => ['array'],
            'tour_ids.*' => ['integer', 'exists:tours,id'],
        ]);
    }

    private function serializePromoCode(PromoCode $promoCode): array
    {
        return [
            'id' => $promoCode->id,
            'name_internal' => $promoCode->name_internal,
            'code' => $promoCode->code,
            'discount_type' => $promoCode->discount_type,
            'discount_value' => (float) $promoCode->discount_value,
            'starts_at' => optional($promoCode->starts_at)?->toIso8601String(),
            'ends_at' => optional($promoCode->ends_at)?->toIso8601String(),
            'scope_type' => $promoCode->scope_type,
            'is_active' => (bool) $promoCode->is_active,
            'tour_ids' => $promoCode->promoTours->pluck('tour_id')->values(),
            'tours' => $promoCode->promoTours->map(fn ($promoTour) => [
                'id' => $promoTour->tour?->id,
                'title' => $promoTour->tour?->title,
                'slug' => $promoTour->tour?->slug,
            ])->values(),
        ];
    }
}
