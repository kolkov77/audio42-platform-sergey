<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends BaseVerifyEmail
{
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Подтвердите почту для Аудиогид42')
            ->greeting('Здравствуйте!')
            ->line('Спасибо за регистрацию. Подтвердите ваш адрес электронной почты, чтобы получить доступ к личному кабинету и купленным маршрутам.')
            ->action('Подтвердить почту', $this->verificationUrl($notifiable))
            ->line('Если вы не создавали аккаунт, просто проигнорируйте это письмо.')
            ->salutation('Аудиогиды по Кемерово');
    }

    protected function verificationUrl($notifiable): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(Config::get('auth.verification.expire', 60)),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ],
        );
    }
}
