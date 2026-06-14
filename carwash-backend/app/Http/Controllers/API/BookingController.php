<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\BookingRequest;
use App\Http\Resources\BookingResource;
use App\Services\BookingService;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    protected $bookingService;

    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;
    }

    // GET /bookings
    public function index(Request $request)
    {
        $bookings = $this->bookingService->getAll($request->user());
        return BookingResource::collection($bookings);
    }

    // GET /bookings/{id}
    public function show($id, Request $request)
    {
        $booking = $this->bookingService->getById($id, $request->user());
        return new BookingResource($booking);
    }

    // POST /bookings (Customer)
    public function store(BookingRequest $request)
    {
        $booking = $this->bookingService->create(
            $request->validated(),
            $request->user()
        );

        return new BookingResource($booking);
    }

    // PATCH /bookings/{id}/cancel (Customer or Admin)
    public function cancel($id, Request $request)
    {
        $booking = $this->bookingService->cancel($id, $request->user());
        return new BookingResource($booking);
    }

    // DELETE /bookings/{id}
    public function destroy($id, Request $request)
    {
        $this->bookingService->delete($id, $request->user());

        return response()->json([
            'message' => 'Booking deleted successfully'
        ]);
    }

    // PUT /bookings/{id} (Customer or Admin)
    public function update(BookingRequest $request, $id)
    {
        $booking = $this->bookingService->update($id, $request->validated(), $request->user());
        return new BookingResource($booking);
    }

    // PATCH /bookings/{id}/status (Admin)
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string',
        ]);

        $booking = $this->bookingService->updateStatus(
            $id,
            $request->status
        );

        return new BookingResource($booking);
    }
}
