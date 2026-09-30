<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\BookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\BookingService;
use App\Services\PaymentGatewayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    protected $bookingService;
    protected $gateway;

    public function __construct(BookingService $bookingService, PaymentGatewayService $gateway)
    {
        $this->bookingService = $bookingService;
        $this->gateway        = $gateway;
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

    // GET /bookings/{id}/payment-status (Customer, Staff, or Admin — poll Chapa payment status)
    public function paymentStatus(Request $request, $id)
    {
        $user    = $request->user();
        $profile = $user->staffProfile;
        $booking = \App\Models\Booking::with(['invoice.payments'])->findOrFail($id);

        // Allow: assigned staff, the customer who made the booking, or an admin
        $isAssignedStaff = $profile && $booking->staff_id === $profile->id;
        $isOwner         = $booking->user_id === $user->id || ($user->customer && $booking->customer_id === $user->customer->id);
        $isAdmin         = $user->is_admin;

        if (!$isAssignedStaff && !$isOwner && !$isAdmin) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        $invoice = $booking->invoice;
        if (!$invoice) {
            return response()->json(['paid' => false, 'status' => 'no_invoice']);
        }

        $payment = $invoice->payments()->latest()->first();
        if (!$payment) {
            return response()->json(['paid' => false, 'status' => 'no_payment']);
        }

        // For pending Chapa payments, check with the gateway
        if ($payment->provider === 'chapa' && $payment->status === 'pending') {
            $ref = $payment->provider_reference ?: $payment->chapa_tx_ref;
            if ($ref) {
                $verified = $this->gateway->verifyChapaPayment($ref);

                if ($verified['status'] === 'completed') {
                    DB::transaction(function () use ($payment, $invoice) {
                        $payment->update(['status' => 'completed']);
                        $invoice->update(['status' => 'paid']);
                    });
                    $payment->refresh();
                } elseif (in_array($verified['status'], ['failed', 'cancelled', 'incomplete'])) {
                    $payment->update(['status' => 'failed']);
                    $payment->refresh();
                }
            }
        }

        return response()->json([
            'paid'       => $payment->status === 'completed',
            'status'     => $payment->status,
            'provider'   => $payment->provider,
            'payment_id' => $payment->id,
        ]);
    }

    // PATCH /bookings/{id}/staff-status (Staff — accept/start/complete/cancel their own jobs)
    public function staffUpdateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:pending,in_progress,completed,cancelled',
        ]);
        $user    = $request->user();
        $profile = $user->staffProfile;

        $booking = \App\Models\Booking::findOrFail($id);

        // Staff can only update bookings assigned to them
        $isAssigned = ($profile && $booking->staff_id === $profile->id)
                   || $booking->user_id === $user->id;

        if (!$isAssigned) {
            return response()->json(['message' => 'You are not assigned to this job.'], 403);
        }

        // Enforce allowed transitions per current status
        $allowed = [
            'driver_assigned' => ['pending', 'cancelled'],     // Accept → pending  |  Decline → cancelled
            'confirmed'       => ['in_progress', 'cancelled'], // Skip straight to cleaning (confirmed by admin)
            'pending'         => ['in_progress', 'cancelled'], // Start → in_progress  |  Cancel
            'in_progress'     => ['completed', 'cancelled'],   // Done  |  Cancel
        ];

        $current = $booking->status;
        if (!isset($allowed[$current]) || !in_array($request->status, $allowed[$current], true)) {
            return response()->json([
                'message' => "Cannot transition from '{$current}' to '{$request->status}'.",
            ], 422);
        }

        $booking = $this->bookingService->updateStatus($id, $request->status);

        return new BookingResource($booking);
    }

    // PATCH /bookings/{id}/status (Admin only)
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

    // POST /bookings/{id}/collect-payment (Staff — collect payment before completing)
    public function staffCollectPayment(Request $request, $id)
    {
        $request->validate([
            'provider'        => 'required|string|in:cash,chapa',
            'amount_received' => 'nullable|numeric|min:0',
            'return_url'      => 'nullable|string',
            // Chapa Direct Charge fields
            'phone_number'    => 'nullable|string|min:10|max:15',
            'payment_method'  => 'nullable|string|in:telebirr,cbebirr,mpesa,awashbirr,ebirr',
        ]);

        $user    = $request->user();
        $profile = $user->staffProfile;
        $booking = \App\Models\Booking::with(['invoice'])->findOrFail($id);

        // Check assignment — allow if staff profile matches OR if user created/owns the booking
        $isAssigned = ($profile && $booking->staff_id === $profile->id)
                   || $booking->user_id === $user->id;

        if (!$isAssigned) {
            return response()->json(['message' => 'You are not assigned to this job.'], 403);
        }

        if (!in_array($booking->status, ['pending', 'confirmed', 'driver_assigned', 'in_progress', 'completed', 'invoiced'])) {
            return response()->json(['message' => 'Payment cannot be collected for this booking status.'], 422);
        }

        // Validate phone number format for Chapa Direct Charge
        if ($request->provider === 'chapa' && $request->phone_number) {
            $phone = preg_replace('/\D/', '', $request->phone_number);
            // Must be Ethiopian format: 251xxxxxxxxx (12 digits) or 09xxxxxxxx (10 digits)
            if (!preg_match('/^(251\d{9}|0\d{9})$/', $phone)) {
                return response()->json([
                    'message' => 'Invalid phone number format. Use 251XXXXXXXXX or 09XXXXXXXX.',
                ], 422);
            }
        }

        // Find or auto-create invoice for this booking
        $invoice = Invoice::firstOrCreate(
            ['booking_id' => $booking->id],
            [
                'tenant_id'   => $booking->tenant_id,
                'customer_id' => $booking->customer_id,
                'amount'      => $booking->price ?? 0,
                'currency'    => $booking->currency ?? 'ETB',
                'status'      => 'sent',
                'period'      => now()->format('Y-m'),
                'due_at'      => now()->addDays(7)->toDateString(),
            ]
        );

        // Don't create duplicate payments if already paid
        $existing = $invoice->payments()->whereIn('status', ['completed', 'paid'])->first();
        if ($existing) {
            return response()->json([
                'message'  => 'Payment already collected for this job.',
                'payment'  => $existing,
                'paid'     => true,
            ]);
        }

        $amount = (float) ($request->amount_received ?? $invoice->amount);

        $result = DB::transaction(function () use ($invoice, $request, $amount) {
            $payment = $invoice->payments()->create([
                'provider' => $request->provider,
                'status'   => 'pending',
                'amount'   => $amount,
            ]);

            $meta = [
                'return_url'     => $request->return_url ?? '',
                'phone_number'   => $request->phone_number,
                'payment_method' => $request->payment_method ?? 'telebirr',
            ];

            $gatewayResult = $this->gateway->initiate(
                $payment,
                $amount,
                $invoice->currency ?? 'ETB',
                $meta
            );

            $statusToSave = in_array($gatewayResult['status'], ['completed', 'paid']) ? 'completed' : $gatewayResult['status'];

            $updateData = [
                'status'             => $statusToSave,
                'provider_reference' => $gatewayResult['provider_reference'],
                'checkout_url'       => $gatewayResult['checkout_url'] ?? null,
            ];

            if (isset($gatewayResult['chapa_tx_ref'])) {
                $updateData['chapa_tx_ref'] = $gatewayResult['chapa_tx_ref'];
            }
            if ($request->phone_number) {
                $updateData['phone_number'] = $request->phone_number;
            }

            $payment->update($updateData);

            // Cash or completed payment: immediately settle
            if ($request->provider === 'cash' || in_array($gatewayResult['status'], ['completed', 'paid'])) {
                $payment->update(['status' => 'completed']);
                $invoice->update(['status' => 'paid']);
            }

            return [
                'payment'      => $payment->fresh(),
                'checkout_url' => $gatewayResult['checkout_url'] ?? null,
                'chapa_tx_ref' => $gatewayResult['chapa_tx_ref'] ?? null,
                'auth_type'    => $gatewayResult['auth_type'] ?? null,
                'paid'         => $request->provider === 'cash' || in_array($gatewayResult['status'], ['completed', 'paid']),
            ];
        });

        return response()->json([
            'message'      => $result['paid'] ? 'Cash payment collected.' : 'Payment initiated.',
            'payment'      => $result['payment'],
            'checkout_url' => $result['checkout_url'],
            'chapa_tx_ref' => $result['chapa_tx_ref'],
            'auth_type'    => $result['auth_type'],
            'paid'         => $result['paid'],
            'invoice_id'   => $invoice->id,
        ], 201);
    }
}
