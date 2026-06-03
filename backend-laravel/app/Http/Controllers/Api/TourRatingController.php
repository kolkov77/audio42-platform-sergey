<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tour;
use App\Models\TourRating;
use App\Support\Audio42Locale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TourRatingController extends Controller
{
    public function store(Request $request, string $slug): JsonResponse
    {
        $tour = Tour::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'locale' => ['nullable', 'string', 'max:8'],
        ]);

        $user = $request->user();
        if (! $user && ! $request->session()->has('tour_rating_key')) {
            $request->session()->put('tour_rating_key', (string) Str::uuid());
        }

        $raterKey = $user
            ? 'user:'.$user->id
            : 'guest:'.$request->session()->get('tour_rating_key');

        $rating = TourRating::query()->updateOrCreate(
            [
                'tour_id' => $tour->id,
                'rater_key' => $raterKey,
            ],
            [
                'user_id' => $user?->id,
                'rating' => (int) $validated['rating'],
                'locale' => Audio42Locale::normalize($validated['locale'] ?? null),
            ],
        );

        $tour->loadCount('ratings')->loadAvg('ratings', 'rating');

        return response()->json([
            'message' => 'Оценка сохранена.',
            'user_rating' => $rating->rating,
            'rating' => [
                'average' => $tour->ratings_avg_rating !== null ? round((float) $tour->ratings_avg_rating, 1) : null,
                'count' => $tour->ratings_count ?? 0,
            ],
        ]);
    }
}
