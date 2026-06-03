<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class GuideImageController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $this->authorizeUpload($request);

        $validated = $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'scope' => ['nullable', 'string', 'in:tour-cover,point-gallery,guide-photo,ad-banner,gallery'],
        ], [
            'image.required' => 'Загрузите изображение.',
            'image.uploaded' => 'Не удалось загрузить файл. Проверьте размер и формат изображения.',
            'image.image' => 'Файл должен быть изображением.',
            'image.mimes' => 'Поддерживаются JPG, PNG и WebP.',
            'image.max' => 'Изображение должно быть не больше 8 МБ.',
        ]);

        $file = $validated['image'];
        $extension = $file->getClientOriginalExtension() ?: ($file->extension() ?: 'jpg');
        $directory = public_path('uploads/tours');

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        $fileName = (string) Str::uuid().'.'.Str::lower($extension);
        $file->move($directory, $fileName);

        $path = '/uploads/tours/'.$fileName;
        $publicBaseUrl = rtrim((string) env('APP_UPLOADS_BASE_URL', env('APP_BACKOFFICE_URL', $request->getSchemeAndHttpHost())), '/');

        return response()->json([
            'message' => 'Изображение загружено.',
            'url' => $publicBaseUrl.$path,
            'path' => $path,
            'scope' => $validated['scope'] ?? 'gallery',
        ], 201);
    }

    private function authorizeUpload(Request $request): void
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        abort_if(! $user || (! $user->guide && ! $user->hasRole('admin')), 403, 'Доступ только для экскурсовода или администратора.');
    }
}
