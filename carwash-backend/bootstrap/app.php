<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
    
    // 🔥 Register route middleware
    $middleware->alias([
        'admin' => \App\Http\Middleware\AdminMiddleware::class,
    ]);

    })
   ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        });

        $exceptions->render(function (AuthenticationException $e) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        });

        $exceptions->render(function (AuthorizationException $e) {
            return response()->json(['message' => 'Forbidden.'], 403);
        });

        $exceptions->render(function (ModelNotFoundException $e) {
            return response()->json(['message' => 'Resource not found.'], 404);
        });

       $exceptions->render(function (\Throwable $e) {
        report($e);

        return response()->json([
            'message' => $e->getMessage(), // 🔥 show real error
            'trace' => $e->getTrace(),     // optional (for debugging)
          ], 500);
        });
    })->create();
