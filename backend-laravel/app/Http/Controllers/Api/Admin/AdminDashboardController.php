<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\Guide;
use App\Models\Order;
use App\Models\PageView;
use App\Models\PromoCode;
use App\Models\Tour;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    use AuthorizesBackofficeRoles;

    public function summary(Request $request): JsonResponse
    {
        $user = $this->requireAnyRole($request, ['admin', 'accountant']);
        $paidOrders = Order::query()->where('status', 'paid');
        $pageViews = PageView::query();
        $entryPoints = PageView::query()->where('is_entry', true);

        $topEntrySources = PageView::query()
            ->where('is_entry', true)
            ->selectRaw('COALESCE(source_label, "direct") as source_label, COUNT(*) as hits')
            ->groupBy('source_label')
            ->orderByDesc('hits')
            ->limit(5)
            ->get()
            ->map(fn (PageView $row) => [
                'label' => $row->source_label ?: 'direct',
                'hits' => (int) $row->hits,
            ])
            ->values();

        $topLandingPages = PageView::query()
            ->where('is_entry', true)
            ->selectRaw('page_path, COUNT(*) as hits')
            ->groupBy('page_path')
            ->orderByDesc('hits')
            ->limit(5)
            ->get()
            ->map(fn (PageView $row) => [
                'path' => $row->page_path,
                'hits' => (int) $row->hits,
            ])
            ->values();

        return response()->json([
            'viewer' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles()->get(['roles.id', 'roles.slug', 'roles.name']),
            ],
            'summary' => [
                'sales_rub' => (float) $paidOrders->sum('total_rub'),
                'orders_paid_count' => (int) $paidOrders->count(),
                'users_count' => (int) User::query()->count(),
                'guides_count' => (int) Guide::query()->count(),
                'published_tours_count' => (int) Tour::query()->where('status', 'published')->count(),
                'promo_codes_active_count' => (int) PromoCode::query()->where('is_active', true)->count(),
                'contact_requests_new_count' => (int) ContactRequest::query()->where('status', 'new')->count(),
                'visits_count' => (int) $pageViews->count(),
                'entry_points_count' => (int) $entryPoints->count(),
            ],
            'notes' => [
                'traffic_analytics' => 'Внутренняя аналитика уже фиксирует просмотры страниц и первые точки входа без внешних сервисов.',
                'top_entry_sources' => $topEntrySources,
                'top_landing_pages' => $topLandingPages,
            ],
        ]);
    }
}
