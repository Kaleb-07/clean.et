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
        return User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => bcrypt($data['password'] ?? 'password'),
            'role' => 'customer',
        ]);
    }

    public function update($id, $data)
    {
        $user = User::where('role', 'customer')->findOrFail($id);

        if (isset($data['password'])) {
            $data['password'] = bcrypt($data['password']);
        }

        $user->update($data);

        return $user;
    }
}