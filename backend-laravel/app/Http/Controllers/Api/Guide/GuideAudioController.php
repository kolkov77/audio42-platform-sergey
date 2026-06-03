<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Support\GuideAudio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuideAudioController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $this->authorizeUpload($request);

        $validated = $request->validate([
            'audio_file' => ['required', 'file', 'mimetypes:audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/aac', 'max:65536'],
        ], [
            'audio_file.required' => 'Загрузите аудиофайл.',
            'audio_file.file' => 'Загрузите аудиофайл.',
            'audio_file.uploaded' => 'Не удалось загрузить аудиофайл. Проверьте размер файла и попробуйте снова.',
            'audio_file.mimetypes' => 'Поддерживаются аудиофайлы MP3, WAV, OGG, MP4 или AAC.',
            'audio_file.max' => 'Аудиофайл должен быть не больше 64 МБ.',
        ]);

        $file = $validated['audio_file'];
        $audioUrl = GuideAudio::storeUploadedFile($file);

        return response()->json([
            'message' => 'Голосовая запись загружена. Нажмите «Сохранить карточку», чтобы обновить профиль.',
            'audio_url' => $audioUrl,
            'audio_file_name' => $file->getClientOriginalName(),
        ], 201);
    }

    private function authorizeUpload(Request $request): void
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        abort_if(! $user || (! $user->guide && ! $user->hasRole('admin')), 403, 'Доступ только для экскурсовода или администратора.');
    }
}
