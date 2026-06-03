<?php

namespace App\Support;

use App\Models\Track;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class TrackAudio
{
    public const PRIVATE_PREFIX = 'private://tracks/';

    public const LEGACY_UPLOAD_PREFIX = '/uploads/tracks/';

    public static function storeUploadedFile(UploadedFile $file): string
    {
        self::ensurePrivateDirectory();

        $extension = $file->getClientOriginalExtension() ?: ($file->extension() ?: 'mp3');
        $fileName = (string) Str::uuid().'.'.Str::lower($extension);
        $file->move(self::privateDirectory(), $fileName);

        return self::PRIVATE_PREFIX.$fileName;
    }

    public static function publicStreamUrl(Track $track): string
    {
        return '/api/public/tracks/'.$track->id.'/stream';
    }

    public static function internalStreamUrl(Track $track): string
    {
        return '/api/internal/tracks/'.$track->id.'/stream';
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

        if (Str::startsWith($audioUrl, self::LEGACY_UPLOAD_PREFIX)) {
            $path = public_path(ltrim($audioUrl, '/'));

            return File::exists($path) ? $path : null;
        }

        if (Str::startsWith($audioUrl, '/')) {
            foreach (self::legacyPublicRoots() as $root) {
                $path = rtrim($root, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.ltrim($audioUrl, '/');

                if (File::exists($path)) {
                    return $path;
                }
            }
        }

        return File::exists($audioUrl) ? $audioUrl : null;
    }

    public static function hasUsableAudio(?string $audioUrl): bool
    {
        return self::resolveAbsolutePath($audioUrl) !== null;
    }

    public static function detectDurationSeconds(?string $audioUrl): ?int
    {
        $path = self::resolveAbsolutePath($audioUrl);

        if (! $path) {
            return null;
        }

        $ffprobe = self::executablePath('ffprobe');

        if (! $ffprobe) {
            return null;
        }

        $command = [
            $ffprobe,
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            $path,
        ];
        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $process = @proc_open($command, $descriptorSpec, $pipes);

        if (! is_resource($process)) {
            return null;
        }

        fclose($pipes[0]);
        $output = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);

        if ($exitCode !== 0) {
            return null;
        }

        $duration = (float) trim((string) $output);

        return $duration > 0 ? max(1, (int) ceil($duration)) : null;
    }

    public static function deleteManagedFile(?string $audioUrl): void
    {
        if (! $audioUrl) {
            return;
        }

        $isManagedPrivate = Str::startsWith($audioUrl, self::PRIVATE_PREFIX);
        $isManagedLegacyUpload = Str::startsWith($audioUrl, self::LEGACY_UPLOAD_PREFIX);

        if (! $isManagedPrivate && ! $isManagedLegacyUpload) {
            return;
        }

        $path = self::resolveAbsolutePath($audioUrl);

        if ($path && File::exists($path)) {
            File::delete($path);
        }
    }

    public static function privateDirectory(): string
    {
        return storage_path('app/private/tracks');
    }

    public static function ensurePrivateDirectory(): void
    {
        $directory = self::privateDirectory();

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }
    }

    /**
     * Older demo assets can still live in the static frontend root until they are migrated.
     *
     * @return array<int, string>
     */
    private static function legacyPublicRoots(): array
    {
        $projectRoot = dirname(base_path());

        return array_values(array_unique([
            public_path(),
            $projectRoot.DIRECTORY_SEPARATOR.'frontend'.DIRECTORY_SEPARATOR.'public',
            $projectRoot.DIRECTORY_SEPARATOR.'audiogid42.ru',
        ]));
    }

    private static function executablePath(string $name): ?string
    {
        foreach (['/usr/bin', '/usr/local/bin', '/bin'] as $directory) {
            $path = $directory.DIRECTORY_SEPARATOR.$name;

            if (File::exists($path) && is_executable($path)) {
                return $path;
            }
        }

        return null;
    }
}
