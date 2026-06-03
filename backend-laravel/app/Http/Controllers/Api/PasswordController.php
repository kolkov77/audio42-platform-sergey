<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class PasswordController extends Controller
{
    public function sendResetLink(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'Укажите электронную почту.',
            'email.email' => 'Введите корректный адрес электронной почты.',
        ]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => [$this->statusMessage($status)],
            ]);
        }

        return response()->json([
            'message' => $this->statusMessage($status),
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ], [
            'email.required' => 'Укажите электронную почту.',
            'email.email' => 'Введите корректный адрес электронной почты.',
            'password.required' => 'Укажите новый пароль.',
            'password.confirmed' => 'Подтверждение пароля не совпадает.',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [$this->statusMessage($status)],
            ]);
        }

        return response()->json([
            'message' => $this->statusMessage($status),
        ]);
    }

    private function statusMessage(string $status): string
    {
        return match ($status) {
            Password::RESET_LINK_SENT => 'Мы отправили ссылку для сброса пароля на указанную почту.',
            Password::PASSWORD_RESET => 'Пароль успешно обновлён. Теперь можно войти.',
            Password::INVALID_TOKEN => 'Ссылка для сброса пароля недействительна или устарела.',
            Password::INVALID_USER => 'Пользователь с такой электронной почтой не найден.',
            default => 'Операцию не удалось завершить.',
        };
    }
}
