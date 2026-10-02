<?php

namespace App\Services;

use App\Models\Service;

class ServiceService
{
    public function getAll(array $filters = [])
    {
        $query = Service::with(['sector', 'tenant'])->latest();

        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $query->where('category', $filters['category']);
        }
        if (!empty($filters['sector_id'])) {
            $query->where('sector_id', $filters['sector_id']);
        }
        if (!empty($filters['sub_center'])) {
            $query->where('sub_center', $filters['sub_center']);
        }

        return $query->get();
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