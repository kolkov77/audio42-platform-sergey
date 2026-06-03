<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LegalConsent;
use App\Models\PhoneLoginCode;
use App\Models\User;
use App\Services\Sms\SmsSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PhoneLoginController extends Controller
{
    private const LEGAL_DOCUMENT_VERSION = '2026-04-23-v2';
    private const PURPOSE = 'login';
    private const MAX_ATTEMPTS = 5;

    public function __construct(private readonly SmsSender $smsSender) {}

    public function requestCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
            'accept_pdn' => ['accepted'],
        ], [
            'phone.required' => 'Укажите телефон.',
            'accept_pdn.accepted' => 'Нужно согласиться на обработку персональных данных.',
        ]);

        $phone = $this->normalizePhone((string) $validated['phone']);
        $this->ensureCanSendCode($phone, $request);

        $code = (string) random_int(1000, 9999);
        $expiresAt = now()->addMinutes($this->ttlMinutes());

        PhoneLoginCode::query()
            ->where('phone', $phone)
            ->where('purpose', self::PURPOSE)
            ->whereNull('consumed_at')
            ->delete();

        $loginCode = PhoneLoginCode::query()->create([
            'phone' => $phone,
            'code_hash' => Hash::make($code),
            'purpose' => self::PURPOSE,
            'attempts' => 0,
            'sent_at' => now(),
            'expires_at' => $expiresAt,
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
        ]);

        try {
            $result = $this->smsSender->send($phone, $this->messageText($code));
            $loginCode->update([
                'provider' => $result->provider,
                'provider_message_id' => $result->messageId,
            ]);
        } catch (\Throwable) {
            $loginCode->delete();

            throw ValidationException::withMessages([
                'phone' => ['Сейчас не удалось отправить SMS-код. Попробуйте позже или войдите по почте.'],
            ]);
        }

        $response = [
            'message' => 'Если номер указан корректно, мы отправили SMS-код для входа.',
            'expires_in_seconds' => $this->ttlMinutes() * 60,
            'resend_after_seconds' => $this->resendSeconds(),
        ];

        if (
            app()->environment(['local', 'testing'])
            && filter_var(env('SMS_DEBUG_CODE', false), FILTER_VALIDATE_BOOLEAN)
        ) {
            $response['debug_code'] = $code;
        }

        return response()->json($response);
    }

    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
            'code' => ['required', 'string', 'size:4'],
        ], [
            'phone.required' => 'Укажите телефон.',
            'code.required' => 'Введите код из SMS.',
            'code.size' => 'Код должен состоять из 4 цифр.',
        ]);

        $phone = $this->normalizePhone((string) $validated['phone']);
        $code = preg_replace('/\D+/', '', (string) $validated['code']) ?: '';

        /** @var User $user */
        $user = DB::transaction(function () use ($phone, $code, $request) {
            /** @var PhoneLoginCode|null $loginCode */
            $loginCode = PhoneLoginCode::query()
                ->where('phone', $phone)
                ->where('purpose', self::PURPOSE)
                ->whereNull('consumed_at')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            if (! $loginCode || $loginCode->expires_at->isPast()) {
                throw ValidationException::withMessages([
                    'code' => ['Код недействителен или уже истёк. Запросите новый SMS-код.'],
                ]);
            }

            if ($loginCode->attempts >= self::MAX_ATTEMPTS) {
                throw ValidationException::withMessages([
                    'code' => ['Слишком много попыток ввода кода. Запросите новый SMS-код.'],
                ]);
            }

            $loginCode->increment('attempts');

            if (! Hash::check($code, $loginCode->code_hash)) {
                throw ValidationException::withMessages([
                    'code' => ['Неверный код из SMS.'],
                ]);
            }

            $loginCode->update([
                'consumed_at' => now(),
            ]);

            $user = User::query()
                ->where('phone', $phone)
                ->first();

            if ($user && $user->status !== 'active') {
                throw ValidationException::withMessages([
                    'phone' => ['Пользователь с этим телефоном сейчас неактивен.'],
                ]);
            }

            if (! $user) {
                $user = User::query()->create([
                    'name' => 'Пользователь '.Str::of($phone)->substr(-4),
                    'email' => $this->syntheticEmail($phone),
                    'email_verified_at' => now(),
                    'phone' => $phone,
                    'phone_verified_at' => now(),
                    'password' => Str::random(32),
                    'status' => 'active',
                ]);

                LegalConsent::query()->create([
                    'user_id' => $user->id,
                    'email_snapshot' => $user->email,
                    'consent_type' => 'phone_login_pdn',
                    'document_version' => self::LEGAL_DOCUMENT_VERSION,
                    'accepted_at' => now(),
                    'ip_address' => $request->ip(),
                    'user_agent' => (string) $request->userAgent(),
                ]);
            }

            $user->forceFill([
                'phone_verified_at' => $user->phone_verified_at ?? now(),
                'email_verified_at' => $user->email_verified_at ?? now(),
                'last_login_at' => now(),
            ])->save();

            return $user->fresh(['roles', 'guide']);
        });

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Вход по SMS выполнен.',
            'user' => $this->serializeUser($user),
        ]);
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: '';

        if (str_starts_with($digits, '8') && mb_strlen($digits) === 11) {
            $digits = '7'.mb_substr($digits, 1);
        }

        if (mb_strlen($digits) === 10) {
            $digits = '7'.$digits;
        }

        if (! preg_match('/^7\d{10}$/', $digits)) {
            throw ValidationException::withMessages([
                'phone' => ['Введите российский номер телефона в формате +7XXXXXXXXXX.'],
            ]);
        }

        return '+'.$digits;
    }

    private function ensureCanSendCode(string $phone, Request $request): void
    {
        $recentPhoneCode = PhoneLoginCode::query()
            ->where('phone', $phone)
            ->where('purpose', self::PURPOSE)
            ->where('sent_at', '>=', now()->subSeconds($this->resendSeconds()))
            ->exists();

        if ($recentPhoneCode) {
            throw ValidationException::withMessages([
                'phone' => ['Код уже отправлен. Повторно запросить SMS можно через минуту.'],
            ]);
        }

        $recentIpCount = PhoneLoginCode::query()
            ->where('ip_address', $request->ip())
            ->where('sent_at', '>=', now()->subMinutes(10))
            ->count();

        if ($recentIpCount >= 8) {
            throw ValidationException::withMessages([
                'phone' => ['Слишком много запросов SMS-кода. Попробуйте позже.'],
            ]);
        }
    }

    private function messageText(string $code): string
    {
        return 'Код доступа к Аудиогид42: '.$code;
    }

    private function syntheticEmail(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?: Str::random(12);

        return 'phone-'.$digits.'@sms.audiogid42.local';
    }

    private function ttlMinutes(): int
    {
        return max(1, (int) env('SMS_OTP_TTL_MINUTES', 10));
    }

    private function resendSeconds(): int
    {
        return max(30, (int) env('SMS_OTP_RESEND_SECONDS', 60));
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
            'roles' => $user->roles
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
