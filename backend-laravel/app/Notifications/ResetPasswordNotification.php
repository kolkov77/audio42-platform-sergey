<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public function __construct(private readonly string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $hasBackofficeRole = method_exists($notifiable, 'hasAnyRole')
            && $notifiable->hasAnyRole(['admin', 'accountant', 'guide']);
        $frontendBaseUrl = rtrim((string) (
            $hasBackofficeRole
                ? env('APP_BACKOFFICE_URL', env('APP_FRONTEND_URL', config('app.url')))
                : env('APP_FRONTEND_URL', config('app.url'))
        ), '/');
        $resetUrl = $frontendBaseUrl.'/reset-password/'.$this->token.'?email='.urlencode($notifiable->getEmailForPasswordReset());

        return (new MailMessage)
            ->subject('Сброс пароля для Аудиогид42')
            ->greeting('Здравствуйте!')
            ->line('Для вашего аккаунта запросили сброс пароля.')
            ->action('Сбросить пароль', $resetUrl)
            ->line('Ссылка действует ограниченное время. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.')
            ->salutation('Аудиогиды по Кемерово');
    }
}
