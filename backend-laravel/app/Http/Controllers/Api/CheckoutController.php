<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessGrant;
use App\Models\LegalConsent;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\PromoCode;
use App\Models\PromoRedemption;
use App\Models\Tour;
use App\Models\User;
use App\Services\TBankEacqService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class CheckoutController extends Controller
{
    private const LEGAL_DOCUMENT_VERSION = '2026-04-23-v2';

    public function __construct(private readonly TBankEacqService $tbank)
    {
    }

    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tour_id' => ['required', 'integer', 'exists:tours,id'],
            'promo_code' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
        ]);

        $tour = Tour::query()
            ->where('id', $validated['tour_id'])
            ->where('status', 'published')
            ->firstOrFail();

        try {
            $pricing = $this->resolvePricing($tour, $validated['promo_code'] ?? null);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'promo_code' => [$exception->getMessage()],
            ]);
        }

        return response()->json([
            'tour' => [
                'id' => $tour->id,
                'slug' => $tour->slug,
                'title' => $tour->title,
                'price_rub' => (float) $tour->price_rub,
            ],
            'pricing' => $pricing,
        ]);
    }

    public function createOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tour_id' => ['required', 'integer', 'exists:tours,id'],
            'promo_code' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email'],
            'name' => ['nullable', 'string', 'max:255'],
            'accept_offer' => ['accepted'],
            'accept_pdn' => ['accepted'],
        ], [
            'accept_offer.accepted' => 'Нужно принять условия оферты.',
            'accept_pdn.accepted' => 'Нужно согласиться на обработку персональных данных.',
        ]);

        $tour = Tour::query()
            ->where('id', $validated['tour_id'])
            ->where('status', 'published')
            ->firstOrFail();

        try {
            $pricing = $this->resolvePricing($tour, $validated['promo_code'] ?? null);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'promo_code' => [$exception->getMessage()],
            ]);
        }
        $user = $this->findOrCreateCheckoutUser($validated['email'], $validated['name'] ?? null);

        $order = DB::transaction(function () use ($request, $validated, $tour, $pricing, $user) {
            $order = Order::query()->create([
                'order_number' => $this->nextOrderNumber(),
                'user_id' => $user?->id,
                'email_snapshot' => $validated['email'],
                'status' => 'pending',
                'subtotal_rub' => $pricing['subtotal_rub'],
                'discount_rub' => $pricing['discount_rub'],
                'total_rub' => $pricing['total_rub'],
                'promo_code_id' => $pricing['promo_code_id'],
                'payment_provider' => 'tbank',
                'payment_method' => 'redirect',
            ]);

            OrderItem::query()->create([
                'order_id' => $order->id,
                'tour_id' => $tour->id,
                'title_snapshot' => $tour->title,
                'unit_price_rub' => $pricing['subtotal_rub'],
                'discount_rub' => $pricing['discount_rub'],
                'final_price_rub' => $pricing['total_rub'],
            ]);

            foreach (['offer', 'pdn'] as $consentType) {
                LegalConsent::query()->create([
                    'user_id' => $user?->id,
                    'email_snapshot' => $validated['email'],
                    'consent_type' => $consentType,
                    'document_version' => self::LEGAL_DOCUMENT_VERSION,
                    'accepted_at' => now(),
                    'ip_address' => $request->ip(),
                    'user_agent' => (string) $request->userAgent(),
                ]);
            }

            if ($pricing['promo_code_id']) {
                PromoRedemption::query()->create([
                    'promo_code_id' => $pricing['promo_code_id'],
                    'order_id' => $order->id,
                    'user_id' => $user?->id,
                    'discount_rub' => $pricing['discount_rub'],
                ]);
            }

            return $order;
        });

        $this->rememberOrderForSession($request, $order->order_number);

        if ((float) $pricing['total_rub'] <= 0) {
            $this->synchronizeOrderPayment($order, [
                'PaymentId' => 'free-'.$order->order_number,
                'Amount' => 0,
                'Status' => 'CONFIRMED',
                'OrderId' => $order->order_number,
            ], 'CONFIRMED', 'internal');

            return response()->json([
                'message' => 'Заказ создан и автоматически подтверждён по нулевой сумме.',
                'order_number' => $order->order_number,
                'payment_provider' => 'internal',
                'payment_status' => 'CONFIRMED',
            ], 201);
        }

        if (! $this->tbank->isConfigured()) {
            return response()->json([
                'message' => 'Заказ создан, но T-Bank ещё не настроен: нужен TerminalKey и Password.',
                'order_number' => $order->order_number,
                'payment_provider' => 'tbank',
                'configuration_missing' => true,
            ], 503);
        }

        $payment = $this->tbank->initPayment([
            'Amount' => (int) round((float) $pricing['total_rub'] * 100),
            'OrderId' => $order->order_number,
            'Description' => 'Аудиотур: '.$tour->title,
            'PayType' => 'O',
                'NotificationURL' => (string) env('TBANK_NOTIFICATION_URL', 'https://audiogid42.ru/api/payments/webhooks/tbank'),
            'SuccessURL' => $this->buildSuccessUrl($order->order_number),
            'FailURL' => $this->buildFailUrl($tour->slug, $order->order_number),
            'CustomerKey' => (string) ($user?->id ?? $validated['email']),
            'DATA' => [
                'Email' => $validated['email'],
            ],
        ]);

        Payment::query()->updateOrCreate(
            ['provider_payment_id' => (string) $payment['PaymentId']],
            [
                'order_id' => $order->id,
                'provider' => 'tbank',
                'provider_status' => $payment['Status'] ?? null,
                'amount_rub' => $pricing['total_rub'],
                'currency' => 'RUB',
                'paid_at' => null,
                'raw_payload_json' => $payment,
            ]
        );

        return response()->json([
            'message' => 'Заказ создан.',
            'order_number' => $order->order_number,
            'payment_provider' => 'tbank',
            'payment_confirmation_url' => $payment['PaymentURL'] ?? null,
            'payment_status' => $payment['Status'] ?? null,
        ], 201);
    }

    public function orderStatus(string $orderNumber): JsonResponse
    {
        $order = Order::query()
            ->with(['items', 'payments', 'accessGrants'])
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        $this->refreshOrderStatusFromProvider($order);
        $order->refresh()->load(['items', 'payments', 'accessGrants']);

        return response()->json([
            'order' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'subtotal_rub' => (float) $order->subtotal_rub,
                'discount_rub' => (float) $order->discount_rub,
                'total_rub' => (float) $order->total_rub,
                'paid_at' => optional($order->paid_at)->toIso8601String(),
                'payment_provider' => $order->payment_provider,
                'items' => $order->items->map(fn (OrderItem $item) => [
                    'tour_id' => $item->tour_id,
                    'title' => $item->title_snapshot,
                    'final_price_rub' => (float) $item->final_price_rub,
                ])->values(),
                'payments' => $order->payments->map(fn (Payment $payment) => [
                    'provider_payment_id' => $payment->provider_payment_id,
                    'status' => $payment->provider_status,
                    'paid_at' => optional($payment->paid_at)->toIso8601String(),
                ])->values(),
                'access' => $order->accessGrants->map(fn (AccessGrant $grant) => [
                    'tour_id' => $grant->tour_id,
                    'starts_at' => $grant->starts_at?->toIso8601String(),
                    'expires_at' => $grant->expires_at?->toIso8601String(),
                    'status' => $grant->status,
                ])->values(),
            ],
        ]);
    }

    public function success(Request $request): JsonResponse
    {
        $orderNumber = (string) $request->string('order_number');
        $order = Order::query()
            ->with(['items', 'accessGrants', 'items.tour'])
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        $this->refreshOrderStatusFromProvider($order);
        $order->refresh()->load(['items', 'accessGrants', 'items.tour']);

        $firstItem = $order->items->first();
        $grant = $order->accessGrants
            ->first(fn (AccessGrant $candidate) => $candidate->status === 'active'
                && $candidate->starts_at?->lte(now())
                && $candidate->expires_at?->isFuture());
        $message = match ($order->status) {
            'paid' => 'Спасибо! Слушайте',
            'refunded' => 'Оплата возвращена. Доступ к туру закрыт.',
            'failed' => 'Оплата не была подтверждена.',
            default => 'Заказ создан. Ожидаем подтверждение оплаты.',
        };

        return response()->json([
            'message' => $message,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'tour' => $firstItem ? [
                'id' => $firstItem->tour_id,
                'title' => $firstItem->title_snapshot,
                'slug' => $firstItem->tour?->slug,
            ] : null,
            'access' => $grant ? [
                'starts_at' => $grant->starts_at?->toIso8601String(),
                'expires_at' => $grant->expires_at?->toIso8601String(),
                'status' => $grant->status,
            ] : null,
        ]);
    }

    public function webhook(Request $request): Response|JsonResponse
    {
        $payload = $request->all();
        $paymentId = (string) ($payload['PaymentId'] ?? '');

        if ($paymentId === '') {
            return response()->json(['message' => 'Пустой payment id.'], 422);
        }

        if ($this->tbank->isConfigured() && ! $this->tbank->verifyToken($payload)) {
            return response()->json(['message' => 'Некорректный token уведомления.'], 422);
        }

        $paymentData = $this->tbank->isConfigured()
            ? $this->tbank->getState($paymentId)
            : $payload;

        $orderNumber = (string) ($paymentData['OrderId'] ?? $payload['OrderId'] ?? '');
        $status = (string) ($paymentData['Status'] ?? $payload['Status'] ?? '');

        if ($orderNumber === '') {
            return response()->json(['message' => 'Не найден order_number в metadata.'], 422);
        }

        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        $this->synchronizeOrderPayment($order, $paymentData, $status, 'tbank');

        return response('OK', 200)->header('Content-Type', 'text/plain; charset=UTF-8');
    }

    private function resolvePricing(Tour $tour, ?string $promoCodeValue): array
    {
        $subtotal = round((float) $tour->price_rub, 2);
        $discount = 0.0;
        $promoCode = null;

        if ($promoCodeValue) {
            $promoCode = PromoCode::query()
                ->whereRaw('lower(code) = ?', [mb_strtolower(trim($promoCodeValue))])
                ->first();

            if (! $promoCode || ! $promoCode->is_active) {
                throw new RuntimeException('Промокод не найден или отключён.');
            }

            if ($promoCode->starts_at && $promoCode->starts_at->isFuture()) {
                throw new RuntimeException('Промокод ещё не активен.');
            }

            if ($promoCode->ends_at && $promoCode->ends_at->isPast()) {
                throw new RuntimeException('Срок действия промокода истёк.');
            }

            if ($promoCode->scope_type !== 'all_tours') {
                $allowed = $promoCode->promoTours()->where('tour_id', $tour->id)->exists();
                if (! $allowed) {
                    throw new RuntimeException('Промокод не действует на эту экскурсию.');
                }
            }

            if ($promoCode->discount_type === 'percent') {
                $discount = round($subtotal * ((float) $promoCode->discount_value / 100), 2);
            } elseif ($promoCode->discount_type === 'fixed_price') {
                $targetTotal = round((float) $promoCode->discount_value, 2);
                $targetTotal = min(max($targetTotal, 0), $subtotal);
                $discount = round($subtotal - $targetTotal, 2);
            } else {
                $discount = round((float) $promoCode->discount_value, 2);
            }
        }

        $discount = min($discount, $subtotal);
        $total = max(0, round($subtotal - $discount, 2));

        return [
            'subtotal_rub' => $subtotal,
            'discount_rub' => $discount,
            'total_rub' => $total,
            'promo_code_id' => $promoCode?->id,
            'promo_code' => $promoCode ? [
                'id' => $promoCode->id,
                'code' => $promoCode->code,
                'discount_type' => $promoCode->discount_type,
                'discount_value' => (float) $promoCode->discount_value,
            ] : null,
        ];
    }

    private function findOrCreateCheckoutUser(string $email, ?string $name): ?User
    {
        $user = User::query()->where('email', $email)->first();

        if ($user) {
            return $user;
        }

        $user = User::query()->create([
            'name' => $name ?: Str::before($email, '@'),
            'email' => $email,
            'password' => Str::random(32),
            'status' => 'active',
        ]);

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable) {
            // Не блокируем checkout, если письмо временно не ушло.
        }

        return $user;
    }

    private function nextOrderNumber(): string
    {
        do {
            $orderNumber = 'A42-'.now()->format('Ymd').'-'.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        } while (Order::query()->where('order_number', $orderNumber)->exists());

        return $orderNumber;
    }

    private function buildSuccessUrl(string $orderNumber): string
    {
        $baseUrl = (string) env('TBANK_SUCCESS_URL', 'https://audiogid42.ru/checkout/success');
        $separator = str_contains($baseUrl, '?') ? '&' : '?';

        return $baseUrl.$separator.'order_number='.urlencode($orderNumber);
    }

    private function buildFailUrl(string $tourSlug, string $orderNumber): string
    {
        $baseUrl = (string) env('TBANK_FAIL_URL', 'https://audiogid42.ru/checkout/fail');
        $separator = str_contains($baseUrl, '?') ? '&' : '?';

        return $baseUrl.$separator.'tour='.urlencode($tourSlug).'&order_number='.urlencode($orderNumber);
    }

    private function rememberOrderForSession(Request $request, string $orderNumber): void
    {
        $existing = $request->session()->get('checkout_order_numbers', []);
        $existing[] = $orderNumber;
        $request->session()->put('checkout_order_numbers', array_values(array_unique($existing)));
    }

    private function refreshOrderStatusFromProvider(Order $order): void
    {
        if (! $this->tbank->isConfigured() || $order->payment_provider !== 'tbank') {
            return;
        }

        $payment = $order->payments()->latest('id')->first();

        if (! $payment?->provider_payment_id) {
            return;
        }

        try {
            $paymentData = $this->tbank->getState((string) $payment->provider_payment_id);
            $this->synchronizeOrderPayment($order, $paymentData, (string) ($paymentData['Status'] ?? ''), 'tbank');
        } catch (\Throwable) {
            // Не ломаем клиентский flow, если провайдер временно не ответил.
        }
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
                    AccessGrant::query()->firstOrCreate(
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
                AccessGrant::query()
                    ->where('order_id', $order->id)
                    ->where('status', 'active')
                    ->update([
                        'status' => 'refunded',
                        'expires_at' => now(),
                    ]);
            }
        });
    }
}
