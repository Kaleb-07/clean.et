<?php

namespace App\Services;

use App\Models\Service;

class ServiceService
{
    public function getAll()
    {
        return Service::latest()->get();
    }

    public function getById($id)
    {
        return Service::findOrFail($id);
    }

    public function create($data)
    {
        return Service::create($data);
    }

    public function delete($id)
    {
        $service = Service::findOrFail($id);
        $service->delete();
    }

    public function update($id, $data)
    {
        $service = Service::findOrFail($id);
        $service->update($data);

        return $service;
    }
}