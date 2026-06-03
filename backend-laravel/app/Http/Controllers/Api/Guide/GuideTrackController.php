<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\Tour;
use App\Models\TourPoint;
use App\Models\Track;
use App\Support\Audio42Locale;
use App\Support\TrackAudio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GuideTrackController extends Controller
{
    public function store(Request $request, Tour $tour): JsonResponse
    {
        $guide = $this->currentGuide($request);
        abort_if($tour->guide_id !== $guide->id, 403, 'Нельзя редактировать чужой тур.');

        $validated = $request->validate([
            'tour_point_id' => ['nullable', 'integer', 'exists:tour_points,id'],
            'manual_point_title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'translation_json' => ['nullable'],
            'audio_url' => ['nullable', 'string', 'max:2048'],
            'audio_file' => ['nullable', 'file', 'mimetypes:audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/aac', 'max:65536'],
            'duration_seconds' => ['nullable', 'integer', 'min:1'],
            'sort_order' => ['nullable', 'integer', 'min:1'],
            'track_type' => ['nullable', 'string', 'in:main,bonus'],
            'is_demo' => ['nullable', 'boolean'],
            'is_published' => ['nullable', 'boolean'],
        ], $this->validationMessages());

        abort_if(
            empty($validated['audio_url']) && ! $request->hasFile('audio_file'),
            422,
            'Нужно загрузить аудиозапись или передать ссылку на неё.'
        );

        $tourPoint = null;

        if (! empty($validated['tour_point_id'])) {
            $tourPoint = TourPoint::query()->findOrFail($validated['tour_point_id']);
            abort_if($tourPoint->tour_id !== $tour->id, 422, 'Точка не относится к этому туру.');
        }

        $audioUrl = $validated['audio_url'] ?? null;
        $audioFileName = null;

        if ($request->hasFile('audio_file')) {
            $audioFile = $request->file('audio_file');
            $audioUrl = TrackAudio::storeUploadedFile($audioFile);
            $audioFileName = $audioFile->getClientOriginalName();
        }

        $durationSeconds = $this->durationSecondsForAudio($audioUrl, $validated['duration_seconds'] ?? null);

        $pointLabel = $tourPoint?->title_override
            ?: $tourPoint?->point?->title
            ?: ($validated['manual_point_title'] ?? null)
            ?: Str::limit(trim((string) ($validated['description'] ?? 'Трек')), 80, '');

        $trackType = $tourPoint ? 'main' : ($validated['track_type'] ?? 'main');

        $track = Track::query()->create([
            'tour_id' => $tour->id,
            'tour_point_id' => $tourPoint?->id,
            'title' => $this->trackTitle($pointLabel, $tour, $trackType),
            'description' => $validated['description'] ?? null,
            'translation_json' => Audio42Locale::cleanTranslations($this->translationInput($request->input('translation_json'))),
            'audio_url' => $audioUrl,
            'audio_file_name' => $audioFileName,
            'duration_seconds' => $durationSeconds,
            'sort_order' => $validated['sort_order'] ?? $tourPoint?->sort_order ?? ((int) $tour->tracks()->max('sort_order') + 1),
            'track_type' => $trackType,
            'is_demo' => $tourPoint ? false : ($validated['is_demo'] ?? false),
            'is_published' => $tourPoint ? true : ($validated['is_published'] ?? false),
        ]);

        return response()->json([
            'message' => 'Аудиозапись добавлена в тур.',
            'track' => $this->serializeTrack($track->fresh(['tourPoint.point'])),
        ], 201);
    }

    public function update(Request $request, Tour $tour, Track $track): JsonResponse
    {
        $guide = $this->currentGuide($request);
        abort_if($tour->guide_id !== $guide->id, 403, 'Нельзя редактировать чужой тур.');
        abort_if($track->tour_id !== $tour->id, 404, 'Трек не относится к этому туру.');

        $validated = $request->validate([
            'tour_point_id' => ['nullable', 'integer', 'exists:tour_points,id'],
            'manual_point_title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'translation_json' => ['nullable'],
            'audio_url' => ['nullable', 'string', 'max:2048'],
            'audio_file' => ['nullable', 'file', 'mimetypes:audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/aac', 'max:65536'],
            'duration_seconds' => ['nullable', 'integer', 'min:1'],
            'sort_order' => ['nullable', 'integer', 'min:1'],
            'track_type' => ['nullable', 'string', 'in:main,bonus'],
            'is_demo' => ['nullable', 'boolean'],
            'is_published' => ['nullable', 'boolean'],
        ], $this->validationMessages());

        $tourPoint = null;

        if (array_key_exists('tour_point_id', $validated) && ! empty($validated['tour_point_id'])) {
            $tourPoint = TourPoint::query()->findOrFail($validated['tour_point_id']);
            abort_if($tourPoint->tour_id !== $tour->id, 422, 'Точка не относится к этому туру.');
        }

        $submittedAudioUrl = array_key_exists('audio_url', $validated)
            ? trim((string) ($validated['audio_url'] ?? ''))
            : null;
        $audioUrl = $track->audio_url;

        if ($submittedAudioUrl !== null && $submittedAudioUrl !== '' && ! $this->isCurrentStreamUrl($submittedAudioUrl, $track)) {
            $audioUrl = $submittedAudioUrl;
        }

        $audioFileName = $track->audio_file_name;
        $previousAudioUrl = $track->audio_url;
        $audioChanged = false;

        if ($request->hasFile('audio_file')) {
            $audioFile = $request->file('audio_file');
            $audioUrl = TrackAudio::storeUploadedFile($audioFile);
            $audioFileName = $audioFile->getClientOriginalName();
            $audioChanged = true;

            TrackAudio::deleteManagedFile($previousAudioUrl);
        } elseif ($submittedAudioUrl !== null && $submittedAudioUrl !== '' && $audioUrl !== $previousAudioUrl) {
            $audioFileName = null;
            $audioChanged = true;
            TrackAudio::deleteManagedFile($previousAudioUrl);
        }

        $durationSeconds = ($audioChanged || ! $track->duration_seconds)
            ? $this->durationSecondsForAudio($audioUrl, $validated['duration_seconds'] ?? $track->duration_seconds)
            : (TrackAudio::detectDurationSeconds($audioUrl) ?? $track->duration_seconds);

        $pointLabel = $tourPoint?->title_override
            ?: $tourPoint?->point?->title
            ?: ($validated['manual_point_title'] ?? null)
            ?: Str::before($track->title, '. '.$tour->title);

        $trackType = $tourPoint ? 'main' : ($validated['track_type'] ?? ($track->track_type ?: 'main'));

        $track->update([
            'tour_point_id' => array_key_exists('tour_point_id', $validated) ? $tourPoint?->id : $track->tour_point_id,
            'title' => $this->trackTitle($pointLabel ?: 'Трек', $tour, $trackType),
            'description' => array_key_exists('description', $validated) ? ($validated['description'] ?: null) : $track->description,
            'translation_json' => array_key_exists('translation_json', $validated)
                ? Audio42Locale::cleanTranslations($this->translationInput($request->input('translation_json')))
                : ($track->translation_json ?? []),
            'audio_url' => $audioUrl,
            'audio_file_name' => $audioFileName,
            'duration_seconds' => $durationSeconds,
            'sort_order' => $validated['sort_order'] ?? $tourPoint?->sort_order ?? $track->sort_order,
            'track_type' => $trackType,
            'is_demo' => $tourPoint ? false : ($validated['is_demo'] ?? $track->is_demo),
            'is_published' => $tourPoint ? true : ($validated['is_published'] ?? $track->is_published),
        ]);

        $track->load('tourPoint.point');

        return response()->json([
            'message' => 'Трек обновлён.',
            'track' => $this->serializeTrack($track),
        ]);
    }

    public function destroy(Request $request, Tour $tour, Track $track): JsonResponse
    {
        $guide = $this->currentGuide($request);
        abort_if($tour->guide_id !== $guide->id, 403, 'Нельзя редактировать чужой тур.');
        abort_if($track->tour_id !== $tour->id, 404, 'Трек не относится к этому туру.');

        TrackAudio::deleteManagedFile($track->audio_url);
        $track->delete();

        return response()->json([
            'message' => 'Трек удалён.',
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

    private function validationMessages(): array
    {
        return [
            'audio_file.file' => 'Загрузите аудиофайл.',
            'audio_file.uploaded' => 'Не удалось загрузить аудиофайл. Проверьте размер файла и попробуйте снова.',
            'audio_file.mimetypes' => 'Поддерживаются аудиофайлы MP3, WAV, OGG, MP4 или AAC.',
            'audio_file.max' => 'Аудиофайл должен быть не больше 64 МБ.',
            'description.max' => 'Описание трека должно быть не длиннее 1000 символов.',
            'manual_point_title.max' => 'Название точки для трека должно быть не длиннее 255 символов.',
        ];
    }

    private function translationInput(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function serializeTrack(Track $track): array
    {
        $tourPointTitle = $track->tourPoint?->title_override ?: $track->tourPoint?->point?->title;

        return [
            'id' => $track->id,
            'title' => $tourPointTitle ?: $track->title,
            'description' => $track->description,
            'translation_json' => $track->translation_json ?? [],
            'audio_url' => TrackAudio::hasUsableAudio($track->audio_url) ? TrackAudio::internalStreamUrl($track) : null,
            'audio_file_name' => $track->audio_file_name ?: $this->fallbackAudioFileName($track->audio_url),
            'duration_seconds' => $track->duration_seconds,
            'sort_order' => $track->sort_order,
            'track_type' => $track->track_type ?: 'main',
            'is_demo' => (bool) $track->is_demo,
            'is_published' => (bool) $track->is_published,
            'tour_point_id' => $track->tour_point_id,
            'tour_point_title' => $tourPointTitle,
        ];
    }

    private function trackTitle(?string $pointLabel, Tour $tour, string $trackType): string
    {
        $title = trim((string) $pointLabel);

        if ($title === '') {
            return $trackType === 'bonus' ? 'Бонусный трек' : 'Трек. '.$tour->title;
        }

        if ($trackType === 'bonus') {
            return $title;
        }

        return $title.'. '.$tour->title;
    }

    private function durationSecondsForAudio(?string $audioUrl, ?int $fallback): ?int
    {
        return TrackAudio::detectDurationSeconds($audioUrl) ?? $fallback;
    }

    private function isCurrentStreamUrl(string $audioUrl, Track $track): bool
    {
        $normalized = trim($audioUrl);

        return $normalized === TrackAudio::internalStreamUrl($track)
            || $normalized === TrackAudio::publicStreamUrl($track)
            || str_ends_with($normalized, '/api/internal/tracks/'.$track->id.'/stream')
            || str_ends_with($normalized, '/api/public/tracks/'.$track->id.'/stream');
    }

    private function fallbackAudioFileName(?string $audioUrl): ?string
    {
        if (! $audioUrl || ! str_starts_with($audioUrl, TrackAudio::LEGACY_UPLOAD_PREFIX)) {
            return null;
        }

        return basename($audioUrl);
    }
}
