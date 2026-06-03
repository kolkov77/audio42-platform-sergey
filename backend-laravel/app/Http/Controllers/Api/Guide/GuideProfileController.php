<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Support\GuideAudio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuideProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'guide' => $this->serializeGuide($this->currentGuide($request)),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $guide = $this->currentGuide($request);

        $validated = $request->validate([
            'display_name' => ['sometimes', 'required', 'string', 'max:255'],
            'headline' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'photo_url' => ['nullable', 'string', 'max:2048'],
            'about_audio_url' => ['nullable', 'string', 'max:2048'],
            'about_audio_file_name' => ['nullable', 'string', 'max:255'],
            'website_url' => ['nullable', 'string', 'max:2048'],
            'social_links' => ['array', 'max:3'],
            'social_links.*.label' => ['nullable', 'string', 'max:100'],
            'social_links.*.url' => ['nullable', 'string', 'max:2048'],
            'trust_points' => ['array', 'max:3'],
            'trust_points.*' => ['nullable', 'string', 'max:160'],
        ], [
            'display_name.required' => 'Укажите имя экскурсовода для публичной карточки.',
            'display_name.max' => 'Имя экскурсовода должно быть не длиннее 255 символов.',
            'headline.max' => 'Короткая строка должна быть не длиннее 255 символов.',
            'bio.max' => 'Описание экскурсовода должно быть не длиннее 1000 символов.',
            'photo_url.max' => 'Ссылка на фото слишком длинная.',
            'about_audio_url.max' => 'Ссылка на голосовую запись слишком длинная.',
            'about_audio_file_name.max' => 'Название аудиофайла должно быть не длиннее 255 символов.',
            'website_url.max' => 'Ссылка на сайт слишком длинная.',
            'social_links.max' => 'Можно указать не больше трёх соцсетей.',
            'social_links.*.label.max' => 'Название соцсети должно быть не длиннее 100 символов.',
            'social_links.*.url.max' => 'Ссылка на соцсеть слишком длинная.',
            'trust_points.max' => 'Можно указать не больше трёх тезисов.',
            'trust_points.*.max' => 'Тезис должен быть не длиннее 160 символов.',
        ]);

        $previousAboutAudioUrl = $guide->about_audio_url;

        $guide->update([
            'display_name' => $validated['display_name'] ?? $guide->display_name,
            'headline' => array_key_exists('headline', $validated) ? $validated['headline'] : $guide->headline,
            'bio' => array_key_exists('bio', $validated) ? $validated['bio'] : $guide->bio,
            'photo_url' => array_key_exists('photo_url', $validated) ? $validated['photo_url'] : $guide->photo_url,
            'about_audio_url' => array_key_exists('about_audio_url', $validated) ? $validated['about_audio_url'] : $guide->about_audio_url,
            'about_audio_file_name' => array_key_exists('about_audio_file_name', $validated) ? $validated['about_audio_file_name'] : $guide->about_audio_file_name,
            'website_url' => array_key_exists('website_url', $validated) ? $validated['website_url'] : $guide->website_url,
            'social_links_json' => array_key_exists('social_links', $validated)
                ? collect($validated['social_links'])
                    ->map(fn (array $item) => [
                        'label' => trim((string) ($item['label'] ?? '')),
                        'url' => trim((string) ($item['url'] ?? '')),
                    ])
                    ->filter(fn (array $item) => $item['label'] !== '' || $item['url'] !== '')
                    ->values()
                    ->all()
                : $guide->social_links_json,
            'trust_points_json' => array_key_exists('trust_points', $validated)
                ? collect($validated['trust_points'])
                    ->map(fn ($item) => trim((string) $item))
                    ->filter()
                    ->values()
                    ->all()
                : $guide->trust_points_json,
        ]);

        if (array_key_exists('about_audio_url', $validated) && $validated['about_audio_url'] !== $previousAboutAudioUrl) {
            GuideAudio::deleteManagedFile($previousAboutAudioUrl);
        }

        return response()->json([
            'message' => 'Карточка экскурсовода сохранена.',
            'guide' => $this->serializeGuide($guide->fresh()),
        ]);
    }

    private function currentGuide(Request $request): Guide
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();
        $guide = $user?->guide;

        abort_if(! $guide, 403, 'Доступ только для экскурсовода.');

        return $guide;
    }

    private function serializeGuide(Guide $guide): array
    {
        return [
            'id' => $guide->id,
            'slug' => $guide->slug,
            'display_name' => $guide->display_name,
            'headline' => $guide->headline,
            'bio' => $guide->bio,
            'photo_url' => $guide->photo_url,
            'about_audio_url' => $guide->about_audio_url,
            'about_audio_stream_url' => GuideAudio::hasUsableAudio($guide->about_audio_url) ? GuideAudio::internalStreamUrl($guide) : null,
            'about_audio_file_name' => $guide->about_audio_file_name,
            'website_url' => $guide->website_url,
            'social_links' => $guide->social_links_json ?? [],
            'trust_points' => $guide->trust_points_json ?? [],
            'is_public' => (bool) $guide->is_public,
        ];
    }
}
