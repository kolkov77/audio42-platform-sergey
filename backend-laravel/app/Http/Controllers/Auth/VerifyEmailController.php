<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VerifyEmailController extends Controller
{
    public function __invoke(Request $request, string $id, string $hash): RedirectResponse|JsonResponse
    {
        $user = User::query()->findOrFail($id);

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            abort(403);
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        [$redirectTo, $message] = $this->resolveRedirectTarget($request, $user);

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Почта подтверждена. Вход выполнен автоматически.',
                    'redirect_to' => $redirectTo,
                ]);
            }

            return redirect($redirectTo);
        }

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Почта уже подтверждена. Вход выполнен автоматически.',
                'redirect_to' => $redirectTo,
            ]);
        }

        return redirect($redirectTo)->with('status', $message);
    }

    private function resolveRedirectTarget(Request $request, User $user): array
    {
        $host = mb_strtolower((string) $request->getHost());
        $backofficeHosts = [
            'back.audio42.onff.ru',
            'cabinet.audio42.onff.ru',
            'back.audiogid42.ru',
            'cabinet.audiogid42.ru',
        ];
        $publicBaseUrl = rtrim((string) env('APP_FRONTEND_URL', config('app.url')), '/');
        $backofficeBaseUrl = rtrim((string) env('APP_BACKOFFICE_URL', 'https://back.audio42.onff.ru'), '/');
        $hasBackofficeRole = $user->hasAnyRole(['admin', 'accountant', 'guide']);

        if (in_array($host, $backofficeHosts, true) && $hasBackofficeRole) {
            return [$backofficeBaseUrl.'/?verified=1', 'Почта подтверждена. Кабинет открыт автоматически.'];
        }

        if ($hasBackofficeRole && (string) $request->query('target', '') === 'backoffice') {
            return [$backofficeBaseUrl.'/?verified=1', 'Почта подтверждена. Кабинет открыт автоматически.'];
        }

        return [$publicBaseUrl.'/cabinet?verified=1', 'Почта подтверждена. Кабинет открыт автоматически.'];
    }
}
