<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Enable CORS for all requests
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);
        $middleware->append(\App\Http\Middleware\ResolveTenant::class);
        $middleware->append(\App\Http\Middleware\CheckMaintenanceMode::class);

        // Register route middleware
        $middleware->alias([
            'admin'       => \App\Http\Middleware\AdminMiddleware::class,
            'super_admin' => \App\Http\Middleware\SuperAdminMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                $firstError = collect($e->errors())->flatten()->first() ?? 'Validation failed.';
                return response()->json([
                    'message' => $firstError,
                    'errors'  => $e->errors(),
                ], 422);
            }
            return null; // Let Laravel handle non‑API requests
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
            return null;
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
            return null;
        });

        $exceptions->render(function (ModelNotFoundException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Resource not found.'], 404);
            }
            return null;
        });

        // ✅ Secure generic exception handler for API requests
        $exceptions->render(function (\Throwable $e, Request $request) {
            // Only handle API requests; otherwise let Laravel's default handler run
            if ($request->expectsJson() || $request->is('api/*')) {
                // Determine HTTP status code
                $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;

                // Base error response – never leak internal details in production
                $response = [
                    'message' => $status === 500 ? 'Server Error' : ($e->getMessage() ?: 'Error'),
                ];

                // Add debug info only when APP_DEBUG=true (local/staging)
                if (config('app.debug')) {
                    $response['trace'] = $e->getTraceAsString();
                }

                // Report the exception (logs it, keeps original reporting)
                report($e);

                return response()->json($response, $status);
            }

            return null; // Let Laravel handle non‑API requests
        });
    })->create();
