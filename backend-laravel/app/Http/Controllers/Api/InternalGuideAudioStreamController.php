<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Support\GuideAudio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class InternalGuideAudioStreamController extends Controller
{
    public function __invoke(Request $request, Guide $guide)
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();
        abort_if(! $user, 401);

        $isPrivileged = $user->hasAnyRole(['admin', 'accountant']);
        $isOwnerGuide = $user->guide && $guide->id === $user->guide->id;

        abort_if(! $isPrivileged && ! $isOwnerGuide, 403, 'Недостаточно прав для прослушивания записи автора.');

        $path = GuideAudio::resolveAbsolutePath($guide->about_audio_url);
        abort_if(! $path, 404, 'Голосовая запись автора не найдена.');

        return response()->file($path, [
            'Content-Type' => File::mimeType($path) ?: 'audio/mpeg',
            'Content-Disposition' => 'inline; filename="'.($guide->about_audio_file_name ?: basename($path)).'"',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
