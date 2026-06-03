<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class YooKassaService
{
    public function isConfigured(): bool
    {
        return (string) env('YOOKASSA_SHOP_ID', '') !== ''
            && (string) env('YOOKASSA_SECRET_KEY', '') !== '';
    }

    public function createPayment(array $payload): array
    {
        $this->ensureConfigured();

        $response = Http::withBasicAuth(
            (string) env('YOOKASSA_SHOP_ID'),
            (string) env('YOOKASSA_SECRET_KEY')
        )
            ->withHeaders([
                'Idempotence-Key' => (string) Str::uuid(),
            ])
            ->post('https://api.yookassa.ru/v3/payments', $payload);

        if (! $response->successful()) {
            throw new RuntimeException('ЮKassa не приняла создание платежа.');
        }

        return $response->json();
    }

    public function getPayment(string $paymentId): array
    {
        $this->ensureConfigured();

        $response = Http::withBasicAuth(
            (string) env('YOOKASSA_SHOP_ID'),
            (string) env('YOOKASSA_SECRET_KEY')
        )->get('https://api.yookassa.ru/v3/payments/'.$paymentId);

        if (! $response->successful()) {
            throw new RuntimeException('Не удалось запросить статус платежа в ЮKassa.');
        }

        return $response->json();
    }

    private function ensureConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('ЮKassa ещё не настроена: отсутствуют shop_id или secret_key.');
        }
    }
}
