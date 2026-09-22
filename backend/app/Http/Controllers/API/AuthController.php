<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\AuthResource;
use App\Services\AuthService;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService,
        protected NotificationService $notifications,
    ) {}

    public function register(RegisterRequest $request)
    {
        $user = $this->authService->register($request->validated());

        // Welcome notification for new users
        $this->notifications->notifyRegistration($user);

        return new AuthResource($user);
    }

    public function login(LoginRequest $request)
    {
        $user = $this->authService->login($request->validated());

        if (!$user) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // Login notification
        $this->notifications->notifyLogin($user);

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

        // Only notify if something other than push_token changed
        $changed = array_diff_key(
            $request->only('name', 'email', 'phone', 'language'),
            ['push_token' => true]
        );
        if (!empty($changed)) {
            $this->notifications->notifyProfileUpdated($user);
        }

        return new AuthResource($user);
    }

    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Logged out Successfully']);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password'      => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!\Illuminate\Support\Facades\Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'The current password is incorrect.',
            ], 422);
        }

        $user->password = \Illuminate\Support\Facades\Hash::make($request->password);
        $user->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Password updated successfully.',
        ]);
    }
}