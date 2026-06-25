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

        // 2. If user is authenticated, fall back to their tenant_id
        if (!$tenantId && $request->user()) {
            $tenantId = $request->user()->tenant_id;
        }

        // 3. Fall back to the first active tenant in DB if none found
        if (!$tenantId && \Illuminate\Support\Facades\Schema::hasTable('tenants')) {
            $tenantId = Tenant::where('status', 'active')->first()?->id;
        }

        // 4. Set current tenant ID globally
        if ($tenantId) {
            Tenant::setCurrentId((int)$tenantId);
        }

        return $next($request);
    }
}
