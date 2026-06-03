<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PageView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PublicAnalyticsController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_key' => ['required', 'string', 'min:8', 'max:64'],
            'visitor_key' => ['nullable', 'string', 'min:8', 'max:64'],
            'host' => ['nullable', 'string', 'max:255'],
            'page_path' => ['required', 'string', 'max:255'],
            'page_query' => ['nullable', 'string', 'max:1000'],
            'referrer_url' => ['nullable', 'string', 'max:1000'],
            'referrer_host' => ['nullable', 'string', 'max:255'],
            'utm_source' => ['nullable', 'string', 'max:255'],
            'utm_medium' => ['nullable', 'string', 'max:255'],
            'utm_campaign' => ['nullable', 'string', 'max:255'],
            'utm_content' => ['nullable', 'string', 'max:255'],
            'utm_term' => ['nullable', 'string', 'max:255'],
            'viewed_at' => ['nullable', 'date'],
        ]);

        $pagePath = '/' . ltrim($validated['page_path'], '/');
        $alreadySeenSession = PageView::query()
            ->where('session_key', $validated['session_key'])
            ->exists();

        $sourceLabel = $validated['utm_source']
            ?? $validated['referrer_host']
            ?? 'direct';
        $clientIp = $this->clientIp($request);
        $geo = $this->geoLocation($clientIp);

        $pageView = PageView::query()->create([
            'session_key' => $validated['session_key'],
            'visitor_key' => $validated['visitor_key'] ?? null,
            'ip_address' => $clientIp,
            'host' => $validated['host'] ?? $request->getHost(),
            'device_type' => $this->deviceType((string) $request->userAgent()),
            'page_path' => $pagePath,
            'page_query' => $validated['page_query'] ?? null,
            'referrer_url' => $validated['referrer_url'] ?? null,
            'referrer_host' => $validated['referrer_host'] ?? null,
            'source_label' => $sourceLabel,
            'utm_source' => $validated['utm_source'] ?? null,
            'utm_medium' => $validated['utm_medium'] ?? null,
            'utm_campaign' => $validated['utm_campaign'] ?? null,
            'utm_content' => $validated['utm_content'] ?? null,
            'utm_term' => $validated['utm_term'] ?? null,
            'geo_country_code' => $geo['country_code'],
            'geo_country_name' => $geo['country_name'],
            'geo_city_name' => $geo['city_name'],
            'is_entry' => ! $alreadySeenSession,
            'viewed_at' => $validated['viewed_at'] ?? now(),
        ]);

        return response()->json([
            'message' => 'Просмотр зафиксирован.',
            'page_view' => [
                'id' => $pageView->id,
                'is_entry' => (bool) $pageView->is_entry,
                'source_label' => $pageView->source_label,
            ],
        ], 201);
    }

    private function deviceType(string $userAgent): string
    {
        return preg_match('/android|iphone|ipad|ipod|mobile|windows phone|opera mini/i', $userAgent) === 1
            ? 'mobile'
            : 'desktop';
    }

    private function clientIp(Request $request): ?string
    {
        $candidates = [];

        foreach (['CF-Connecting-IP', 'X-Real-IP'] as $header) {
            $value = trim((string) $request->headers->get($header));
            if ($value !== '') {
                $candidates[] = $value;
            }
        }

        $forwardedFor = (string) $request->headers->get('X-Forwarded-For');
        foreach (explode(',', $forwardedFor) as $value) {
            $value = trim($value);
            if ($value !== '') {
                $candidates[] = $value;
            }
        }

        $candidates[] = $request->ip();

        foreach ($candidates as $candidate) {
            if ($this->isPublicIp($candidate)) {
                return $candidate;
            }
        }

        return $request->ip() ?: null;
    }

    private function geoLocation(?string $ip): array
    {
        $empty = [
            'country_code' => null,
            'country_name' => null,
            'city_name' => null,
        ];

        if (! $ip || ! $this->isPublicIp($ip)) {
            return $empty;
        }

        $known = PageView::query()
            ->where('ip_address', $ip)
            ->where(function ($query): void {
                $query->whereNotNull('geo_country_name')
                    ->orWhereNotNull('geo_city_name');
            })
            ->latest('viewed_at')
            ->first(['geo_country_code', 'geo_country_name', 'geo_city_name']);

        if ($known) {
            return [
                'country_code' => $known->geo_country_code,
                'country_name' => $known->geo_country_name,
                'city_name' => $known->geo_city_name,
            ];
        }

        try {
            $response = Http::timeout(2)
                ->acceptJson()
                ->get('http://ip-api.com/json/'.urlencode($ip), [
                    'fields' => 'status,country,countryCode,city',
                    'lang' => 'ru',
                ]);

            if (! $response->ok() || $response->json('status') !== 'success') {
                return $empty;
            }

            return [
                'country_code' => $response->json('countryCode') ?: null,
                'country_name' => $response->json('country') ?: null,
                'city_name' => $response->json('city') ?: null,
            ];
        } catch (\Throwable) {
            return $empty;
        }
    }

    private function isPublicIp(string $ip): bool
    {
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) !== false;
    }
}
