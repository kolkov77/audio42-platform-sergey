<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Http\Controllers\PublicSeoController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Throwable;

class AdminSearchEngineStatusController extends Controller
{
    use AuthorizesBackofficeRoles;

    private const SITE_ORIGIN = 'https://audiogid42.ru';

    public function show(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);

        $homepage = $this->probe(self::SITE_ORIGIN . '/');
        $robots = $this->seoProbe('robots', self::SITE_ORIGIN . '/robots.txt');
        $sitemap = $this->seoProbe('sitemap', self::SITE_ORIGIN . '/sitemap.xml');
        $homepageBody = $homepage['body'] ?? '';
        $robotsBody = $robots['body'] ?? '';
        $sitemapBody = $sitemap['body'] ?? '';

        $robotsHasSitemap = $robots['ok']
            && str_contains($robotsBody, 'Sitemap: ' . self::SITE_ORIGIN . '/sitemap.xml');
        $sitemapLooksValid = $sitemap['ok']
            && str_contains($sitemapBody, '<urlset')
            && str_contains($sitemapBody, '<loc>');
        $sitemapUrlsCount = preg_match_all('/<loc>\s*.+?\s*<\/loc>/iu', $sitemapBody);
        $googleTag = $this->metaContent($homepageBody, 'google-site-verification');
        $yandexTag = $this->metaContent($homepageBody, 'yandex-verification');

        return response()->json([
            'checked_at' => now()->toIso8601String(),
            'site' => [
                'origin' => self::SITE_ORIGIN,
                'homepage_url' => self::SITE_ORIGIN . '/',
                'robots_url' => self::SITE_ORIGIN . '/robots.txt',
                'sitemap_url' => self::SITE_ORIGIN . '/sitemap.xml',
                'ready_for_submission' => $homepage['ok'] && $robotsHasSitemap && $sitemapLooksValid,
            ],
            'checks' => [
                [
                    'key' => 'homepage',
                    'label' => 'Главная страница',
                    'url' => $homepage['url'],
                    'status' => $homepage['ok'] ? 'ok' : 'error',
                    'detail' => $this->httpDetail($homepage, 'Главная доступна для внешней проверки.'),
                ],
                [
                    'key' => 'robots',
                    'label' => 'robots.txt',
                    'url' => $robots['url'],
                    'status' => $robotsHasSitemap ? 'ok' : ($robots['ok'] ? 'warning' : 'error'),
                    'detail' => $robotsHasSitemap
                        ? 'Файл доступен и содержит ссылку на sitemap.xml.'
                        : $this->httpDetail($robots, 'Файл доступен, но ссылка на sitemap.xml не найдена.'),
                ],
                [
                    'key' => 'sitemap',
                    'label' => 'sitemap.xml',
                    'url' => $sitemap['url'],
                    'status' => $sitemapLooksValid ? 'ok' : ($sitemap['ok'] ? 'warning' : 'error'),
                    'detail' => $sitemapLooksValid
                        ? 'XML-карта доступна. URL в карте: ' . $sitemapUrlsCount . '.'
                        : $this->httpDetail($sitemap, 'Файл доступен, но карта URL не распознана.'),
                ],
            ],
            'engines' => [
                [
                    'key' => 'google',
                    'name' => 'Google Search Console',
                    'status' => $googleTag ? 'verification_tag_detected' : 'verification_pending',
                    'console_url' => 'https://search.google.com/search-console',
                    'verification_tag_name' => 'google-site-verification',
                    'verification_tag_present' => $googleTag !== null,
                    'verification_tag_preview' => $this->mask($googleTag),
                    'note' => 'Статус владения, отправки sitemap и индексации подтверждается в аккаунте Google.',
                ],
                [
                    'key' => 'yandex',
                    'name' => 'Яндекс Вебмастер',
                    'status' => $yandexTag ? 'verification_tag_detected' : 'verification_pending',
                    'console_url' => 'https://webmaster.yandex.ru/',
                    'verification_tag_name' => 'yandex-verification',
                    'verification_tag_present' => $yandexTag !== null,
                    'verification_tag_preview' => $this->mask($yandexTag),
                    'note' => 'Статус прав, отправки sitemap и обхода проверяется в кабинете Яндекс Вебмастера.',
                ],
            ],
        ]);
    }

    private function probe(string $url): array
    {
        try {
            $response = Http::timeout(6)
                ->withUserAgent('AudioGuide42 SEO status check')
                ->get($url);

            return [
                'url' => $url,
                'ok' => $response->successful(),
                'status_code' => $response->status(),
                'body' => $response->body(),
                'error' => null,
            ];
        } catch (Throwable $exception) {
            return [
                'url' => $url,
                'ok' => false,
                'status_code' => null,
                'body' => '',
                'error' => $exception->getMessage(),
            ];
        }
    }

    private function seoProbe(string $document, string $url): array
    {
        try {
            $seo = app(PublicSeoController::class);
            $response = $document === 'robots' ? $seo->robots() : $seo->sitemap();

            return [
                'url' => $url,
                'ok' => $response->isSuccessful(),
                'status_code' => $response->getStatusCode(),
                'body' => $response->getContent(),
                'error' => null,
            ];
        } catch (Throwable $exception) {
            return [
                'url' => $url,
                'ok' => false,
                'status_code' => null,
                'body' => '',
                'error' => $exception->getMessage(),
            ];
        }
    }

    private function metaContent(string $html, string $name): ?string
    {
        if ($html === '') {
            return null;
        }

        $pattern = '/<meta\b(?=[^>]*\bname=["\']' . preg_quote($name, '/') . '["\'])(?=[^>]*\bcontent=["\']([^"\']+)["\'])[^>]*>/iu';

        if (! preg_match($pattern, $html, $matches)) {
            return null;
        }

        $value = trim((string) ($matches[1] ?? ''));

        return $value !== '' ? $value : null;
    }

    private function mask(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        if (mb_strlen($value) <= 10) {
            return str_repeat('•', mb_strlen($value));
        }

        return mb_substr($value, 0, 5) . '…' . mb_substr($value, -4);
    }

    private function httpDetail(array $probe, string $fallback): string
    {
        if ($probe['ok']) {
            return $fallback;
        }

        if ($probe['status_code']) {
            return 'HTTP ' . $probe['status_code'] . '.';
        }

        return $probe['error'] ? 'Проверка не выполнена: ' . $probe['error'] : 'Проверка не выполнена.';
    }
}
