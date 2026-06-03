<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MagicLoginNotification extends Notification
{
    public function __construct(
        private readonly string $magicUrl,
        private readonly string $expiresLabel,
        private readonly bool $backoffice
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $target = $this->backoffice ? 'в закрытый кабинет Аудиогид42' : 'в кабинет Аудиогид42';

        return (new MailMessage)
            ->subject('Ссылка для входа в Аудиогид42')
            ->greeting('Здравствуйте!')
            ->line("Мы подготовили ссылку для входа {$target} без пароля.")
            ->action('Войти по ссылке', $this->magicUrl)
            ->line("Ссылка действует {$this->expiresLabel} и сработает только один раз.")
            ->line('Если вы не запрашивали вход, просто проигнорируйте это письмо.')
            ->salutation('Аудиогиды по Кемерово');
    }
}
