<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Invoice;
use App\Models\Payment;
use App\Notifications\BookingNotification;
use App\Services\NotificationService;
use App\Services\PaymentGatewayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Manages payment initiation and (webhook) status updates.
 *
 * POST /api/payments          — customer initiates a payment for their invoice
 * GET  /api/payments/{id}     — customer / admin checks a payment's status
 * POST /api/payments/{id}/verify — admin or webhook marks a payment as paid
 */
class PaymentController extends Controller
{
    public function __construct(
        private PaymentGatewayService $gateway,
        private NotificationService $notifications,
    ) {
    }

    // ─────────────────────────────────────────────
    //  POST /api/payments
    // ─────────────────────────────────────────────
    public function store(StorePaymentRequest $request): PaymentResource
    {
        $user     = $request->user();
        $customer = $user->customer;

        /** @var Invoice $invoice */
        $invoice = Invoice::with('payments')->findOrFail($request->invoice_id);

        // Authorisation: customer must own the invoice (admins bypass)
        if (! $user->is_admin) {
            abort_unless(
                $customer && $invoice->customer_id === $customer->id,
                403,
                'You do not have access to this invoice.'
            );
        }

        // Guard: don't create a second payment while one is already pending/paid
        $existing = $invoice->payments()
            ->whereIn('status', ['pending', 'paid'])
            ->first();

        if ($existing) {
            return (new PaymentResource($existing))
                ->additional(['message' => 'A payment is already in progress for this invoice.']);
        }

        $payment = DB::transaction(function () use ($invoice, $request) {
            /** @var Payment $payment */
            $payment = $invoice->payments()->create([
                'provider' => $request->provider,
                'status'   => 'pending',
                'amount'   => $invoice->amount,
            ]);

            // Delegate to the provider adapter
            $result = $this->gateway->initiate(
                $payment,
                (float) $invoice->amount,
                $invoice->currency ?? 'ETB',
                ['return_url' => $request->return_url]
            );

            $payment->update([
                'status'             => $result['status'],
                'provider_reference' => $result['provider_reference'],
                'checkout_url'       => $result['checkout_url'] ?? null,
            ]);

            // If payment is immediately paid (e.g. cash shortcut), settle invoice
            if ($result['status'] === 'paid') {
                $invoice->update(['status' => 'paid']);
            }

            return $payment->fresh();
        });

        return new PaymentResource($payment);
    }

    // ─────────────────────────────────────────────
    //  GET /api/payments/{payment}
    // ─────────────────────────────────────────────
    public function show(Request $request, Payment $payment): PaymentResource
    {
        $this->authorizeAccess($request, $payment);

        return new PaymentResource($payment);
    }

    // ─────────────────────────────────────────────
    //  POST /api/payments/{payment}/verify
    //  Admin or webhook: confirm that the provider has settled the payment.
    // ─────────────────────────────────────────────
    public function verify(Request $request, Payment $payment): PaymentResource
    {
        // Admins can manually verify; customers can self-verify their own payment
        $user = $request->user();
        if (! $user->is_admin) {
            $customer       = $user->customer;
            $invoiceCustomer = $payment->invoice?->customer_id;
            abort_unless(
                $customer && $invoiceCustomer === $customer->id,
                403,
                'Forbidden.'
            );
        }

        // Already completed — idempotent, return early
        if ($payment->status === 'completed') {
            return new PaymentResource($payment);
        }

        $bookingUser = null;

        DB::transaction(function () use ($payment, &$bookingUser) {
            // ✅ Payment status is 'completed' (matches database enum ['pending', 'completed', 'failed'])
            $payment->update(['status' => 'completed']);

            $invoice = $payment->invoice()->with('booking.user')->first();

            // Mark the invoice as paid
            $invoice->update(['status' => 'paid']);

            // Resolve the user to notify
            $bookingUser = $invoice->booking?->user ?? $invoice->customer?->user ?? null;

            // If invoice is for a subscription, activate it
            if (is_null($invoice->booking_id)) {
                $customer = $invoice->customer;
                if ($customer) {
                    $subscription = $customer->subscriptions()
                        ->where('status', '!=', 'active')
                        ->latest()
                        ->first();

                    if ($subscription) {
                        $subscription->update([
                            'status'    => 'active',
                            'renews_at' => now()->addMonth(),
                        ]);
                        $customer->update(['subscription_tier' => $subscription->plan]);
                    }
                }
            }
        });

        // Fire push notification outside transaction (fire-and-forget)
        if ($bookingUser) {
            $bookingUser->notify(new BookingNotification(
                'Your payment of ETB ' . number_format($payment->amount, 2) . ' has been confirmed. Thank you!'
            ));
            $this->notifications->notify(
                $bookingUser,
                '✅ Payment Confirmed',
                'ETB ' . number_format($payment->amount, 2) . ' paid successfully via ' . strtoupper($payment->provider) . '.'
            );
        }

        return new PaymentResource($payment->fresh());
    }

    // ─────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────
    private function authorizeAccess(Request $request, Payment $payment): void
    {
        $user = $request->user();

        if ($user->is_admin) return;

        $customer = $user->customer;
        $invoiceCustomerId = $payment->invoice?->customer_id;

        abort_unless(
            $customer && $invoiceCustomerId === $customer->id,
            403,
            'You do not have access to this payment.'
        );
    }
}
