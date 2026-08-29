<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class CustomerService
{
    public function getAll()
    {
        return User::where('role', 'customer')->latest()->get();
    }

    public function getById($id)
    {
        return User::where('role', 'customer')->findOrFail($id);
    }

    public function create($data)
    {
        $name = trim($data['name']);
        
        $email = !empty($data['email']) ? trim($data['email']) : null;
        if (!$email || User::where('email', $email)->exists()) {
            $email = 'client_' . time() . '_' . rand(100, 999) . '@clean.et';
        }

        $phone = !empty($data['phone']) ? trim($data['phone']) : null;
        if ($phone && User::where('phone', $phone)->exists()) {
            $phone = '+2519' . rand(10000000, 99999999);
        }

        return User::create([
            'name'     => $name,
            'email'    => $email,
            'phone'    => $phone,
            'password' => Hash::make($data['password'] ?? 'password123'),
            'role'     => 'customer',
        ]);
    }

    public function update($id, $data)
    {
        $user = User::where('role', 'customer')->findOrFail($id);

        $updateData = [];
        if (!empty($data['name'])) {
            $updateData['name'] = trim($data['name']);
        }

        if (!empty($data['email'])) {
            $email = trim($data['email']);
            // Only update email if it belongs to this user or is not taken by another user
            $existsOther = User::where('email', $email)->where('id', '!=', $id)->exists();
            if (!$existsOther) {
                $updateData['email'] = $email;
            }
        }

        if (array_key_exists('phone', $data)) {
            $phone = $data['phone'] ? trim($data['phone']) : null;
            if ($phone) {
                $existsOther = User::where('phone', $phone)->where('id', '!=', $id)->exists();
                if (!$existsOther) {
                    $updateData['phone'] = $phone;
                }
            } else {
                $updateData['phone'] = null;
            }
        }

        if (!empty($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
        }

        if (!empty($updateData)) {
            $user->update($updateData);
        }

        return $user;
    }

    public function delete($id)
    {
        $user = User::where('role', 'customer')->findOrFail($id);
        $user->tokens()->delete();
        $user->delete();
        return true;
    }
}