<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class TBankEacqService
{
    private const API_URL = 'https://securepay.tinkoff.ru/v2';

    public function isConfigured(): bool
    {
        return (string) env('TBANK_TERMINAL_KEY', '') !== ''
            && (string) env('TBANK_PASSWORD', '') !== '';
    }

    public function initPayment(array $payload): array
    {
        $this->ensureConfigured();

        return $this->request('Init', $payload);
    }

    public function getState(string $paymentId): array
    {
        $this->ensureConfigured();

        return $this->request('GetState', [
            'PaymentId' => $paymentId,
        ]);
    }

    public function cancelPayment(string $paymentId, ?int $amountKopecks = null): array
    {
        $this->ensureConfigured();

        $payload = [
            'PaymentId' => $paymentId,
        ];

        if ($amountKopecks !== null) {
            $payload['Amount'] = $amountKopecks;
        }

        return $this->request('Cancel', $payload);
    }

    public function verifyToken(array $payload): bool
    {
        $token = (string) ($payload['Token'] ?? '');

        if ($token === '') {
            return false;
        }

        return hash_equals($token, $this->generateToken($payload));
    }

    public function generateToken(array $payload): string
    {
        $tokenData = [];

        foreach ($payload as $key => $value) {
            if ($key === 'Token' || is_array($value) || is_object($value)) {
                continue;
            }

            if ($value === null) {
                continue;
            }

            $tokenData[$key] = (string) $value;
        }

        $tokenData['Password'] = (string) env('TBANK_PASSWORD');
        ksort($tokenData, SORT_STRING);

        return hash('sha256', implode('', $tokenData));
    }

    private function request(string $method, array $payload): array
    {
        $requestPayload = [
            'TerminalKey' => (string) env('TBANK_TERMINAL_KEY'),
            ...$payload,
        ];

        $requestPayload['Token'] = $this->generateToken($requestPayload);

        $response = Http::asJson()
            ->acceptJson()
            ->post(self::API_URL.'/'.$method, $requestPayload);
        $data = $response->json() ?? [];

        if (! $response->successful() || ! ($data['Success'] ?? false)) {
            throw new RuntimeException((string) ($data['Message'] ?? $data['Details'] ?? 'T-Bank не принял запрос.'));
        }

        return $data;
    }

    private function ensureConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('T-Bank ещё не настроен: отсутствуют TerminalKey или Password.');
        }
    }
}
