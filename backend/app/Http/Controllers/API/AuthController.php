<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\AuthResource;
use App\Services\AuthService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
        $user = $request->user();

        // Sanitize & normalize empty strings and phone format
        if ($request->has('email') && trim((string) $request->email) === '') {
            $request->merge(['email' => null]);
        }

        if ($request->has('phone')) {
            $rawPhone = trim((string) $request->phone);
            if ($rawPhone === '') {
                $request->merge(['phone' => null]);
            } else {
                $cleaned = preg_replace('/[^\d+]/', '', $rawPhone);
                if (str_starts_with($cleaned, '0')) {
                    $cleaned = '+251' . substr($cleaned, 1);
                } elseif (str_starts_with($cleaned, '9') && strlen($cleaned) === 9) {
                    $cleaned = '+251' . $cleaned;
                } elseif (str_starts_with($cleaned, '7') && strlen($cleaned) === 9) {
                    $cleaned = '+251' . $cleaned;
                } elseif (str_starts_with($cleaned, '251')) {
                    $cleaned = '+' . $cleaned;
                }
                $request->merge(['phone' => $cleaned]);
            }
        }

        $request->validate([
            'name'       => 'sometimes|required|string|max:255',
            'email'      => ['sometimes', 'nullable', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'phone'      => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($user->id)],
            'language'   => 'sometimes|required|string|in:en,am,om,ti',
            'push_token' => 'sometimes|nullable|string|max:500',
        ], [
            'name.required' => 'Full name cannot be empty.',
            'email.email'   => 'Please enter a valid email address.',
            'email.unique'  => 'This email address is already associated with another account.',
            'phone.unique'  => 'This phone number is already registered to another account.',
            'phone.max'     => 'Phone number must not exceed 20 characters.',
        ]);

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