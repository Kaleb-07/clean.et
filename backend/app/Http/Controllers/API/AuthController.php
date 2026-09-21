<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\AuthResource;
use App\Services\AuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    protected $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function register(RegisterRequest $request)
    {
        $user = $this->authService->register($request->validated());

        return new AuthResource($user);
    }

    public function login(LoginRequest $request)
    {
        $user = $this->authService->login($request->validated());

        if (!$user) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        return new AuthResource($user);
    }

    public function me(Request $request)
    {
        return new AuthResource($request->user());
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'name'       => 'sometimes|required|string|max:255',
            'email'      => 'sometimes|nullable|email|unique:users,email,' . $request->user()->id,
            'phone'      => 'sometimes|required|string|max:20|unique:users,phone,' . $request->user()->id,
            'language'   => 'sometimes|required|string|in:en,am,om,ti',
            'push_token' => 'sometimes|nullable|string|max:500',
        ]);

        $user = $request->user();
        $user->update($request->only('name', 'email', 'phone', 'language', 'push_token'));

        return new AuthResource($user);
    }

    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Logged out Successfully']);
    }
}