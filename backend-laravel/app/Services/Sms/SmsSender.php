<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class SmsSender
{
    public function send(string $phone, string $message): SmsSendResult
    {
        $provider = mb_strtolower((string) env(
            'SMS_PROVIDER',
            app()->environment('production') ? 'disabled' : 'log',
        ));

        return match ($provider) {
            't2', 't2_sms_target' => $this->sendViaT2($phone, $message),
            'log' => $this->sendToLog($phone, $message),
            'disabled' => throw new RuntimeException('SMS provider is not configured.'),
            default => throw new RuntimeException('SMS provider is not supported.'),
        };
    }

    private function sendToLog(string $phone, string $message): SmsSendResult
    {
        Log::info('SMS login code generated', [
            'provider' => 'log',
            'phone' => $this->maskPhone($phone),
            'message' => $message,
        ]);

        return new SmsSendResult(provider: 'log');
    }

    private function sendViaT2(string $phone, string $message): SmsSendResult
    {
        $url = (string) env('SMS_T2_SEND_URL', 'https://target.t2.ru/api/v2/send_message');
        $login = (string) env('SMS_T2_LOGIN', '');
        $password = (string) env('SMS_T2_PASSWORD', '');
        $sender = (string) env('SMS_T2_SENDER', '');

        if ($login === '' || $password === '' || $sender === '') {
            throw new RuntimeException('T2 SMS provider is not configured.');
        }

        $payload = [
            'msisdn' => $this->normalizeForT2($phone),
            'shortcode' => $sender,
            'text' => $message,
        ];

        $response = Http::withBasicAuth($login, $password)
            ->acceptJson()
            ->asJson()
            ->timeout((int) env('SMS_T2_TIMEOUT_SECONDS', 10))
            ->post($url, $payload);

        $body = $response->json();

        if (! $response->successful()) {
            Log::warning('T2 SMS request failed', [
                'status' => $response->status(),
                'phone' => $this->maskPhone($phone),
                'body' => is_array($body) ? $body : $response->body(),
            ]);

            throw new RuntimeException('T2 SMS request failed.');
        }

        if (is_array($body) && (($body['status'] ?? null) === 'error' || isset($body['error']))) {
            Log::warning('T2 SMS returned error', [
                'phone' => $this->maskPhone($phone),
                'body' => $body,
            ]);

            throw new RuntimeException('T2 SMS returned error.');
        }

        $messageId = is_array($body)
            ? (string) ($body['result']['uid'] ?? $body['message_id'] ?? $body['id'] ?? $body['request_id'] ?? '')
            : '';

        return new SmsSendResult(
            provider: 't2_sms_target',
            messageId: $messageId !== '' ? $messageId : null,
            raw: is_array($body) ? $body : [],
        );
    }

    private function normalizeForT2(string $phone): string
    {
        return ltrim($phone, '+');
    }

    private function maskPhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';

        if (mb_strlen($digits) < 6) {
            return '***';
        }

        return mb_substr($digits, 0, 2).'***'.mb_substr($digits, -4);
    }
}
