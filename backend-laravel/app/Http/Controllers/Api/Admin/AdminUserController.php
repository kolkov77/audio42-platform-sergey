<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    use AuthorizesBackofficeRoles;

    public function index(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin']);

        $users = User::query()
            ->with(['roles', 'guide'])
            ->whereHas('roles', fn ($query) => $query->whereIn('slug', ['admin', 'accountant', 'guide']))
            ->orderByDesc('id')
            ->get()
            ->map(fn (User $user) => $this->serializeUser($user));

        $roles = Role::query()->orderBy('id')->get(['id', 'slug', 'name']);

        return response()->json([
            'users' => $users,
            'roles' => $roles,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $admin = $this->requireAnyRole($request, ['admin']);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'status' => ['nullable', 'string', Rule::in(['active', 'disabled'])],
            'role_slugs' => ['array'],
            'role_slugs.*' => ['string', Rule::in(['admin', 'accountant', 'guide'])],
            'guide_display_name' => ['nullable', 'string', 'max:255'],
            'guide_slug' => ['nullable', 'string', 'max:255'],
            'guide_reward_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ], [
            'name.required' => 'Укажите имя пользователя.',
            'email.required' => 'Укажите почту пользователя.',
            'email.email' => 'Укажите корректную почту.',
            'email.unique' => 'Пользователь с такой почтой уже существует.',
            'password.required' => 'Укажите пароль.',
            'password.min' => 'Пароль должен быть не короче 8 символов.',
            'role_slugs.array' => 'Роли должны передаваться списком.',
            'role_slugs.*.in' => 'Выбрана неизвестная роль пользователя.',
            'guide_display_name.max' => 'Имя экскурсовода не должно быть длиннее 255 символов.',
            'guide_slug.max' => 'Адрес профиля экскурсовода не должен быть длиннее 255 символов.',
        ]);

        $user = DB::transaction(function () use ($validated, $admin) {
            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => mb_strtolower($validated['email']),
                'password' => $validated['password'],
                'status' => $validated['status'] ?? 'active',
            ]);

            $this->syncRoleAssignments($user, $validated['role_slugs'] ?? [], $admin->id);

            if (in_array('guide', $validated['role_slugs'] ?? [], true)) {
                Guide::query()->create([
                    'user_id' => $user->id,
                    'slug' => $this->uniqueGuideSlug($validated['guide_slug'] ?? $validated['guide_display_name'] ?? $validated['name']),
                    'display_name' => $validated['guide_display_name'] ?? $validated['name'],
                    'reward_percent' => $validated['guide_reward_percent'] ?? 40,
                    'is_public' => false,
                ]);
            }

            return $user->fresh(['roles', 'guide']);
        });

        return response()->json([
            'message' => 'Пользователь создан.',
            'user' => $this->serializeUser($user),
        ], 201);
    }

    public function syncRoles(Request $request, User $user): JsonResponse
    {
        $admin = $this->requireAnyRole($request, ['admin']);

        $validated = $request->validate([
            'role_slugs' => ['array'],
            'role_slugs.*' => ['string', Rule::in(['admin', 'accountant', 'guide'])],
        ]);

        DB::transaction(function () use ($validated, $user, $admin): void {
            $this->syncRoleAssignments($user, $validated['role_slugs'] ?? [], $admin->id);

            $needsGuide = in_array('guide', $validated['role_slugs'] ?? [], true);

            if ($needsGuide && ! $user->guide) {
                Guide::query()->create([
                    'user_id' => $user->id,
                    'slug' => $this->uniqueGuideSlug($user->name),
                    'display_name' => $user->name,
                    'reward_percent' => 40,
                    'is_public' => false,
                ]);
            }
        });

        return response()->json([
            'message' => 'Роли обновлены.',
            'user' => $this->serializeUser($user->fresh(['roles', 'guide'])),
        ]);
    }

    private function syncRoleAssignments(User $user, array $roleSlugs, int $assignedByUserId): void
    {
        $roleIds = Role::query()
            ->whereIn('slug', $roleSlugs)
            ->pluck('id')
            ->all();

        $syncPayload = [];
        foreach ($roleIds as $roleId) {
            $syncPayload[$roleId] = [
                'assigned_by_user_id' => $assignedByUserId,
            ];
        }

        $user->roles()->sync($syncPayload);
    }

    private function uniqueGuideSlug(string $value): string
    {
        $base = Str::slug($value, '-');
        $base = $base !== '' ? $base : 'guide';
        $slug = $base;
        $index = 2;

        while (Guide::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$index;
            $index++;
        }

        return $slug;
    }

    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
            'last_login_at' => optional($user->last_login_at)?->toIso8601String(),
            'roles' => $user->roles->map(fn ($role) => [
                'id' => $role->id,
                'slug' => $role->slug,
                'name' => $role->name,
            ])->values(),
            'guide' => $user->guide ? [
                'id' => $user->guide->id,
                'slug' => $user->guide->slug,
                'display_name' => $user->guide->display_name,
                'reward_percent' => $user->guide->rewardPercent(),
            ] : null,
        ];
    }
}
