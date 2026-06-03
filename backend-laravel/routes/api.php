<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminContactRequestController;
use App\Http\Controllers\Api\Admin\AdminAdBannerController;
use App\Http\Controllers\Api\Admin\AdminGuideController;
use App\Http\Controllers\Api\Admin\AdminPointController;
use App\Http\Controllers\Api\Admin\AdminPromoCodeController;
use App\Http\Controllers\Api\Admin\AdminReportController;
use App\Http\Controllers\Api\Admin\AdminSearchEngineStatusController;
use App\Http\Controllers\Api\Admin\AdminTrafficController;
use App\Http\Controllers\Api\Admin\AdminTourController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\AccountContactController;
use App\Http\Controllers\Api\CabinetController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\Guide\GuideDashboardController;
use App\Http\Controllers\Api\Guide\GuidePointController;
use App\Http\Controllers\Api\Guide\GuideProfileController;
use App\Http\Controllers\Api\Guide\GuideTourController;
use App\Http\Controllers\Api\Guide\GuideTrackController;
use App\Http\Controllers\Api\Guide\GuideImageController;
use App\Http\Controllers\Api\Guide\GuideAudioController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\InternalGuideAudioStreamController;
use App\Http\Controllers\Api\MapController;
use App\Http\Controllers\Api\MagicLoginController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\PhoneLoginController;
use App\Http\Controllers\Api\PublicAnalyticsController;
use App\Http\Controllers\Api\PublicAdBannerController;
use App\Http\Controllers\Api\PublicContactController;
use App\Http\Controllers\Api\PublicGuideController;
use App\Http\Controllers\Api\PublicGuideAudioStreamController;
use App\Http\Controllers\Api\PublicTrackStreamController;
use App\Http\Controllers\Api\PublicTourController;
use App\Http\Controllers\Api\InternalTrackStreamController;
use App\Http\Controllers\Api\TourRatingController;
use App\Http\Controllers\Api\VerificationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class)->name('api.health');
Route::post('/payments/webhooks/yookassa', [CheckoutController::class, 'webhook'])->name('api.payments.webhooks.yookassa');
Route::post('/payments/webhooks/tbank', [CheckoutController::class, 'webhook'])->name('api.payments.webhooks.tbank');

Route::middleware('web')->group(function () {
    Route::get('/public/tours', [PublicTourController::class, 'index'])->name('api.public.tours.index');
    Route::get('/public/ad-banners', [PublicAdBannerController::class, 'index'])->name('api.public.ad-banners.index');
    Route::get('/public/tours/{slug}', [PublicTourController::class, 'show'])->name('api.public.tours.show');
    Route::post('/public/tours/{slug}/rating', [TourRatingController::class, 'store'])
        ->middleware('throttle:12,1')
        ->name('api.public.tours.rating.store');
    Route::get('/public/tracks/{track}/stream', PublicTrackStreamController::class)->name('api.public.tracks.stream');
    Route::get('/public/guides', [PublicGuideController::class, 'index'])->name('api.public.guides.index');
    Route::get('/public/guides/{guide}/about-audio', PublicGuideAudioStreamController::class)->name('api.public.guides.about-audio');
    Route::get('/public/guides/{slug}', [PublicGuideController::class, 'show'])->name('api.public.guides.show');
    Route::get('/public/map/points', [MapController::class, 'points'])->name('api.public.map.points');
    Route::get('/public/tours/{slug}/map', [MapController::class, 'tourMap'])->name('api.public.tours.map');
    Route::post('/public/analytics/page-views', [PublicAnalyticsController::class, 'store'])->name('api.public.analytics.page-views.store');
    Route::post('/public/contact-requests', [PublicContactController::class, 'store'])->name('api.public.contact-requests.store');
    Route::post('/checkout/preview', [CheckoutController::class, 'preview'])->name('api.checkout.preview');
    Route::post('/checkout/create-order', [CheckoutController::class, 'createOrder'])->name('api.checkout.create-order');
    Route::get('/checkout/orders/{orderNumber}', [CheckoutController::class, 'orderStatus'])->name('api.checkout.orders.show');
    Route::get('/checkout/success', [CheckoutController::class, 'success'])->name('api.checkout.success');
    Route::post('/account/email/confirm', [AccountContactController::class, 'confirmEmailChange'])
        ->middleware('throttle:12,1')
        ->name('api.account.email.confirm');

    Route::get('/csrf-token', function (Request $request) {
        return response()->json([
            'csrf_token' => csrf_token(),
            'authenticated' => $request->user() !== null,
        ])->withHeaders([
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    })->name('api.csrf-token');

    Route::middleware('guest')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->name('api.register');
        Route::post('/login', [AuthController::class, 'login'])->name('api.login');
        Route::post('/forgot-password', [PasswordController::class, 'sendResetLink'])->name('api.password.email');
        Route::post('/reset-password', [PasswordController::class, 'reset'])->name('api.password.reset');
        Route::post('/magic-login/request', [MagicLoginController::class, 'requestLink'])
            ->middleware('throttle:6,1')
            ->name('api.magic-login.request');
        Route::post('/magic-login/consume', [MagicLoginController::class, 'consume'])->name('api.magic-login.consume');
        Route::post('/phone-login/request', [PhoneLoginController::class, 'requestCode'])
            ->middleware('throttle:6,1')
            ->name('api.phone-login.request');
        Route::post('/phone-login/verify', [PhoneLoginController::class, 'verify'])
            ->middleware('throttle:12,1')
            ->name('api.phone-login.verify');
    });

    Route::middleware('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me'])->name('api.me');
        Route::get('/cabinet/overview', [CabinetController::class, 'overview'])->name('api.cabinet.overview');
        Route::get('/internal/tracks/{track}/stream', InternalTrackStreamController::class)->name('api.internal.tracks.stream');
        Route::get('/internal/guides/{guide}/about-audio', InternalGuideAudioStreamController::class)->name('api.internal.guides.about-audio');
        Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
        Route::post('/email/verification-notification', [VerificationController::class, 'resend'])
            ->middleware('throttle:6,1')
            ->name('api.verification.send');
        Route::post('/account/phone/request', [AccountContactController::class, 'requestPhoneCode'])
            ->middleware('throttle:6,1')
            ->name('api.account.phone.request');
        Route::post('/account/phone/verify', [AccountContactController::class, 'verifyPhoneCode'])
            ->middleware('throttle:12,1')
            ->name('api.account.phone.verify');
        Route::post('/account/email/request', [AccountContactController::class, 'requestEmailChange'])
            ->middleware('throttle:6,1')
            ->name('api.account.email.request');

        Route::prefix('/guide')->group(function () {
            Route::get('/dashboard/summary', [GuideDashboardController::class, 'summary'])->name('api.guide.dashboard.summary');
            Route::get('/reports/dynamics', [GuideDashboardController::class, 'dynamics'])->name('api.guide.reports.dynamics');
            Route::get('/reports/sales-table', [GuideDashboardController::class, 'salesTable'])->name('api.guide.reports.sales');
            Route::get('/reports/settlements', [GuideDashboardController::class, 'settlements'])->name('api.guide.reports.settlements');
            Route::post('/uploads/images', [GuideImageController::class, 'store'])->name('api.guide.uploads.images.store');
            Route::post('/uploads/audio', [GuideAudioController::class, 'store'])->name('api.guide.uploads.audio.store');
            Route::get('/profile', [GuideProfileController::class, 'show'])->name('api.guide.profile.show');
            Route::patch('/profile', [GuideProfileController::class, 'update'])->name('api.guide.profile.update');

            Route::get('/tours', [GuideTourController::class, 'index'])->name('api.guide.tours.index');
            Route::post('/tours', [GuideTourController::class, 'store'])->name('api.guide.tours.store');
            Route::get('/tours/{tour}', [GuideTourController::class, 'show'])->name('api.guide.tours.show');
            Route::patch('/tours/{tour}', [GuideTourController::class, 'update'])->name('api.guide.tours.update');
            Route::delete('/tours/{tour}', [GuideTourController::class, 'destroy'])->name('api.guide.tours.destroy');

            Route::get('/points/search', [GuidePointController::class, 'search'])->name('api.guide.points.search');
            Route::post('/tours/{tour}/points', [GuidePointController::class, 'store'])->name('api.guide.tours.points.store');
            Route::patch('/tours/{tour}/points/{tourPoint}', [GuidePointController::class, 'update'])->name('api.guide.tours.points.update');
            Route::delete('/tours/{tour}/points/{tourPoint}', [GuidePointController::class, 'destroy'])->name('api.guide.tours.points.destroy');
            Route::post('/tours/{tour}/tracks', [GuideTrackController::class, 'store'])->name('api.guide.tours.tracks.store');
            Route::patch('/tours/{tour}/tracks/{track}', [GuideTrackController::class, 'update'])->name('api.guide.tours.tracks.update');
            Route::delete('/tours/{tour}/tracks/{track}', [GuideTrackController::class, 'destroy'])->name('api.guide.tours.tracks.destroy');
        });

        Route::prefix('/admin')->group(function () {
            Route::get('/dashboard/summary', [AdminDashboardController::class, 'summary'])->name('api.admin.dashboard.summary');
            Route::get('/search-engines/status', [AdminSearchEngineStatusController::class, 'show'])->name('api.admin.search-engines.status');
            Route::get('/traffic/summary', [AdminTrafficController::class, 'summary'])->name('api.admin.traffic.summary');
            Route::get('/reports/dynamics', [AdminReportController::class, 'dynamics'])->name('api.admin.reports.dynamics');
            Route::get('/reports/sales-table', [AdminReportController::class, 'salesTable'])->name('api.admin.reports.sales');
            Route::get('/reports/settlements', [AdminReportController::class, 'settlements'])->name('api.admin.reports.settlements');
            Route::post('/reports/payouts', [AdminReportController::class, 'storePayout'])->name('api.admin.reports.payouts.store');
            Route::post('/reports/orders/{orderNumber}/refund', [AdminReportController::class, 'refundOrder'])->name('api.admin.reports.orders.refund');

            Route::get('/tours', [AdminTourController::class, 'index'])->name('api.admin.tours.index');
            Route::patch('/tours/{tour}', [AdminTourController::class, 'update'])->name('api.admin.tours.update');
            Route::delete('/tours/{tour}', [AdminTourController::class, 'destroy'])->name('api.admin.tours.destroy');

            Route::get('/guides', [AdminGuideController::class, 'index'])->name('api.admin.guides.index');
            Route::patch('/guides/{guide}', [AdminGuideController::class, 'update'])->name('api.admin.guides.update');

            Route::get('/points', [AdminPointController::class, 'index'])->name('api.admin.points.index');
            Route::post('/points', [AdminPointController::class, 'store'])->name('api.admin.points.store');
            Route::patch('/points/{point}', [AdminPointController::class, 'update'])->name('api.admin.points.update');
            Route::delete('/points/{point}', [AdminPointController::class, 'destroy'])->name('api.admin.points.destroy');

            Route::get('/promo-codes', [AdminPromoCodeController::class, 'index'])->name('api.admin.promo-codes.index');
            Route::post('/promo-codes', [AdminPromoCodeController::class, 'store'])->name('api.admin.promo-codes.store');
            Route::patch('/promo-codes/{promoCode}', [AdminPromoCodeController::class, 'update'])->name('api.admin.promo-codes.update');

            Route::get('/ad-banners', [AdminAdBannerController::class, 'index'])->name('api.admin.ad-banners.index');
            Route::post('/ad-banners', [AdminAdBannerController::class, 'store'])->name('api.admin.ad-banners.store');
            Route::patch('/ad-banners/{adBanner}', [AdminAdBannerController::class, 'update'])->name('api.admin.ad-banners.update');
            Route::delete('/ad-banners/{adBanner}', [AdminAdBannerController::class, 'destroy'])->name('api.admin.ad-banners.destroy');

            Route::get('/users', [AdminUserController::class, 'index'])->name('api.admin.users.index');
            Route::post('/users', [AdminUserController::class, 'store'])->name('api.admin.users.store');
            Route::put('/users/{user}/roles', [AdminUserController::class, 'syncRoles'])->name('api.admin.users.roles.sync');

            Route::get('/contact-requests', [AdminContactRequestController::class, 'index'])->name('api.admin.contact-requests.index');
            Route::patch('/contact-requests/{contactRequest}', [AdminContactRequestController::class, 'update'])->name('api.admin.contact-requests.update');
        });
    });
});
