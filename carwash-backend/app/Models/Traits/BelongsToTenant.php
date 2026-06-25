<?php

namespace App\Models\Traits;

use App\Models\Tenant;
use App\Models\Scopes\TenantScope;

trait BelongsToTenant
{
    public static function bootBelongsToTenant()
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function ($model) {
            if (!$model->tenant_id && Tenant::getCurrentId() !== null) {
                $model->tenant_id = Tenant::getCurrentId();
            }
        });
    }
}
