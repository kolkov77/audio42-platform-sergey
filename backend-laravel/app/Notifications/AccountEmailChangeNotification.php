<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountEmailChangeNotification extends Notification
{
    public function __construct(
        private readonly string $confirmUrl,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Подтвердите почту для Аудиогид42')
            ->greeting('Здравствуйте!')
            ->line('Для вашего кабинета Аудиогид42 запросили привязку этой электронной почты.')
            ->action('Подтвердить почту', $this->confirmUrl)
            ->line('Если вы не запрашивали привязку почты, просто проигнорируйте это письмо.')
            ->salutation('Аудиогид42');
    }
}
