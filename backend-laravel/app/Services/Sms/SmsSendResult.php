<?php

namespace App\Services\Sms;

final readonly class SmsSendResult
{
    public function __construct(
        public string $provider,
        public ?string $messageId = null,
        public array $raw = [],
    ) {}
}
