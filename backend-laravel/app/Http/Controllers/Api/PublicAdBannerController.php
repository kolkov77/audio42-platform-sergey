<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdBanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PublicAdBannerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['required', 'string', Rule::in(['excursions', 'tour', 'guide'])],
        ]);

        return response()->json([
            'ad_banners' => AdBanner::query()
                ->where('page_key', $validated['page'])
                ->where('is_active', true)
                ->orderByDesc('id')
                ->get()
                ->map(fn (AdBanner $banner) => [
                    'id' => $banner->id,
                    'page_key' => $banner->page_key,
                    'slot_key' => $banner->slot_key,
                    'image_url' => $banner->image_url,
                    'target_url' => $banner->target_url,
                    'alt_text' => $banner->alt_text,
                ]),
        ]);
    }
}
