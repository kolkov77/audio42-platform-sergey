<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function store(Request $request): RedirectResponse
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

        return back()->with('status', $this->statusMessage($status));
    }

    private function statusMessage(string $status): string
    {
        return match ($status) {
            Password::RESET_LINK_SENT => 'Мы отправили ссылку для сброса пароля на указанную почту.',
            Password::INVALID_USER => 'Пользователь с такой электронной почтой не найден.',
            default => 'Не удалось отправить письмо для сброса пароля.',
        };
    }
}
