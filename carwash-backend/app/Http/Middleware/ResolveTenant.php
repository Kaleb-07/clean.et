<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\Tenant;
use Illuminate\Http\Request;

class ResolveTenant
{
    public function handle(Request $request, Closure $next)
    {
        // 1. Resolve tenant ID: check header X-Tenant-ID
        $tenantId = $request->header('X-Tenant-ID');

        // 2. Resolve authenticated user (via request or sanctum guard)
        $user = $request->user() ?? auth('sanctum')->user();

        if (!$tenantId && $user) {
            $tenantId = $user->tenant_id;
        }

        // 3. Set current tenant ID globally
        if ($tenantId) {
            Tenant::setCurrentId((int)$tenantId);
        } else {
            Tenant::setCurrentId(null);
        }

        return $next($request);
    }
}
