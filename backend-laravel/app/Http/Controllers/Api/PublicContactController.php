<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\LegalConsent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PublicContactController extends Controller
{
    private const LEGAL_DOCUMENT_VERSION = '2026-04-23-v2';

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:feedback,claim,guide_application'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
            'accept_pdn' => ['accepted'],
        ], [
            'type.required' => 'Выберите тип обращения.',
            'type.in' => 'Неизвестный тип обращения.',
            'message.required' => 'Опишите суть обращения.',
            'accept_pdn.accepted' => 'Нужно согласиться на обработку персональных данных для обработки обращения.',
        ]);

        if (empty($validated['email']) && empty($validated['phone'])) {
            throw ValidationException::withMessages([
                'email' => ['Укажите email или телефон для обратной связи.'],
            ]);
        }

        ContactRequest::query()->create([
            'type' => $validated['type'],
            'name' => $validated['name'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'message' => $validated['message'],
            'status' => 'new',
        ]);

        LegalConsent::query()->create([
            'user_id' => $request->user()?->id,
            'email_snapshot' => $validated['email'] ?? null,
            'consent_type' => 'contact_request_pdn',
            'document_version' => self::LEGAL_DOCUMENT_VERSION,
            'accepted_at' => now(),
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
        ]);

        return response()->json([
            'message' => match ($validated['type']) {
                'claim' => 'Претензия принята. Мы свяжемся с вами по указанным контактам.',
                'guide_application' => 'Заявка экскурсовода принята. Мы рассмотрим её и вернёмся с обратной связью.',
                default => 'Сообщение отправлено. Спасибо за обратную связь.',
            },
        ], 201);
    }
}
