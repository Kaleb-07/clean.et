<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Services\CustomerService;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    protected $customerService;

    public function __construct(CustomerService $customerService)
    {
        $this->customerService = $customerService;
    }

    // GET /customers (Admin)
    public function index()
    {
        $customers = $this->customerService->getAll();
        return CustomerResource::collection($customers);
    }

    // GET /customers/{id}
    public function show($id)
    {
        $customer = $this->customerService->getById($id);
        return new CustomerResource($customer);
    }

    // POST /customers
    public function store(CustomerRequest $request)
    {
        $customer = $this->customerService->create($request->validated());
        return new CustomerResource($customer);
    }

    // PUT /customers/{id}
    public function update(CustomerRequest $request, $id)
    {
        $customer = $this->customerService->update($id, $request->validated());
        return new CustomerResource($customer);
    }
}