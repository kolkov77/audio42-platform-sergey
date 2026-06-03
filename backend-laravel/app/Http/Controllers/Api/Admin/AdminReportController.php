<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\GuidePayout;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PageView;
use App\Models\Payment;
use App\Models\Tour;
use App\Services\TBankEacqService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminReportController extends Controller
{
    use AuthorizesBackofficeRoles;

    public function __construct(private readonly TBankEacqService $tbank)
    {
    }

    public function dynamics(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin', 'accountant']);

        $filters = $this->extractFilters($request);
        $items = $this->filteredPaidItems($filters)->get();
        $pageViews = $this->filteredPageViews($filters)->get();

        $salesRows = $items
            ->groupBy(fn (OrderItem $item) => optional($item->order?->paid_at)->toDateString() ?? optional($item->created_at)->toDateString())
            ->map(function ($group): array {
                $salesRub = (float) $group->sum('final_price_rub');

                return [
                    'orders_count' => $group->count(),
                    'sales_rub' => $salesRub,
                ];
            });

        $trafficRows = $pageViews
            ->groupBy(fn (PageView $pageView) => optional($pageView->viewed_at)->toDateString() ?? optional($pageView->created_at)->toDateString())
            ->map(fn ($group): array => [
                'visits_count' => $group->count(),
                'entry_points_count' => $group->where('is_entry', true)->count(),
            ]);

        $allDates = $salesRows->keys()
            ->merge($trafficRows->keys())
            ->unique()
            ->sort()
            ->values();

        $rows = $allDates->map(function (string $date) use ($salesRows, $trafficRows): array {
            $sales = $salesRows->get($date, [
                'orders_count' => 0,
                'sales_rub' => 0.0,
            ]);
            $traffic = $trafficRows->get($date, [
                'visits_count' => 0,
                'entry_points_count' => 0,
            ]);

            return [
                'date' => $date,
                'orders_count' => (int) $sales['orders_count'],
                'sales_rub' => (float) $sales['sales_rub'],
                'visits_count' => (int) $traffic['visits_count'],
                'entry_points_count' => (int) $traffic['entry_points_count'],
            ];
        })->values();

        $topEntrySources = $this->filteredPageViews($filters)
            ->where('is_entry', true)
            ->selectRaw('COALESCE(source_label, "direct") as source_label, COUNT(*) as hits')
            ->groupBy('source_label')
            ->orderByDesc('hits')
            ->limit(5)
            ->get()
            ->map(fn (PageView $row) => [
                'label' => $row->source_label ?: 'direct',
                'hits' => (int) $row->hits,
            ])
            ->values();

        return response()->json([
            'filters' => $filters,
            'rows' => $rows,
            'top_entry_sources' => $topEntrySources,
        ]);
    }

    public function salesTable(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin', 'accountant']);

        $filters = $this->extractFilters($request);
        $rows = $this->filteredPaidItems($filters)
            ->get()
            ->map(function (OrderItem $item): array {
                $latestPayment = $item->order?->payments?->sortByDesc('id')->first();

                return [
                    'order_number' => $item->order?->order_number,
                    'order_status' => $item->order?->status,
                    'paid_at' => optional($item->order?->paid_at)->toIso8601String(),
                    'tour_id' => $item->tour_id,
                    'tour_title' => $item->title_snapshot ?: $item->tour?->title,
                    'guide_id' => $item->tour?->guide?->id,
                    'guide_name' => $item->tour?->guide?->display_name,
                    'unit_price_rub' => (float) $item->unit_price_rub,
                    'discount_rub' => (float) $item->discount_rub,
                    'final_price_rub' => (float) $item->final_price_rub,
                    'payment_status' => $latestPayment?->provider_status,
                ];
            })
            ->values();

        return response()->json([
            'filters' => $filters,
            'rows' => $rows,
        ]);
    }

    public function settlements(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin', 'accountant']);

        $validated = $request->validate([
            'guide_id' => ['nullable', 'integer', 'exists:guides,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);

        $dateFrom = $request->date('date_from') ?? now()->startOfMonth();
        $dateTo = $request->date('date_to') ?? now()->endOfMonth();
        $dateFromAt = $dateFrom->copy()->startOfDay();
        $dateToAt = $dateTo->copy()->endOfDay();

        $guides = Guide::query()
            ->when($validated['guide_id'] ?? null, fn ($query, $guideId) => $query->where('id', $guideId))
            ->with(['payouts' => fn ($query) => $query
                ->whereBetween('paid_on', [$dateFrom->toDateString(), $dateTo->toDateString()])
                ->orderByDesc('paid_on')
                ->orderByDesc('id')])
            ->orderBy('display_name')
            ->get();

        $rows = $guides->map(function (Guide $guide) use ($dateFromAt, $dateToAt): array {
            $salesRub = (float) OrderItem::query()
                ->whereHas('order', fn ($query) => $query
                    ->where('status', 'paid')
                    ->whereBetween('paid_at', [$dateFromAt, $dateToAt]))
                ->whereHas('tour', fn ($query) => $query->where('guide_id', $guide->id))
                ->sum('final_price_rub');

            $rewardRub = $guide->rewardRub($salesRub);
            $payoutsRub = round((float) $guide->payouts->sum('amount_rub'), 2);
            $balanceRub = round($rewardRub - $payoutsRub, 2);

            return [
                'guide_id' => $guide->id,
                'guide_name' => $guide->display_name,
                'sales_rub' => $salesRub,
                'reward_percent' => $guide->rewardPercent(),
                'reward_rub' => $rewardRub,
                'payouts_rub' => $payoutsRub,
                'balance_rub' => $balanceRub,
                'eligible_for_withdrawal' => $balanceRub >= 10000,
                'manual_payout_entries_pending' => $guide->payouts->isEmpty(),
                'payout_entries' => $guide->payouts->map(fn (GuidePayout $payout) => [
                    'id' => $payout->id,
                    'paid_on' => optional($payout->paid_on)?->toDateString(),
                    'amount_rub' => (float) $payout->amount_rub,
                    'comment' => $payout->comment,
                    'recorded_by' => $payout->recordedBy?->name,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'period' => [
                'from' => $dateFrom->toDateString(),
                'to' => $dateTo->toDateString(),
            ],
            'rows' => $rows,
        ]);
    }

    public function storePayout(Request $request): JsonResponse
    {
        $user = $this->requireAnyRole($request, ['admin', 'accountant']);

        $validated = $request->validate([
            'guide_id' => ['required', 'integer', 'exists:guides,id'],
            'paid_on' => ['required', 'date'],
            'amount_rub' => ['required', 'numeric', 'gt:0'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ], [
            'guide_id.required' => 'Выберите экскурсовода.',
            'paid_on.required' => 'Укажите дату выплаты.',
            'amount_rub.required' => 'Укажите сумму выплаты.',
            'amount_rub.gt' => 'Сумма выплаты должна быть больше нуля.',
        ]);

        $payout = GuidePayout::query()->create([
            'guide_id' => $validated['guide_id'],
            'recorded_by_user_id' => $user->id,
            'paid_on' => $validated['paid_on'],
            'amount_rub' => $validated['amount_rub'],
            'comment' => $validated['comment'] ?? null,
        ]);

        return response()->json([
            'message' => 'Выплата сохранена.',
            'payout' => [
                'id' => $payout->id,
                'guide_id' => $payout->guide_id,
                'paid_on' => optional($payout->paid_on)?->toDateString(),
                'amount_rub' => (float) $payout->amount_rub,
                'comment' => $payout->comment,
            ],
        ], 201);
    }

    public function refundOrder(Request $request, string $orderNumber): JsonResponse
    {
        $this->requireAnyRole($request, ['admin', 'accountant']);

        $order = Order::query()
            ->with(['payments', 'items', 'accessGrants'])
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        if ($order->payment_provider !== 'tbank') {
            throw ValidationException::withMessages([
                'order' => ['Возврат доступен только для заказов T-Bank.'],
            ]);
        }

        if ($order->status !== 'paid') {
            throw ValidationException::withMessages([
                'order' => ['Возврат можно оформить только для оплаченного заказа.'],
            ]);
        }

        $payment = $order->payments
            ->sortByDesc('id')
            ->first(fn (Payment $candidate) => $candidate->provider_payment_id);

        if (! $payment?->provider_payment_id) {
            throw ValidationException::withMessages([
                'order' => ['У заказа не найден payment id для возврата.'],
            ]);
        }

        $cancelResponse = $this->tbank->cancelPayment(
            (string) $payment->provider_payment_id,
            (int) round((float) $order->total_rub * 100),
        );

        $paymentState = $this->tbank->getState((string) $payment->provider_payment_id);
        $status = (string) ($paymentState['Status'] ?? $cancelResponse['Status'] ?? '');

        $this->synchronizeOrderPayment($order, $paymentState, $status, 'tbank');
        $order->refresh()->load(['payments', 'accessGrants']);

        return response()->json([
            'message' => 'Возврат оформлен.',
            'order' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_provider' => $order->payment_provider,
                'payment_status' => $order->payments->sortByDesc('id')->first()?->provider_status,
                'access_statuses' => $order->accessGrants->pluck('status')->values(),
            ],
        ]);
    }

    private function extractFilters(Request $request): array
    {
        $request->validate([
            'tour_id' => ['nullable', 'integer', 'exists:tours,id'],
            'guide_id' => ['nullable', 'integer', 'exists:guides,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);

        $dateFrom = $request->date('date_from') ?? now()->subDays(30)->startOfDay();
        $dateTo = $request->date('date_to') ?? now()->endOfDay();

        return [
            'tour_id' => $request->integer('tour_id') ?: null,
            'guide_id' => $request->integer('guide_id') ?: null,
            'date_from' => $dateFrom->toDateString(),
            'date_to' => $dateTo->toDateString(),
            'date_from_at' => $dateFrom->toDateTimeString(),
            'date_to_at' => $dateTo->toDateTimeString(),
        ];
    }

    private function filteredPaidItems(array $filters)
    {
        return OrderItem::query()
            ->with(['order.payments', 'tour.guide'])
            ->whereHas('order', function ($query) use ($filters): void {
                $query->where('status', 'paid')
                    ->whereBetween('paid_at', [$filters['date_from_at'], $filters['date_to_at']]);
            })
            ->when($filters['tour_id'], fn ($query, $tourId) => $query->where('tour_id', $tourId))
            ->when($filters['guide_id'], function ($query, $guideId): void {
                $query->whereHas('tour', fn ($tourQuery) => $tourQuery->where('guide_id', $guideId));
            })
            ->orderByDesc('id');
    }

    private function filteredPageViews(array $filters)
    {
        $query = PageView::query()
            ->whereBetween('viewed_at', [$filters['date_from_at'], $filters['date_to_at']]);

        if ($filters['tour_id']) {
            $tour = Tour::query()->find($filters['tour_id']);
            if ($tour) {
                $query->where('page_path', 'like', '/excursions/' . $tour->slug . '%');
            }
        }

        if ($filters['guide_id']) {
            $guide = Guide::query()->with('tours:id,guide_id,slug')->find($filters['guide_id']);
            if ($guide) {
                $tourSlugs = $guide->tours->pluck('slug')->filter()->values();
                $query->where(function ($nested) use ($guide, $tourSlugs): void {
                    $nested->where('page_path', 'like', '/guides/' . $guide->slug . '%');

                    foreach ($tourSlugs as $slug) {
                        $nested->orWhere('page_path', 'like', '/excursions/' . $slug . '%');
                    }
                });
            }
        }

        return $query->orderByDesc('viewed_at');
    }

    private function synchronizeOrderPayment(Order $order, array $paymentData, string $status, string $provider = 'tbank'): void
    {
        DB::transaction(function () use ($order, $paymentData, $status, $provider): void {
            $isPaid = in_array($status, ['CONFIRMED', 'AUTHORIZED'], true);
            $isRefunded = in_array($status, ['REFUNDED', 'PARTIAL_REFUNDED'], true);
            $paidAt = $isPaid ? ($order->paid_at ?? now()) : $order->paid_at;
            $failedStatuses = ['REJECTED', 'CANCELED', 'DEADLINE_EXPIRED', 'AUTH_FAIL'];
            $nextOrderStatus = $isPaid
                ? 'paid'
                : ($isRefunded ? 'refunded' : (in_array($status, $failedStatuses, true) ? 'failed' : 'pending'));

            Payment::query()->updateOrCreate(
                ['provider_payment_id' => (string) ($paymentData['PaymentId'] ?? '')],
                [
                    'order_id' => $order->id,
                    'provider' => $provider,
                    'provider_status' => $status,
                    'amount_rub' => round(((float) ($paymentData['Amount'] ?? 0)) / 100, 2) ?: (float) $order->total_rub,
                    'currency' => 'RUB',
                    'paid_at' => $paidAt,
                    'raw_payload_json' => $paymentData,
                ]
            );

            $order->update([
                'status' => $nextOrderStatus,
                'paid_at' => $paidAt,
                'payment_provider' => $provider,
            ]);

            if ($isPaid) {
                foreach ($order->items as $item) {
                    $order->accessGrants()->firstOrCreate(
                        [
                            'user_id' => $order->user_id,
                            'tour_id' => $item->tour_id,
                            'order_id' => $order->id,
                        ],
                        [
                            'starts_at' => $paidAt,
                            'expires_at' => $paidAt?->copy()->addHours(72),
                            'status' => 'active',
                        ]
                    );
                }
            } elseif ($isRefunded) {
                $order->accessGrants()
                    ->where('status', 'active')
                    ->update([
                        'status' => 'refunded',
                        'expires_at' => now(),
                    ]);
            }
        });
    }
}
