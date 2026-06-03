<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Track;
use App\Support\TourViewerAccess;
use App\Support\TrackAudio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class PublicTrackStreamController extends Controller
{
    public function __invoke(Request $request, Track $track)
    {
        $track->loadMissing('tour');

        $tour = $track->tour;
        abort_if(! $tour, 404);
        abort_if($tour->status !== 'published' || ! $track->is_published, 404);

        $isDemo = (bool) $track->is_demo || $track->sort_order <= 3;

        if (! $isDemo && (float) $tour->price_rub > 0) {
            abort_if(! TourViewerAccess::resolve($request, $tour), 403, 'Для прослушивания этого трека нужен активный доступ.');
        }

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
