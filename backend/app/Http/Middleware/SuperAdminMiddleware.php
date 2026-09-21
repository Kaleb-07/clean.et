<?php

namespace App\Http\Middleware;

use Closure;

class SuperAdminMiddleware
{
    /**
     * Restrict access to super_admin role only.
     * Use this middleware for tenant management, platform-wide configuration,
     * and cross-tenant data operations.
     */
    public function handle($request, Closure $next)
    {
        if (!$request->user() || !$request->user()->isSuperAdmin()) {
            return response()->json([
                'message' => 'Access denied. Super admin privileges required.',
            ], 403);
        }

        return $next($request);
    }
}
