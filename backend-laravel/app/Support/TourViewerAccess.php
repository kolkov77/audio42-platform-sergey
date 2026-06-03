<?php

namespace App\Support;

use App\Models\AccessGrant;
use App\Models\Tour;
use Illuminate\Http\Request;

class TourViewerAccess
{
    public static function resolve(Request $request, Tour $tour): ?array
    {
        $user = $request->user();

        if ($user) {
            $grant = AccessGrant::query()
                ->where('user_id', $user->id)
                ->where('tour_id', $tour->id)
                ->where('status', 'active')
                ->where('starts_at', '<=', now())
                ->where('expires_at', '>', now())
                ->orderByDesc('expires_at')
                ->first();

            if ($grant) {
                return self::serializeGrant($grant);
            }
        }

        $orderNumbers = $request->session()->get('checkout_order_numbers', []);

        if ($orderNumbers === []) {
            return null;
        }

        $grant = AccessGrant::query()
            ->whereHas('order', fn ($query) => $query->whereIn('order_number', $orderNumbers))
            ->where('tour_id', $tour->id)
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>', now())
            ->orderByDesc('expires_at')
            ->first();

        return $grant ? self::serializeGrant($grant) : null;
    }

    private static function serializeGrant(AccessGrant $grant): array
    {
        return [
            'is_active' => true,
            'status' => $grant->status,
            'starts_at' => $grant->starts_at?->toIso8601String(),
            'expires_at' => $grant->expires_at?->toIso8601String(),
        ];
    }
}
