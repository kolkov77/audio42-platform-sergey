<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Support\GuideAudio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminGuideController extends Controller
{
    use AuthorizesBackofficeRoles;

    public function index(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin', 'accountant']);

        $guides = Guide::query()
            ->with('user')
            ->withCount('tours')
            ->orderBy('display_name')
            ->get()
            ->map(fn (Guide $guide) => $this->serializeGuide($guide));

        return response()->json([
            'guides' => $guides,
        ]);
    }

    public function update(Request $request, Guide $guide): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);

        $validated = $request->validate([
            'display_name' => ['sometimes', 'required', 'string', 'max:255'],
            'headline' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'photo_url' => ['nullable', 'string', 'max:2048'],
            'about_audio_url' => ['nullable', 'string', 'max:2048'],
            'about_audio_file_name' => ['nullable', 'string', 'max:255'],
            'website_url' => ['nullable', 'string', 'max:2048'],
            'social_links' => ['array'],
            'social_links.*.label' => ['nullable', 'string', 'max:100'],
            'social_links.*.url' => ['nullable', 'string', 'max:2048'],
            'trust_points' => ['array', 'max:3'],
            'trust_points.*' => ['nullable', 'string', 'max:160'],
            'is_public' => ['nullable', 'boolean'],
            'reward_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $previousAboutAudioUrl = $guide->about_audio_url;

        DB::transaction(function () use ($guide, $validated): void {
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
                'reward_percent' => array_key_exists('reward_percent', $validated) ? $validated['reward_percent'] : $guide->rewardPercent(),
                'is_public' => $validated['is_public'] ?? $guide->is_public,
            ]);
        });

        if (array_key_exists('about_audio_url', $validated) && $validated['about_audio_url'] !== $previousAboutAudioUrl) {
            GuideAudio::deleteManagedFile($previousAboutAudioUrl);
        }

        return response()->json([
            'message' => 'Профиль экскурсовода обновлён.',
            'guide' => $this->serializeGuide($guide->fresh('user')->loadCount('tours')),
        ]);
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
            'reward_percent' => $guide->rewardPercent(),
            'is_public' => (bool) $guide->is_public,
            'tours_count' => $guide->tours_count ?? 0,
            'user' => $guide->user ? [
                'id' => $guide->user->id,
                'name' => $guide->user->name,
                'email' => $guide->user->email,
            ] : null,
        ];
    }
}
