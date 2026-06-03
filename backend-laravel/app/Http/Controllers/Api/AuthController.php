<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LegalConsent;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const LEGAL_DOCUMENT_VERSION = '2026-04-23-v2';

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', 'min:8'],
            'accept_pdn' => ['accepted'],
        ], [
            'name.required' => 'Укажите имя.',
            'email.required' => 'Укажите электронную почту.',
            'email.email' => 'Введите корректный адрес электронной почты.',
            'email.unique' => 'Пользователь с такой электронной почтой уже существует.',
            'password.required' => 'Укажите пароль.',
            'password.confirmed' => 'Подтверждение пароля не совпадает.',
            'password.min' => 'Пароль должен быть не короче 8 символов.',
            'accept_pdn.accepted' => 'Нужно согласиться на обработку персональных данных.',
        ]);

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'status' => 'active',
        ]);

        LegalConsent::query()->create([
            'user_id' => $user->id,
            'email_snapshot' => $validated['email'],
            'consent_type' => 'registration_pdn',
            'document_version' => self::LEGAL_DOCUMENT_VERSION,
            'accepted_at' => now(),
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
        ]);

        Auth::login($user);
        $request->session()->regenerate();
        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Регистрация завершена. Проверьте почту для подтверждения адреса.',
            'user' => $this->serializeUser($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ], [
            'email.required' => 'Укажите электронную почту.',
            'email.email' => 'Введите корректный адрес электронной почты.',
            'password.required' => 'Укажите пароль.',
        ]);

        if (! Auth::attempt(
            ['email' => $credentials['email'], 'password' => $credentials['password']],
            (bool) ($credentials['remember'] ?? false)
        )) {
            throw ValidationException::withMessages([
                'email' => ['Неверная электронная почта или пароль.'],
            ]);
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = $request->user();
        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Вход выполнен.',
            'user' => $this->serializeUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Вы вышли из кабинета.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'user' => null,
            ], 401);
        }

        return response()->json([
            'user' => $this->serializeUser($user),
        ]);
    }

    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'status' => $user->status,
            'email_verified' => $user->hasVerifiedEmail(),
            'phone_verified' => $user->phone_verified_at !== null,
            'last_login_at' => optional($user->last_login_at)?->toIso8601String(),
            'roles' => $user->roles()
                ->orderBy('roles.id')
                ->get(['roles.id', 'roles.slug', 'roles.name'])
                ->map(fn ($role) => [
                    'id' => $role->id,
                    'slug' => $role->slug,
                    'name' => $role->name,
                ])
                ->values(),
            'guide' => $user->guide ? [
                'id' => $user->guide->id,
                'slug' => $user->guide->slug,
                'display_name' => $user->guide->display_name,
            ] : null,
        ];
    }
}
