<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessGrant;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CabinetController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $now = now();

        $activeAccesses = AccessGrant::query()
            ->with(['tour.guide', 'order'])
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('starts_at', '<=', $now)
            ->where('expires_at', '>', $now)
            ->orderBy('expires_at')
            ->get();

        $orders = Order::query()
            ->with(['items.tour.guide', 'payments', 'accessGrants.tour'])
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $paidOrders = $orders->where('status', 'paid');
        $totalSpentRub = (float) $paidOrders->sum('total_rub');

        return response()->json([
            'profile' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'email_verified' => $user->hasVerifiedEmail(),
                'phone_verified' => $user->phone_verified_at !== null,
                'last_login_at' => optional($user->last_login_at)?->toIso8601String(),
                'roles' => $user->roles()
                    ->orderBy('roles.id')
                    ->get(['roles.id', 'roles.slug', 'roles.name'])
                    ->map(fn ($role) => [
                        'id' => $role->id,
                        'slug' => $role->slug,
                        'name' => $role->name,
                    ])
                    ->values(),
                'guide' => $user->guide ? [
                    'id' => $user->guide->id,
                    'slug' => $user->guide->slug,
                    'display_name' => $user->guide->display_name,
                    'is_public' => (bool) $user->guide->is_public,
                ] : null,
            ],
            'summary' => [
                'orders_count' => (int) $orders->count(),
                'paid_orders_count' => (int) $paidOrders->count(),
                'active_access_count' => (int) $activeAccesses->count(),
                'total_spent_rub' => $totalSpentRub,
            ],
            'active_accesses' => $activeAccesses
                ->map(fn (AccessGrant $grant) => [
                    'id' => $grant->id,
                    'status' => $grant->status,
                    'starts_at' => $grant->starts_at?->toIso8601String(),
                    'expires_at' => $grant->expires_at?->toIso8601String(),
                    'tour' => $grant->tour ? [
                        'id' => $grant->tour->id,
                        'slug' => $grant->tour->slug,
                        'title' => $grant->tour->title,
                        'cover_image_url' => $grant->tour->cover_image_url,
                        'guide_name' => $grant->tour->guide?->display_name,
                    ] : null,
                    'order' => $grant->order ? [
                        'order_number' => $grant->order->order_number,
                    ] : null,
                ])
                ->values(),
            'orders' => $orders
                ->map(fn (Order $order) => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'subtotal_rub' => (float) $order->subtotal_rub,
                    'discount_rub' => (float) $order->discount_rub,
                    'total_rub' => (float) $order->total_rub,
                    'payment_provider' => $order->payment_provider,
                    'payment_method' => $order->payment_method,
                    'created_at' => optional($order->created_at)?->toIso8601String(),
                    'paid_at' => optional($order->paid_at)?->toIso8601String(),
                    'items' => $order->items->map(fn ($item) => [
                        'tour_id' => $item->tour_id,
                        'tour_slug' => $item->tour?->slug,
                        'title' => $item->title_snapshot,
                        'guide_name' => $item->tour?->guide?->display_name,
                        'final_price_rub' => (float) $item->final_price_rub,
                    ])->values(),
                    'access' => $order->accessGrants->map(fn ($grant) => [
                        'tour_id' => $grant->tour_id,
                        'tour_slug' => $grant->tour?->slug,
                        'tour_title' => $grant->tour?->title,
                        'starts_at' => $grant->starts_at?->toIso8601String(),
                        'expires_at' => $grant->expires_at?->toIso8601String(),
                        'status' => $grant->status,
                    ])->values(),
                ])
                ->values(),
        ]);
    }
}
