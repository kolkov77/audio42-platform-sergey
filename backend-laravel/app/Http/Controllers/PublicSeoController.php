<?php

namespace App\Http\Controllers;

use App\Models\Tour;
use App\Support\TourDuration;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class PublicSeoController extends Controller
{
    private const SITE_ORIGIN = 'https://audiogid42.ru';

    private const SITE_NAME = 'Аудиогид42';

    public function home(): Response
    {
        $title = 'Аудиоэкскурсии по Кемерово | ' . self::SITE_NAME;
        $description = 'Авторские аудиоэкскурсии по Кемерово: маршруты на карте, аудиотреки, рассказы авторов и прогулки по городу в удобном темпе.';
        $url = self::SITE_ORIGIN . '/';
        $schema = [
            '@context' => 'https://schema.org',
            '@graph' => [
                $this->organizationSchema(),
                $this->websiteSchema(),
                [
                    '@type' => 'WebPage',
                    'name' => $title,
                    'description' => $description,
                    'url' => $url,
                ],
            ],
        ];

        return $this->htmlDocument($title, $description, $url, $schema, implode("\n", [
            '<main>',
            '<article>',
            '<h1>Аудиоэкскурсии по Кемерово</h1>',
            '<p>' . e($description) . '</p>',
            '<p>Выберите авторскую прогулку, откройте маршрут на карте и слушайте точки экскурсии в удобном темпе.</p>',
            '<p><a href="' . e(self::SITE_ORIGIN . '/excursions') . '">Смотреть каталог экскурсий</a></p>',
            '</article>',
            '</main>',
        ]));
    }

    public function catalog(): Response
    {
        $title = 'Каталог аудиоэкскурсий по Кемерово | ' . self::SITE_NAME;
        $description = 'Выберите аудиоэкскурсию по Кемерово: авторский маршрут, карта прогулки, длительность, стоимость и пробное прослушивание.';
        $url = self::SITE_ORIGIN . '/excursions';
        $tours = Tour::query()
            ->with('guide')
            ->where('status', 'published')
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get();
        $tourLinks = $tours->map(function (Tour $tour): string {
            $guide = trim((string) ($tour->guide?->display_name ?? ''));
            $detail = $guide !== '' ? ' Рассказывает: ' . e($guide) . '.' : '';

            return '<li><a href="' . e($this->tourUrl($tour)) . '">' . e((string) $tour->title) . '</a>. '
                . e($this->description($tour)) . $detail . '</li>';
        })->implode("\n");
        $schema = [
            '@context' => 'https://schema.org',
            '@graph' => [
                $this->organizationSchema(),
                $this->websiteSchema(),
                [
                    '@type' => 'CollectionPage',
                    'name' => $title,
                    'description' => $description,
                    'url' => $url,
                ],
                $this->breadcrumbSchema([
                    ['name' => self::SITE_NAME, 'url' => self::SITE_ORIGIN . '/'],
                    ['name' => 'Экскурсии', 'url' => $url],
                ]),
            ],
        ];

        return $this->htmlDocument($title, $description, $url, $schema, implode("\n", [
            '<nav><a href="' . e(self::SITE_ORIGIN) . '">' . e(self::SITE_NAME) . '</a></nav>',
            '<main>',
            '<section>',
            '<h1>Каталог аудиоэкскурсий по Кемерово</h1>',
            '<p>' . e($description) . '</p>',
            '<ul>' . $tourLinks . '</ul>',
            '</section>',
            '</main>',
        ]));
    }

    public function robots(): Response
    {
        $content = implode("\n", [
            'User-agent: *',
            'Allow: /',
            '',
            'Disallow: /login',
            'Disallow: /magic-login',
            'Disallow: /register',
            'Disallow: /forgot-password',
            'Disallow: /reset-password/',
            'Disallow: /cabinet',
            'Disallow: /checkout/success',
            'Disallow: /checkout/fail',
            'Disallow: /promo-codes',
            'Disallow: /finance',
            'Disallow: /tours',
            'Disallow: /guides-admin',
            'Disallow: /requests',
            'Disallow: /users',
            'Disallow: /guide-studio',
            '',
            'Sitemap: ' . self::SITE_ORIGIN . '/sitemap.xml',
            '',
        ]);

        return response($content)
            ->header('Content-Type', 'text/plain; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    public function sitemap(): Response
    {
        $staticPages = [
            '/',
            '/excursions',
            '/guides',
            '/map',
            '/terms',
            '/contacts',
            '/offer',
            '/privacy',
            '/personal-data-consent',
            '/payment-policy',
        ];

        $urls = collect($staticPages)
            ->map(fn (string $path): array => ['loc' => self::SITE_ORIGIN . $path, 'lastmod' => null])
            ->merge(
                Tour::query()
                    ->where('status', 'published')
                    ->orderByDesc('published_at')
                    ->orderByDesc('id')
                    ->get(['slug', 'updated_at', 'published_at'])
                    ->map(fn (Tour $tour): array => [
                        'loc' => $this->tourUrl($tour),
                        'lastmod' => ($tour->updated_at ?: $tour->published_at)?->toDateString(),
                    ]),
            );

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n"
            . $urls->map(function (array $url): string {
                $entry = '  <url>' . "\n"
                    . '    <loc>' . e($url['loc']) . '</loc>' . "\n";

                if ($url['lastmod']) {
                    $entry .= '    <lastmod>' . e($url['lastmod']) . '</lastmod>' . "\n";
                }

                return $entry . '  </url>';
            })->implode("\n") . "\n"
            . '</urlset>' . "\n";

        return response($xml)
            ->header('Content-Type', 'application/xml; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    public function tour(string $slug): Response
    {
        $tour = Tour::query()
            ->with('guide')
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first();

        if (! $tour) {
            abort(404);
        }

        $url = $this->tourUrl($tour);
        $title = $this->tourSeoTitle($tour);
        $description = $this->description($tour);
        $image = $this->imageUrl($tour);
        $schema = $this->schemaGraph($tour, $title, $description, $image, $url);

        $html = '<!doctype html>' . "\n"
            . '<html lang="ru">' . "\n"
            . '<head>' . "\n"
            . '<meta charset="UTF-8" />' . "\n"
            . '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' . "\n"
            . '<title>' . e($title) . '</title>' . "\n"
            . '<meta name="description" content="' . e($description) . '" />' . "\n"
            . '<meta name="robots" content="index,follow" />' . "\n"
            . '<link rel="canonical" href="' . e($url) . '" />' . "\n"
            . '<meta property="og:type" content="website" />' . "\n"
            . '<meta property="og:site_name" content="' . e(self::SITE_NAME) . '" />' . "\n"
            . '<meta property="og:url" content="' . e($url) . '" />' . "\n"
            . '<meta property="og:title" content="' . e($title) . '" />' . "\n"
            . '<meta property="og:description" content="' . e($description) . '" />' . "\n"
            . '<meta property="og:image" content="' . e($image) . '" />' . "\n"
            . '<meta name="twitter:card" content="summary_large_image" />' . "\n"
            . '<meta name="twitter:title" content="' . e($title) . '" />' . "\n"
            . '<meta name="twitter:description" content="' . e($description) . '" />' . "\n"
            . '<meta name="twitter:image" content="' . e($image) . '" />' . "\n"
            . '<script type="application/ld+json">' . $this->json($schema) . '</script>' . "\n"
            . '</head>' . "\n"
            . '<body>' . "\n"
            . '<nav><a href="' . e(self::SITE_ORIGIN) . '">Аудиогид42</a> / <a href="' . e(self::SITE_ORIGIN . '/excursions') . '">Экскурсии</a></nav>' . "\n"
            . '<main>' . "\n"
            . '<article>' . "\n"
            . '<h1>' . e((string) $tour->title) . '</h1>' . "\n"
            . '<p>' . e($description) . '</p>' . "\n"
            . '<p>Авторская аудиоэкскурсия по Кемерово. Маршрут можно открыть на карте и слушать в удобном темпе.</p>' . "\n"
            . '<img src="' . e($image) . '" alt="' . e((string) $tour->title) . '" />' . "\n"
            . $this->tourDetails($tour)
            . '<p><a href="' . e($url) . '">Открыть экскурсию</a></p>' . "\n"
            . '</article>' . "\n"
            . '</main>' . "\n"
            . '</body>' . "\n"
            . '</html>' . "\n";

        return response($html)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=300');
    }

    private function tourDetails(Tour $tour): string
    {
        $items = [];
        $guide = trim((string) ($tour->guide?->display_name ?? ''));

        if ($guide !== '') {
            $items[] = '<li>Рассказывает: ' . e($guide) . '</li>';
        }

        $durationMinutes = TourDuration::minutes($tour, publishedOnly: true, persistDetected: true);

        if ($durationMinutes !== null) {
            $items[] = '<li>Продолжительность: ' . e((string) $durationMinutes) . ' мин.</li>';
        }

        $items[] = '<li>Стоимость: ' . ((float) $tour->price_rub <= 0
            ? 'Бесплатно'
            : e(number_format((float) $tour->price_rub, 0, '.', ' ')) . ' ₽') . '</li>';

        return '<ul>' . implode('', $items) . '</ul>' . "\n";
    }

    private function tourSeoTitle(Tour $tour): string
    {
        return trim((string) $tour->title) . ' - аудиоэкскурсия по Кемерово | ' . self::SITE_NAME;
    }

    private function description(Tour $tour): string
    {
        $description = trim((string) ($tour->short_description ?: $tour->full_description));
        $description = preg_replace('/\s+/u', ' ', strip_tags($description)) ?: '';

        if ($description === '') {
            $description = 'Авторская аудиоэкскурсия по Кемерово: маршрут на карте, аудиотреки и прогулка по городу в удобном темпе.';
        }

        return Str::limit($description, 220, '');
    }

    private function tourUrl(Tour $tour): string
    {
        return self::SITE_ORIGIN . '/excursions/' . rawurlencode((string) $tour->slug);
    }

    private function imageUrl(Tour $tour): string
    {
        $image = $tour->cover_image_url;

        if (! $image && is_array($tour->gallery_json ?? null)) {
            $first = $tour->gallery_json[0] ?? null;
            $image = is_array($first) ? ($first['url'] ?? $first['image_url'] ?? null) : $first;
        }

        if (! is_string($image) || trim($image) === '') {
            return self::SITE_ORIGIN . '/daytrip-route.jpg';
        }

        $image = trim($image);

        if (Str::startsWith($image, 'https://back.audio42.onff.ru/uploads/')) {
            return self::SITE_ORIGIN . '/uploads/' . ltrim(Str::after($image, 'https://back.audio42.onff.ru/uploads/'), '/');
        }

        if (Str::startsWith($image, ['http://', 'https://'])) {
            return $image;
        }

        if (Str::startsWith($image, '/uploads/')) {
            return self::SITE_ORIGIN . $image;
        }

        return self::SITE_ORIGIN . '/' . ltrim($image, '/');
    }

    private function schemaGraph(Tour $tour, string $title, string $description, string $image, string $url): array
    {
        $guide = trim((string) ($tour->guide?->display_name ?? ''));

        return [
            '@context' => 'https://schema.org',
            '@graph' => [
                $this->organizationSchema(),
                $this->websiteSchema(),
                $this->breadcrumbSchema([
                    ['name' => self::SITE_NAME, 'url' => self::SITE_ORIGIN . '/'],
                    ['name' => 'Экскурсии', 'url' => self::SITE_ORIGIN . '/excursions'],
                    ['name' => (string) $tour->title, 'url' => $url],
                ]),
                [
                    '@type' => 'Product',
                    '@id' => $url . '#tour-access',
                    'name' => $title,
                    'description' => $description,
                    'image' => [$image],
                    'url' => $url,
                    'brand' => ['@id' => self::SITE_ORIGIN . '/#organization'],
                    'offers' => [
                        '@type' => 'Offer',
                        'url' => $url,
                        'priceCurrency' => (string) ($tour->currency ?: 'RUB'),
                        'price' => number_format((float) $tour->price_rub, 2, '.', ''),
                        'availability' => 'https://schema.org/InStock',
                    ],
                    ...($guide !== '' ? ['creator' => ['@type' => 'Person', 'name' => $guide]] : []),
                ],
            ],
        ];
    }

    private function htmlDocument(string $title, string $description, string $url, array $schema, string $body): Response
    {
        $html = '<!doctype html>' . "\n"
            . '<html lang="ru">' . "\n"
            . '<head>' . "\n"
            . '<meta charset="UTF-8" />' . "\n"
            . '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' . "\n"
            . '<title>' . e($title) . '</title>' . "\n"
            . '<meta name="description" content="' . e($description) . '" />' . "\n"
            . '<meta name="robots" content="index,follow" />' . "\n"
            . '<link rel="canonical" href="' . e($url) . '" />' . "\n"
            . '<meta property="og:type" content="website" />' . "\n"
            . '<meta property="og:site_name" content="' . e(self::SITE_NAME) . '" />' . "\n"
            . '<meta property="og:url" content="' . e($url) . '" />' . "\n"
            . '<meta property="og:title" content="' . e($title) . '" />' . "\n"
            . '<meta property="og:description" content="' . e($description) . '" />' . "\n"
            . '<script type="application/ld+json">' . $this->json($schema) . '</script>' . "\n"
            . '</head>' . "\n"
            . '<body>' . "\n"
            . $body . "\n"
            . '</body>' . "\n"
            . '</html>' . "\n";

        return response($html)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=300');
    }

    private function organizationSchema(): array
    {
        return [
            '@type' => 'Organization',
            '@id' => self::SITE_ORIGIN . '/#organization',
            'name' => self::SITE_NAME,
            'url' => self::SITE_ORIGIN . '/',
        ];
    }

    private function websiteSchema(): array
    {
        return [
            '@type' => 'WebSite',
            '@id' => self::SITE_ORIGIN . '/#website',
            'name' => self::SITE_NAME,
            'url' => self::SITE_ORIGIN . '/',
            'publisher' => ['@id' => self::SITE_ORIGIN . '/#organization'],
        ];
    }

    private function breadcrumbSchema(array $items): array
    {
        return [
            '@type' => 'BreadcrumbList',
            'itemListElement' => collect($items)
                ->values()
                ->map(fn (array $item, int $index): array => [
                    '@type' => 'ListItem',
                    'position' => $index + 1,
                    'name' => $item['name'],
                    'item' => $item['url'],
                ])
                ->all(),
        ];
    }

    private function json(array $payload): string
    {
        return json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}
