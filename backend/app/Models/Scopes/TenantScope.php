<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use App\Models\Tenant;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model)
    {
        $user = auth()->user();

        // 1. Super admins bypass tenant scoping everywhere
        if ($user && $user->role === 'super_admin') {
            return;
        }

        // 2. Apply tenant scoping if current tenant ID is active
        $tenantId = Tenant::getCurrentId();
        if ($tenantId !== null && (!$user || $user->role !== 'super_admin')) {
            $builder->where($model->getTable() . '.tenant_id', $tenantId);
        }
    }
}
