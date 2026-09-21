<?php

namespace App\Http\Middleware;

use Closure;

class AdminMiddleware
{
    public function handle($request, Closure $next)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return $next($request);
    }
}