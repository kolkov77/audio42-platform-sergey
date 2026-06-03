<?php

namespace App\Http\Controllers;

use App\Models\Tour;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class OgTourController extends Controller
{
    public function show(Request $request, string $slug): Response
    {
        $tour = Tour::query()
            ->with('guide')
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first();

        if (! $tour) {
            abort(404);
        }

        $cleanUrl = 'https://audiogid42.ru/excursions/' . rawurlencode($tour->slug);
        $url = $request->is('share/*')
            ? 'https://audiogid42.ru/' . ltrim($request->path(), '/')
            : $cleanUrl;
        $shareMarker = $request->query('share');

        if (is_string($shareMarker) && preg_match('/^[a-z0-9\-]+$/i', $shareMarker)) {
            $url .= '?share=' . rawurlencode($shareMarker);
        }

        $title = $this->shareTitle($tour);
        $description = $this->description($tour);
        $image = $this->imageUrl($tour);

        $html = '<!doctype html>' . "\n"
            . '<html lang="ru">' . "\n"
            . '<head>' . "\n"
            . '<meta charset="UTF-8" />' . "\n"
            . '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' . "\n"
            . '<title>' . e($title) . '</title>' . "\n"
            . '<link rel="canonical" href="' . e($url) . '" />' . "\n"
            . '<meta name="description" content="' . e($description) . '" />' . "\n"
            . '<link rel="image_src" href="' . e($image) . '" />' . "\n"
            . '<meta property="og:type" content="website" />' . "\n"
            . '<meta property="og:site_name" content="Аудиогид42" />' . "\n"
            . '<meta property="og:url" content="' . e($url) . '" />' . "\n"
            . '<meta property="og:title" content="' . e($title) . '" />' . "\n"
            . '<meta property="og:description" content="' . e($description) . '" />' . "\n"
            . '<meta property="og:image" content="' . e($image) . '" />' . "\n"
            . '<meta property="og:image:url" content="' . e($image) . '" />' . "\n"
            . '<meta property="og:image:secure_url" content="' . e($image) . '" />' . "\n"
            . '<meta property="og:image:type" content="image/jpeg" />' . "\n"
            . '<meta property="og:image:alt" content="' . e($title) . '" />' . "\n"
            . '<meta property="vk:image" content="' . e($image) . '" />' . "\n"
            . '<meta name="vk:image" content="' . e($image) . '" />' . "\n"
            . '<meta name="mrc__share_title" content="' . e($title) . '" />' . "\n"
            . '<meta name="mrc__share_description" content="' . e($description) . '" />' . "\n"
            . '<meta name="mrc__share_image" content="' . e($image) . '" />' . "\n"
            . '<meta itemprop="name" content="' . e($title) . '" />' . "\n"
            . '<meta itemprop="description" content="' . e($description) . '" />' . "\n"
            . '<meta itemprop="image" content="' . e($image) . '" />' . "\n"
            . '<meta name="twitter:card" content="summary_large_image" />' . "\n"
            . '<meta name="twitter:title" content="' . e($title) . '" />' . "\n"
            . '<meta name="twitter:description" content="' . e($description) . '" />' . "\n"
            . '<meta name="twitter:image" content="' . e($image) . '" />' . "\n"
            . '</head>' . "\n"
            . '<body>' . "\n"
            . '<h1>' . e($title) . '</h1>' . "\n"
            . '<p>' . e($description) . '</p>' . "\n"
            . '<p><img src="' . e($image) . '" alt="' . e($title) . '" /></p>' . "\n"
            . '<p><a href="' . e($cleanUrl) . '">Открыть экскурсию</a></p>' . "\n"
            . '<script>(function(){var ua=navigator.userAgent||"";if(!/(facebookexternalhit|facebot|facebook|meta-external|vkshare|telegrambot|whatsapp|twitterbot)/i.test(ua)){window.location.replace("' . e($cleanUrl) . '");}})();</script>' . "\n"
            . '</body>' . "\n"
            . '</html>' . "\n";

        return response($html)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=300');
    }

    private function shareTitle(Tour $tour): string
    {
        $tourTitle = trim((string) $tour->title);
        $author = trim((string) ($tour->guide?->display_name ?? ''));

        if ($author === '') {
            return $tourTitle;
        }

        return $author . ' - ' . $tourTitle;
    }

    private function description(Tour $tour): string
    {
        $description = trim((string) ($tour->short_description ?: $tour->full_description));
        $description = preg_replace('/\s+/u', ' ', strip_tags($description)) ?: '';

        return Str::limit($description, 240, '');
    }

    private function imageUrl(Tour $tour): string
    {
        $image = $tour->cover_image_url;

        if (! $image && is_array($tour->gallery_json ?? null)) {
            $first = $tour->gallery_json[0] ?? null;
            $image = is_array($first) ? ($first['url'] ?? $first['image_url'] ?? null) : $first;
        }

        if (! is_string($image) || trim($image) === '') {
            return 'https://audiogid42.ru/favicon.svg';
        }

        $image = trim($image);

        if (Str::startsWith($image, 'https://back.audio42.onff.ru/uploads/')) {
            return 'https://audiogid42.ru/uploads/' . ltrim(Str::after($image, 'https://back.audio42.onff.ru/uploads/'), '/');
        }

        if (Str::startsWith($image, ['http://', 'https://'])) {
            return $image;
        }

        if (Str::startsWith($image, '/uploads/')) {
            return 'https://audiogid42.ru' . $image;
        }

        return 'https://audiogid42.ru/' . ltrim($image, '/');
    }
}
