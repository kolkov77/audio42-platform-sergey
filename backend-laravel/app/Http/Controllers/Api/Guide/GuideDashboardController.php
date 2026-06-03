<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\GuidePayout;
use App\Models\OrderItem;
use App\Models\Track;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuideDashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $guide = $this->currentGuide($request);
        $tourIds = $guide->tours()->pluck('id');
        $salesItems = $this->paidItemsQuery($tourIds)->get();
        $salesRub = (float) $salesItems->sum('final_price_rub');
        $rewardRub = $guide->rewardRub($salesRub);
        $payoutsRub = round((float) $guide->payouts()->sum('amount_rub'), 2);
        $balanceRub = round($rewardRub - $payoutsRub, 2);

        return response()->json([
            'guide' => [
                'id' => $guide->id,
                'display_name' => $guide->display_name,
            ],
            'summary' => [
                'tours_count' => (int) $guide->tours()->count(),
                'tracks_count' => (int) Track::query()->whereIn('tour_id', $tourIds)->count(),
                'sales_rub' => $salesRub,
                'reward_rub' => $rewardRub,
                'reward_percent' => $guide->rewardPercent(),
                'payouts_rub' => $payoutsRub,
                'balance_rub' => $balanceRub,
                'withdrawal_threshold_rub' => 10000.0,
                'eligible_for_withdrawal' => $balanceRub >= 10000,
            ],
        ]);
    }

    public function dynamics(Request $request): JsonResponse
    {
        $guide = $this->currentGuide($request);
        $tourIds = $guide->tours()->pluck('id');
        $dateFrom = $request->date('date_from') ?? now()->subDays(30)->startOfDay();
        $dateTo = $request->date('date_to') ?? now()->endOfDay();

        $items = $this->paidItemsQuery($tourIds)
            ->whereHas('order', function ($query) use ($dateFrom, $dateTo): void {
                $query->whereBetween('paid_at', [$dateFrom, $dateTo]);
            })
            ->get();

        $grouped = $items
            ->groupBy(fn (OrderItem $item) => optional($item->order?->paid_at)->toDateString() ?? optional($item->created_at)->toDateString())
            ->map(function ($group, string $date) use ($guide): array {
                $salesRub = (float) $group->sum('final_price_rub');

                return [
                    'date' => $date,
                    'orders_count' => $group->count(),
                    'sales_rub' => $salesRub,
                    'reward_rub' => $guide->rewardRub($salesRub),
                ];
            })
            ->sortKeys()
            ->values();

        return response()->json([
            'guide_id' => $guide->id,
            'date_from' => $dateFrom->toDateString(),
            'date_to' => $dateTo->toDateString(),
            'rows' => $grouped,
        ]);
    }

    public function salesTable(Request $request): JsonResponse
    {
        $guide = $this->currentGuide($request);
        $tourIds = $guide->tours()->pluck('id');
        $dateFrom = $request->date('date_from');
        $dateTo = $request->date('date_to');

        $query = $this->paidItemsQuery($tourIds)->with(['tour', 'order']);

        if ($dateFrom && $dateTo) {
            $query->whereHas('order', function ($orderQuery) use ($dateFrom, $dateTo): void {
                $orderQuery->whereBetween('paid_at', [$dateFrom, $dateTo]);
            });
        }

        $rows = $query
            ->orderByDesc('id')
            ->get()
            ->map(function (OrderItem $item): array {
                return [
                    'order_number' => $item->order?->order_number,
                    'paid_at' => optional($item->order?->paid_at)->toIso8601String(),
                    'tour_id' => $item->tour_id,
                    'tour_title' => $item->title_snapshot ?: $item->tour?->title,
                    'unit_price_rub' => (float) $item->unit_price_rub,
                    'discount_rub' => (float) $item->discount_rub,
                    'final_price_rub' => (float) $item->final_price_rub,
                ];
            });

        return response()->json([
            'guide_id' => $guide->id,
            'rows' => $rows,
        ]);
    }

    public function settlements(Request $request): JsonResponse
    {
        $guide = $this->currentGuide($request);
        $tourIds = $guide->tours()->pluck('id');
        $dateFrom = $request->date('date_from') ?? now()->startOfMonth();
        $dateTo = $request->date('date_to') ?? now()->endOfMonth();

        $items = $this->paidItemsQuery($tourIds)
            ->whereHas('order', function ($query) use ($dateFrom, $dateTo): void {
                $query->whereBetween('paid_at', [$dateFrom, $dateTo]);
            })
            ->get();

        $salesRub = (float) $items->sum('final_price_rub');
        $rewardRub = $guide->rewardRub($salesRub);
        $payoutEntries = $guide->payouts()
            ->whereBetween('paid_on', [$dateFrom->toDateString(), $dateTo->toDateString()])
            ->get();
        $payoutsRub = round((float) $payoutEntries->sum('amount_rub'), 2);
        $balanceRub = round($rewardRub - $payoutsRub, 2);

        return response()->json([
            'guide' => [
                'id' => $guide->id,
                'display_name' => $guide->display_name,
            ],
            'period' => [
                'from' => $dateFrom->toDateString(),
                'to' => $dateTo->toDateString(),
            ],
            'statement' => [
                'sales_rub' => $salesRub,
                'reward_percent' => $guide->rewardPercent(),
                'reward_rub' => $rewardRub,
                'payouts_rub' => $payoutsRub,
                'balance_rub' => $balanceRub,
                'withdrawal_threshold_rub' => 10000.0,
                'eligible_for_withdrawal' => $balanceRub >= 10000,
                'manual_payout_entries_pending' => $payoutEntries->isEmpty(),
                'payout_entries' => $payoutEntries->map(fn (GuidePayout $payout) => [
                    'id' => $payout->id,
                    'paid_on' => optional($payout->paid_on)?->toDateString(),
                    'amount_rub' => (float) $payout->amount_rub,
                    'comment' => $payout->comment,
                ])->values(),
            ],
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

    private function paidItemsQuery($tourIds)
    {
        return OrderItem::query()
            ->whereIn('tour_id', $tourIds)
            ->whereHas('order', function ($query): void {
                $query->where('status', 'paid')
                    ->whereNotNull('paid_at');
            });
    }
}
