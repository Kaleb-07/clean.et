<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\ServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Services\ServiceService;

class ServiceController extends Controller
{
    protected $serviceService;

    public function __construct(ServiceService $serviceService)
    {
        $this->serviceService = $serviceService;
    }

    // GET /services
    public function index()
    {
        $services = $this->serviceService->getAll();
        return ServiceResource::collection($services);
    }

    // GET /services/{id}
    public function show($id)
    {
        $service = $this->serviceService->getById($id);
        return new ServiceResource($service);
    }

    // POST /services (Admin)
    public function store(ServiceRequest $request)
    {
        $service = $this->serviceService->create($request->validated());
        return new ServiceResource($service);
    }

    // DELETE /services/{id} (Admin)
    public function destroy($id)
    {        $this->serviceService->delete($id);
        return response()->json(['message' => 'Service deleted successfully']);
    }

    // PUT /services/{id} (Admin)
    public function update(ServiceRequest $request, $id)
    {
        $service = $this->serviceService->update($id, $request->validated());
        return new ServiceResource($service);
    }
}