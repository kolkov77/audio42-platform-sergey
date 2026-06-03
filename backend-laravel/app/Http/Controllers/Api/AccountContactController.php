<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountEmailChangeRequest;
use App\Models\PhoneLoginCode;
use App\Models\User;
use App\Notifications\AccountEmailChangeNotification;
use App\Services\Sms\SmsSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AccountContactController extends Controller
{
    private const PHONE_PURPOSE = 'account_phone';
    private const MAX_ATTEMPTS = 5;

    public function __construct(private readonly SmsSender $smsSender) {}

    public function requestPhoneCode(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
        ], [
            'phone.required' => 'Укажите телефон.',
        ]);

        $phone = $this->normalizePhone((string) $validated['phone']);
        $this->ensurePhoneIsAvailable($phone, $user);
        $this->ensureCanSendPhoneCode($phone, $request);

        $code = (string) random_int(1000, 9999);

        PhoneLoginCode::query()
            ->where('phone', $phone)
            ->where('purpose', self::PHONE_PURPOSE)
            ->whereNull('consumed_at')
            ->delete();

        $loginCode = PhoneLoginCode::query()->create([
            'phone' => $phone,
            'code_hash' => Hash::make($code),
            'purpose' => self::PHONE_PURPOSE,
            'attempts' => 0,
            'sent_at' => now(),
            'expires_at' => now()->addMinutes($this->ttlMinutes()),
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
                'phone' => ['Сейчас не удалось отправить SMS-код. Попробуйте позже.'],
            ]);
        }

        return response()->json([
            'message' => 'Если номер указан корректно, мы отправили SMS-код для привязки телефона.',
            'expires_in_seconds' => $this->ttlMinutes() * 60,
            'resend_after_seconds' => $this->resendSeconds(),
        ]);
    }

    public function verifyPhoneCode(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

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

        DB::transaction(function () use ($phone, $code, $user): void {
            $this->ensurePhoneIsAvailable($phone, $user);

            /** @var PhoneLoginCode|null $loginCode */
            $loginCode = PhoneLoginCode::query()
                ->where('phone', $phone)
                ->where('purpose', self::PHONE_PURPOSE)
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

            $loginCode->update(['consumed_at' => now()]);

            $user->forceFill([
                'phone' => $phone,
                'phone_verified_at' => now(),
            ])->save();
        });

        return response()->json([
            'message' => 'Телефон привязан к аккаунту.',
            'phone' => $phone,
        ]);
    }

    public function requestEmailChange(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
        ], [
            'email.required' => 'Укажите электронную почту.',
            'email.email' => 'Введите корректный адрес электронной почты.',
        ]);

        $email = mb_strtolower((string) $validated['email']);

        if (User::query()->where('email', $email)->whereKeyNot($user->id)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['Пользователь с такой электронной почтой уже существует.'],
            ]);
        }

        $token = Str::random(64);

        AccountEmailChangeRequest::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->delete();

        AccountEmailChangeRequest::query()->create([
            'user_id' => $user->id,
            'email' => $email,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addMinutes(60),
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
        ]);

        $baseUrl = rtrim((string) env('APP_BACKOFFICE_URL', env('APP_FRONTEND_URL', config('app.url'))), '/');
        $confirmUrl = $baseUrl.'/account/email/confirm?token='.urlencode($token);

        (new AnonymousNotifiable)
            ->route('mail', $email)
            ->notify(new AccountEmailChangeNotification($confirmUrl));

        return response()->json([
            'message' => 'Мы отправили письмо для подтверждения почты.',
        ]);
    }

    public function confirmEmailChange(Request $request): JsonResponse
    {
        $token = (string) $request->input('token', '');

        if ($token === '') {
            throw ValidationException::withMessages([
                'token' => ['Ссылка подтверждения неполная или повреждена.'],
            ]);
        }

        /** @var User $user */
        $user = DB::transaction(function () use ($token) {
            /** @var AccountEmailChangeRequest|null $changeRequest */
            $changeRequest = AccountEmailChangeRequest::query()
                ->where('token_hash', hash('sha256', $token))
                ->whereNull('consumed_at')
                ->lockForUpdate()
                ->first();

            if (! $changeRequest || $changeRequest->expires_at->isPast()) {
                throw ValidationException::withMessages([
                    'token' => ['Ссылка подтверждения недействительна или уже истекла.'],
                ]);
            }

            if (User::query()->where('email', $changeRequest->email)->whereKeyNot($changeRequest->user_id)->exists()) {
                throw ValidationException::withMessages([
                    'email' => ['Пользователь с такой электронной почтой уже существует.'],
                ]);
            }

            /** @var User $user */
            $user = User::query()
                ->whereKey($changeRequest->user_id)
                ->lockForUpdate()
                ->firstOrFail();

            $user->forceFill([
                'email' => $changeRequest->email,
                'email_verified_at' => now(),
            ])->save();

            $changeRequest->update(['consumed_at' => now()]);

            return $user;
        });

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Почта привязана к аккаунту.',
            'email' => $user->email,
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

    private function ensurePhoneIsAvailable(string $phone, User $user): void
    {
        $exists = User::query()
            ->where('phone', $phone)
            ->whereKeyNot($user->id)
            ->where('status', 'active')
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'phone' => ['Этот телефон уже привязан к другому аккаунту.'],
            ]);
        }
    }

    private function ensureCanSendPhoneCode(string $phone, Request $request): void
    {
        $recentPhoneCode = PhoneLoginCode::query()
            ->where('phone', $phone)
            ->where('purpose', self::PHONE_PURPOSE)
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

    private function ttlMinutes(): int
    {
        return max(1, (int) env('SMS_OTP_TTL_MINUTES', 10));
    }

    private function resendSeconds(): int
    {
        return max(30, (int) env('SMS_OTP_RESEND_SECONDS', 60));
    }
}
