<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Track;
use App\Support\TrackAudio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class InternalTrackStreamController extends Controller
{
    public function __invoke(Request $request, Track $track)
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();
        abort_if(! $user, 401);

        $track->loadMissing('tour');
        $tour = $track->tour;

        abort_if(! $tour, 404);

        $isPrivileged = $user->hasAnyRole(['admin', 'accountant']);
        $isOwnerGuide = $user->guide && $tour->guide_id === $user->guide->id;

        abort_if(! $isPrivileged && ! $isOwnerGuide, 403, 'Недостаточно прав для прослушивания этого трека.');

        $path = TrackAudio::resolveAbsolutePath($track->audio_url);
        abort_if(! $path, 404, 'Аудиофайл не найден.');

        return response()->file($path, [
            'Content-Type' => File::mimeType($path) ?: 'audio/mpeg',
            'Content-Disposition' => 'inline; filename="'.basename($path).'"',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
