<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MagicLoginLink;
use App\Models\User;
use App\Notifications\MagicLoginNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MagicLoginController extends Controller
{
    private const EXPIRE_HOURS = 72;
    private const BACKOFFICE_HOSTS = [
        'back.audio42.onff.ru',
        'cabinet.audio42.onff.ru',
        'back.audiogid42.ru',
        'cabinet.audiogid42.ru',
    ];

    public function requestLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'Укажите электронную почту.',
            'email.email' => 'Введите корректный адрес электронной почты.',
        ]);

        $email = mb_strtolower(trim((string) $validated['email']));
        $user = User::query()
            ->whereRaw('lower(email) = ?', [$email])
            ->where('status', 'active')
            ->first();

        if ($user) {
            $context = $this->resolveEntryContext($request);
            $frontendBaseUrl = $this->frontendBaseUrlForContext($context, $request);
            $redirectPath = $context === 'backoffice' ? '/' : '/cabinet';
            $rawToken = Str::random(64);
            $expiresAt = now()->addHours(self::EXPIRE_HOURS);

            MagicLoginLink::query()
                ->where('user_id', $user->id)
                ->whereNull('used_at')
                ->delete();

            $magicLink = MagicLoginLink::query()->create([
                'user_id' => $user->id,
                'email_snapshot' => $email,
                'token_hash' => hash('sha256', $rawToken),
                'entry_context' => $context,
                'frontend_base_url' => $frontendBaseUrl,
                'redirect_path' => $redirectPath,
                'requested_ip' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'expires_at' => $expiresAt,
            ]);

            $magicUrl = rtrim($magicLink->frontend_base_url, '/').'/magic-login?token='.urlencode($rawToken);
            $user->notify(new MagicLoginNotification(
                magicUrl: $magicUrl,
                expiresLabel: $this->expiresLabel(),
                backoffice: $context === 'backoffice',
            ));
        }

        return response()->json([
            'message' => 'Если такой пользователь существует, мы отправили ссылку для входа на указанную почту.',
        ]);
    }

    public function consume(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:255'],
        ], [
            'token.required' => 'Не передан токен для входа.',
        ]);

        $tokenHash = hash('sha256', (string) $validated['token']);

        [$user, $redirectTo] = DB::transaction(function () use ($tokenHash) {
            /** @var MagicLoginLink|null $magicLink */
            $magicLink = MagicLoginLink::query()
                ->with('user.roles', 'user.guide')
                ->where('token_hash', $tokenHash)
                ->lockForUpdate()
                ->first();

            if (! $magicLink) {
                throw ValidationException::withMessages([
                    'token' => ['Ссылка для входа недействительна или уже устарела.'],
                ]);
            }

            $isPermanentBackofficeLink = $magicLink->entry_context === 'backoffice_permanent';
            $isReusableBackofficeLink = in_array($magicLink->entry_context, [
                'backoffice_permanent',
                'backoffice_reusable',
            ], true);

            if ($magicLink->used_at && ! $isReusableBackofficeLink) {
                throw ValidationException::withMessages([
                    'token' => ['Эта ссылка уже была использована. Запросите новую.'],
                ]);
            }

            if (! $isPermanentBackofficeLink && (! $magicLink->expires_at || $magicLink->expires_at->isPast())) {
                throw ValidationException::withMessages([
                    'token' => ['Срок действия ссылки истёк. Запросите новую ссылку для входа.'],
                ]);
            }

            $user = $magicLink->user;

            if (! $user || $user->status !== 'active') {
                throw ValidationException::withMessages([
                    'token' => ['Для этой ссылки не найден активный пользователь.'],
                ]);
            }

            if (! $isReusableBackofficeLink) {
                $magicLink->update([
                    'used_at' => now(),
                ]);
            }

            $user->forceFill([
                'email_verified_at' => $user->email_verified_at ?? now(),
                'last_login_at' => now(),
            ])->save();

            $redirectPath = $magicLink->redirect_path ?: (str_starts_with($magicLink->entry_context, 'backoffice') ? '/' : '/cabinet');
            $redirectTo = rtrim($magicLink->frontend_base_url ?: '', '/').$redirectPath;

            return [$user->fresh(['roles', 'guide']), $redirectTo];
        });

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Вход выполнен по ссылке.',
            'redirect_to' => $redirectTo,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'email_verified' => $user->hasVerifiedEmail(),
                'last_login_at' => optional($user->last_login_at)?->toIso8601String(),
                'roles' => $user->roles->map(fn ($role) => [
                    'id' => $role->id,
                    'slug' => $role->slug,
                    'name' => $role->name,
                ])->values(),
                'guide' => $user->guide ? [
                    'id' => $user->guide->id,
                    'slug' => $user->guide->slug,
                    'display_name' => $user->guide->display_name,
                ] : null,
            ],
        ]);
    }

    private function resolveEntryContext(Request $request): string
    {
        $host = mb_strtolower((string) $request->getHost());

        return in_array($host, self::BACKOFFICE_HOSTS, true)
            ? 'backoffice'
            : 'public';
    }

    private function frontendBaseUrlForContext(string $context, Request $request): string
    {
        $currentBase = rtrim($request->getSchemeAndHttpHost(), '/');
        $host = mb_strtolower((string) $request->getHost());

        if ($context === 'backoffice' && in_array($host, self::BACKOFFICE_HOSTS, true)) {
            return $currentBase;
        }

        if ($context === 'public' && in_array($host, ['audio42.onff.ru', 'audiogid42.ru', 'www.audiogid42.ru'], true)) {
            return $currentBase;
        }

        return $context === 'backoffice'
            ? rtrim((string) env('APP_BACKOFFICE_URL', 'https://back.audio42.onff.ru'), '/')
            : rtrim((string) env('APP_FRONTEND_URL', 'https://audiogid42.ru'), '/');
    }

    private function expiresLabel(): string
    {
        return self::EXPIRE_HOURS.' часа';
    }
}
