<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\User;
use Illuminate\Http\Request;

trait AuthorizesBackofficeRoles
{
    protected function currentUser(Request $request): User
    {
        /** @var User|null $user */
        $user = $request->user();
        abort_if(! $user, 401, 'Нужна авторизация.');

        return $user;
    }

    protected function requireAnyRole(Request $request, array $roleSlugs): User
    {
        $user = $this->currentUser($request);

        abort_if(! $user->hasAnyRole($roleSlugs), 403, 'Недостаточно прав для этого раздела.');

        return $user;
    }
}
