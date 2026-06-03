<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\PageView;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTrafficController extends Controller
{
    use AuthorizesBackofficeRoles;

    public function summary(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);

        $filters = $this->extractFilters($request);
        $pageViews = $this->filteredPageViews($filters);

        $viewsCount = (clone $pageViews)->count();
        $sessionsCount = (clone $pageViews)->distinct('session_key')->count('session_key');
        $visitorsCount = (int) (clone $pageViews)
            ->selectRaw('COUNT(DISTINCT COALESCE(visitor_key, session_key)) as visitors_count')
            ->value('visitors_count');
        $leadsCount = $this->filteredContactRequests($filters)->count();
        $deviceSummary = $this->deviceSummary($filters);

        $topPages = (clone $pageViews)
            ->selectRaw('page_path, COUNT(*) as views_count, COUNT(DISTINCT session_key) as sessions_count, COUNT(DISTINCT COALESCE(visitor_key, session_key)) as visitors_count')
            ->groupBy('page_path')
            ->orderByDesc('views_count')
            ->limit(10)
            ->get()
            ->map(fn (PageView $row): array => [
                'path' => $row->page_path,
                'views_count' => (int) $row->views_count,
                'sessions_count' => (int) $row->sessions_count,
                'visitors_count' => (int) $row->visitors_count,
            ])
            ->values();

        $landingPages = (clone $pageViews)
            ->where('is_entry', true)
            ->selectRaw('page_path, COUNT(*) as entries_count')
            ->groupBy('page_path')
            ->orderByDesc('entries_count')
            ->limit(10)
            ->get()
            ->map(fn (PageView $row): array => [
                'path' => $row->page_path,
                'entries_count' => (int) $row->entries_count,
            ])
            ->values();

        $entrySources = (clone $pageViews)
            ->where('is_entry', true)
            ->selectRaw('COALESCE(source_label, "direct") as source_label, COUNT(*) as entries_count')
            ->groupBy('source_label')
            ->orderByDesc('entries_count')
            ->limit(10)
            ->get()
            ->map(fn (PageView $row): array => [
                'label' => $row->source_label ?: 'direct',
                'entries_count' => (int) $row->entries_count,
            ])
            ->values();

        $sourceBreakdown = $this->sourceBreakdown($filters);
        $geographyBreakdown = $this->geographyBreakdown($filters);

        $utmCampaigns = (clone $pageViews)
            ->where(function (Builder $query): void {
                $query->whereNotNull('utm_source')
                    ->orWhereNotNull('utm_medium')
                    ->orWhereNotNull('utm_campaign')
                    ->orWhereNotNull('utm_content')
                    ->orWhereNotNull('utm_term');
            })
            ->selectRaw('utm_source, utm_medium, utm_campaign, utm_content, utm_term, COUNT(*) as views_count, COUNT(DISTINCT session_key) as sessions_count, SUM(CASE WHEN is_entry THEN 1 ELSE 0 END) as entries_count')
            ->groupBy('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term')
            ->orderByDesc('views_count')
            ->limit(10)
            ->get()
            ->map(fn (PageView $row): array => [
                'source' => $row->utm_source,
                'medium' => $row->utm_medium,
                'campaign' => $row->utm_campaign,
                'content' => $row->utm_content,
                'term' => $row->utm_term,
                'views_count' => (int) $row->views_count,
                'sessions_count' => (int) $row->sessions_count,
                'entries_count' => (int) $row->entries_count,
            ])
            ->values();

        return response()->json([
            'filters' => collect($filters)->only(['date_from', 'date_to', 'interval', 'page_path']),
            'summary' => [
                'views_count' => (int) $viewsCount,
                'sessions_count' => (int) $sessionsCount,
                'visitors_count' => $visitorsCount,
                'leads_count' => (int) $leadsCount,
                'conversion_percent' => $this->conversionPercent($leadsCount, $sessionsCount),
                'desktop_percent' => $deviceSummary['desktop_percent'],
                'mobile_percent' => $deviceSummary['mobile_percent'],
                'known_device_sessions_count' => $deviceSummary['known_sessions_count'],
            ],
            'period_rows' => $this->periodRows($filters),
            'top_pages' => $topPages,
            'landing_pages' => $landingPages,
            'entry_sources' => $entrySources,
            'source_groups' => $sourceBreakdown['groups'],
            'search_sources' => $sourceBreakdown['search'],
            'external_sites' => $sourceBreakdown['external'],
            'social_sources' => $sourceBreakdown['social'],
            'mail_sources' => $sourceBreakdown['mail'],
            'top_countries' => $geographyBreakdown['countries'],
            'top_cities' => $geographyBreakdown['cities'],
            'utm_campaigns' => $utmCampaigns,
        ]);
    }

    private function extractFilters(Request $request): array
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'interval' => ['nullable', 'string', 'in:day,month'],
            'page_path' => ['nullable', 'string', 'max:255'],
        ]);

        $interval = $request->string('interval')->toString() === 'month' ? 'month' : 'day';
        $dateFrom = $request->date('date_from')
            ?? ($interval === 'month' ? now()->subMonths(11)->startOfMonth() : now()->subDays(29)->startOfDay());
        $dateTo = $request->date('date_to') ?? now()->endOfDay();

        return [
            'date_from' => $dateFrom->toDateString(),
            'date_to' => $dateTo->toDateString(),
            'interval' => $interval,
            'page_path' => $request->string('page_path')->trim()->toString() ?: null,
            'date_from_at' => $dateFrom->copy()->startOfDay()->toDateTimeString(),
            'date_to_at' => $dateTo->copy()->endOfDay()->toDateTimeString(),
        ];
    }

    private function filteredPageViews(array $filters)
    {
        return PageView::query()
            ->whereBetween('viewed_at', [$filters['date_from_at'], $filters['date_to_at']])
            ->when($filters['page_path'], fn (Builder $query, string $pagePath) => $query->where('page_path', $pagePath));
    }

    private function filteredContactRequests(array $filters)
    {
        return ContactRequest::query()
            ->whereBetween('created_at', [$filters['date_from_at'], $filters['date_to_at']]);
    }

    private function deviceSummary(array $filters): array
    {
        $rows = $this->filteredPageViews($filters)
            ->whereIn('device_type', ['desktop', 'mobile'])
            ->selectRaw('device_type, COUNT(DISTINCT session_key) as sessions_count')
            ->groupBy('device_type')
            ->get()
            ->pluck('sessions_count', 'device_type');

        $desktopSessions = (int) ($rows['desktop'] ?? 0);
        $mobileSessions = (int) ($rows['mobile'] ?? 0);
        $knownSessions = $desktopSessions + $mobileSessions;

        return [
            'known_sessions_count' => $knownSessions,
            'desktop_percent' => $knownSessions > 0 ? round(($desktopSessions / $knownSessions) * 100, 2) : 0,
            'mobile_percent' => $knownSessions > 0 ? round(($mobileSessions / $knownSessions) * 100, 2) : 0,
        ];
    }

    private function periodRows(array $filters)
    {
        $trafficRows = $this->filteredPageViews($filters)
            ->get()
            ->groupBy(fn (PageView $pageView): string => $this->periodKey($pageView->viewed_at, $filters['interval']))
            ->map(function ($views): array {
                return [
                    'views_count' => $views->count(),
                    'sessions_count' => $views->pluck('session_key')->filter()->unique()->count(),
                    'visitors_count' => $views
                        ->map(fn (PageView $pageView) => $pageView->visitor_key ?: $pageView->session_key)
                        ->filter()
                        ->unique()
                        ->count(),
                    'desktop_sessions_count' => $views
                        ->where('device_type', 'desktop')
                        ->pluck('session_key')
                        ->filter()
                        ->unique()
                        ->count(),
                    'mobile_sessions_count' => $views
                        ->where('device_type', 'mobile')
                        ->pluck('session_key')
                        ->filter()
                        ->unique()
                        ->count(),
                ];
            });

        $leadRows = $this->filteredContactRequests($filters)
            ->get()
            ->groupBy(fn (ContactRequest $contactRequest): string => $this->periodKey($contactRequest->created_at, $filters['interval']))
            ->map(fn ($requests): int => $requests->count());

        return $trafficRows->keys()
            ->merge($leadRows->keys())
            ->unique()
            ->sort()
            ->values()
            ->map(function (string $period) use ($trafficRows, $leadRows): array {
                $traffic = $trafficRows->get($period, []);
                $leadsCount = (int) $leadRows->get($period, 0);
                $sessionsCount = (int) ($traffic['sessions_count'] ?? 0);
                $desktopSessions = (int) ($traffic['desktop_sessions_count'] ?? 0);
                $mobileSessions = (int) ($traffic['mobile_sessions_count'] ?? 0);
                $knownSessions = $desktopSessions + $mobileSessions;

                return [
                    'period' => $period,
                    'views_count' => (int) ($traffic['views_count'] ?? 0),
                    'sessions_count' => $sessionsCount,
                    'visitors_count' => (int) ($traffic['visitors_count'] ?? 0),
                    'desktop_percent' => $knownSessions > 0 ? round(($desktopSessions / $knownSessions) * 100) : 0,
                    'mobile_percent' => $knownSessions > 0 ? round(($mobileSessions / $knownSessions) * 100) : 0,
                    'leads_count' => $leadsCount,
                    'conversion_percent' => $this->conversionPercent($leadsCount, $sessionsCount),
                ];
            });
    }

    private function sourceBreakdown(array $filters): array
    {
        $entries = $this->filteredPageViews($filters)
            ->where('is_entry', true)
            ->get(['referrer_host', 'source_label', 'utm_source', 'utm_medium']);
        $groups = collect([
            'direct' => 0,
            'search' => 0,
            'internal' => 0,
            'external' => 0,
            'social' => 0,
            'ads' => 0,
            'mail' => 0,
            'undefined' => 0,
        ]);
        $search = collect();
        $external = collect();
        $social = collect();
        $mail = collect();

        foreach ($entries as $entry) {
            $group = $this->sourceGroup($entry);
            $groups->put($group, ((int) $groups->get($group, 0)) + 1);

            if ($group === 'search') {
                $this->incrementSourceBucket($search, $this->searchSourceLabel($entry));
            }

            if ($group === 'external') {
                $this->incrementSourceBucket($external, $this->entrySourceLabel($entry));
            }

            if ($group === 'social') {
                $this->incrementSourceBucket($social, $this->socialSourceLabel($entry));
            }

            if ($group === 'mail') {
                $this->incrementSourceBucket($mail, $this->mailSourceLabel($entry));
            }
        }

        return [
            'groups' => $this->formatSourceRows($groups),
            'search' => $this->formatSourceRows($search),
            'external' => $this->formatSourceRows($external),
            'social' => $this->formatSourceRows($social),
            'mail' => $this->formatSourceRows($mail),
        ];
    }

    private function geographyBreakdown(array $filters): array
    {
        return [
            'countries' => $this->geographyRows($filters, ['geo_country_code', 'geo_country_name'], 'geo_country_name'),
            'cities' => $this->geographyRows($filters, ['geo_city_name'], 'geo_city_name'),
        ];
    }

    private function geographyRows(array $filters, array $columns, string $labelColumn)
    {
        $selectColumns = collect($columns)->implode(', ');

        $rows = $this->filteredPageViews($filters)
            ->whereNotNull($labelColumn)
            ->where($labelColumn, '!=', '')
            ->selectRaw($selectColumns.', COUNT(DISTINCT COALESCE(visitor_key, session_key)) as visitors_count')
            ->groupBy($columns)
            ->orderByDesc('visitors_count')
            ->limit(10)
            ->get();

        $total = $rows->sum(fn (PageView $row): int => (int) $row->visitors_count);

        return $rows
            ->map(fn (PageView $row): array => [
                'code' => $row->geo_country_code ?? null,
                'label' => $row->{$labelColumn},
                'visitors_count' => (int) $row->visitors_count,
                'percent' => $total > 0 ? round(((int) $row->visitors_count / $total) * 100) : 0,
            ])
            ->values();
    }

    private function sourceGroup(PageView $entry): string
    {
        $medium = strtolower((string) $entry->utm_medium);
        $source = strtolower((string) $entry->utm_source);
        $host = $this->entryHost($entry);

        if ($this->isMailMedium($medium)) {
            return 'mail';
        }

        if ($this->isAdsMedium($medium)) {
            return 'ads';
        }

        if ($this->isSocialHost($host) || $this->isSocialSource($source)) {
            return 'social';
        }

        if ($this->isSearchHost($host) || $this->isSearchSource($source) || str_contains($medium, 'organic')) {
            return 'search';
        }

        if ($this->isOwnHost($host)) {
            return 'internal';
        }

        if ($host !== '' || ($source !== '' && $source !== 'direct')) {
            return 'external';
        }

        if (($entry->source_label ?: 'direct') === 'direct') {
            return 'direct';
        }

        return 'undefined';
    }

    private function formatSourceRows($counts)
    {
        $total = $counts->sum();

        return $counts
            ->map(fn ($count, $label): array => [
                'label' => (string) $label,
                'entries_count' => (int) $count,
                'percent' => $total > 0 ? round(((int) $count / $total) * 100) : 0,
            ])
            ->sortByDesc('entries_count')
            ->values();
    }

    private function incrementSourceBucket($counts, string $label): void
    {
        $counts->put($label, ((int) $counts->get($label, 0)) + 1);
    }

    private function entryHost(PageView $entry): string
    {
        $host = strtolower((string) ($entry->referrer_host ?: $entry->source_label));

        return preg_replace('/^www\./', '', $host) ?: '';
    }

    private function entrySourceLabel(PageView $entry): string
    {
        return $this->entryHost($entry) ?: strtolower((string) $entry->utm_source) ?: 'undefined';
    }

    private function searchSourceLabel(PageView $entry): string
    {
        $source = $this->entrySourceLabel($entry);

        if (str_contains($source, 'yandex')) {
            return 'Yandex';
        }

        if (str_contains($source, 'google')) {
            return 'Google';
        }

        if (str_contains($source, 'rambler')) {
            return 'Rambler';
        }

        if (str_contains($source, 'bing')) {
            return 'Bing';
        }

        if (str_contains($source, 'duckduckgo')) {
            return 'DuckDuckGo';
        }

        return $source;
    }

    private function socialSourceLabel(PageView $entry): string
    {
        $source = $this->entrySourceLabel($entry);

        if (str_contains($source, 'vk')) {
            return 'Vk';
        }

        if (str_contains($source, 'telegram') || $source === 't.me') {
            return 'Telegram';
        }

        if (str_contains($source, 'facebook') || str_contains($source, 'fb.')) {
            return 'Facebook';
        }

        if (str_contains($source, 'instagram')) {
            return 'Instagram';
        }

        if (str_contains($source, 'ok.ru')) {
            return 'Одноклассники';
        }

        return $source;
    }

    private function mailSourceLabel(PageView $entry): string
    {
        $source = strtolower((string) ($entry->utm_source ?: $this->entrySourceLabel($entry)));

        if (str_contains($source, 'mail')) {
            return 'Mailru';
        }

        if (str_contains($source, 'yandex')) {
            return 'Yandex';
        }

        return $source ?: 'Email';
    }

    private function isSearchHost(string $host): bool
    {
        return $this->containsAny($host, ['yandex.', 'google.', 'rambler.', 'bing.', 'duckduckgo.']);
    }

    private function isSearchSource(string $source): bool
    {
        return $this->containsAny($source, ['yandex', 'google', 'rambler', 'bing', 'duckduckgo']);
    }

    private function isSocialHost(string $host): bool
    {
        return $this->containsAny($host, ['vk.com', 'vkontakte.', 't.me', 'telegram.', 'facebook.', 'fb.', 'instagram.', 'ok.ru']);
    }

    private function isSocialSource(string $source): bool
    {
        return $this->containsAny($source, ['vk', 'vkontakte', 'telegram', 'facebook', 'instagram', 'ok']);
    }

    private function isMailMedium(string $medium): bool
    {
        return $this->containsAny($medium, ['email', 'e-mail', 'mail', 'newsletter']);
    }

    private function isAdsMedium(string $medium): bool
    {
        return $this->containsAny($medium, ['cpc', 'ppc', 'paid', 'display', 'banner', 'ads']);
    }

    private function isOwnHost(string $host): bool
    {
        return $this->containsAny($host, ['audiogid42.ru', 'audio42.onff.ru']);
    }

    private function containsAny(string $value, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($value !== '' && str_contains($value, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function periodKey($date, string $interval): string
    {
        return $interval === 'month'
            ? $date->copy()->startOfMonth()->toDateString()
            : $date->toDateString();
    }

    private function conversionPercent(int $leadsCount, int $sessionsCount): float
    {
        return $sessionsCount > 0 ? round(($leadsCount / $sessionsCount) * 100, 2) : 0;
    }
}
