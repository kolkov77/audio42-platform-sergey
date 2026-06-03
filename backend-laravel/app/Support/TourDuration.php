<?php

namespace App\Support;

use App\Models\Tour;
use App\Models\Track;
use Illuminate\Support\Collection;

class TourDuration
{
    public static function minutes(Tour $tour, bool $publishedOnly = true, bool $persistDetected = false): ?int
    {
        $seconds = self::seconds($tour, $publishedOnly, $persistDetected);

        return $seconds > 0 ? max(1, (int) ceil($seconds / 60)) : null;
    }

    public static function seconds(Tour $tour, bool $publishedOnly = true, bool $persistDetected = false): int
    {
        return self::tracks($tour, $publishedOnly)
            ->reduce(function (int $total, Track $track) use ($persistDetected): int {
                if (! TrackAudio::hasUsableAudio($track->audio_url)) {
                    return $total;
                }

                $detectedSeconds = TrackAudio::detectDurationSeconds($track->audio_url);
                $seconds = $detectedSeconds ?? (int) ($track->duration_seconds ?? 0);

                if ($persistDetected && $detectedSeconds !== null && (int) $track->duration_seconds !== $detectedSeconds) {
                    $track->forceFill(['duration_seconds' => $detectedSeconds])->saveQuietly();
                }

                return $seconds > 0 ? $total + $seconds : $total;
            }, 0);
    }

    /**
     * @return Collection<int, Track>
     */
    private static function tracks(Tour $tour, bool $publishedOnly): Collection
    {
        if ($tour->relationLoaded('tracks')) {
            $tracks = $tour->tracks;

            return $publishedOnly
                ? $tracks->filter(fn (Track $track) => (bool) $track->is_published)->values()
                : $tracks->values();
        }

        return $tour->tracks()
            ->when($publishedOnly, fn ($query) => $query->where('is_published', true))
            ->get();
    }
}
