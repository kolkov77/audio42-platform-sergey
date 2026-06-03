<?php

namespace App\Support;

use App\Models\Guide;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class GuideAudio
{
    public const PRIVATE_PREFIX = 'private://guide-about/';

    public static function storeUploadedFile(UploadedFile $file): string
    {
        self::ensurePrivateDirectory();

        $extension = $file->getClientOriginalExtension() ?: ($file->extension() ?: 'mp3');
        $fileName = (string) Str::uuid().'.'.Str::lower($extension);
        $file->move(self::privateDirectory(), $fileName);

        return self::PRIVATE_PREFIX.$fileName;
    }

    public static function publicStreamUrl(Guide $guide): string
    {
        return '/api/public/guides/'.$guide->id.'/about-audio';
    }

    public static function internalStreamUrl(Guide $guide): string
    {
        return '/api/internal/guides/'.$guide->id.'/about-audio';
    }

    public static function resolveAbsolutePath(?string $audioUrl): ?string
    {
        if (! $audioUrl || str_contains($audioUrl, 'example.com')) {
            return null;
        }

        if (Str::startsWith($audioUrl, self::PRIVATE_PREFIX)) {
            $path = self::privateDirectory().DIRECTORY_SEPARATOR.Str::after($audioUrl, self::PRIVATE_PREFIX);

            return File::exists($path) ? $path : null;
        }

        if (Str::startsWith($audioUrl, '/')) {
            $path = public_path(ltrim($audioUrl, '/'));

            return File::exists($path) ? $path : null;
        }

        return File::exists($audioUrl) ? $audioUrl : null;
    }

    public static function hasUsableAudio(?string $audioUrl): bool
    {
        return self::resolveAbsolutePath($audioUrl) !== null;
    }

    public static function deleteManagedFile(?string $audioUrl): void
    {
        if (! $audioUrl || ! Str::startsWith($audioUrl, self::PRIVATE_PREFIX)) {
            return;
        }

        $path = self::resolveAbsolutePath($audioUrl);

        if ($path && File::exists($path)) {
            File::delete($path);
        }
    }

    public static function privateDirectory(): string
    {
        return storage_path('app/private/guide-about');
    }

    public static function ensurePrivateDirectory(): void
    {
        $directory = self::privateDirectory();

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }
    }
}
