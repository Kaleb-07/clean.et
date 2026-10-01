<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\NotificationService;
use App\Services\PaymentGatewayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Handles Chapa payment webhook events (v2 mobile / direct-charge).
 *
 * POST /api/payments/chapa/webhook
 *
 * Chapa sends a signed POST request for each event:
 *   payment.success    → mark payment completed
 *   payment.failed     → mark payment failed
 *   payment.cancelled  → mark payment failed (user cancelled)
 *   payment.incomplete → mark payment failed (timeout)
 *
 * Chapa includes { "mode": "test" } in test mode payloads so you can
 * separate test and live webhook processing.
 *
 * Signature verification:
 *   Chapa signs requests with HMAC-SHA256 using your CHAPA_WEBHOOK_SECRET.
 *   The signature is sent in the 'x-chapa-signature' header.
 */
class ChapaWebhookController extends Controller
{
    public function __construct(
        private PaymentGatewayService $gateway,
        private NotificationService $notifications,
    ) {}

    public function handle(Request $request)
    {
        // ── 1. Signature verification ─────────────────────────────────────────
        $webhookSecret = config('services.chapa.webhook_secret', '');

        if (!empty($webhookSecret)) {
            $signature       = $request->header('x-chapa-signature', '');
            $rawBody         = $request->getContent();
            $expectedSig     = hash_hmac('sha256', $rawBody, $webhookSecret);

            if (!hash_equals($expectedSig, $signature)) {
                Log::warning('ChapaWebhook: Invalid signature', [
                    'expected' => $expectedSig,
                    'received' => $signature,
                ]);
                return response()->json(['message' => 'Invalid signature'], 401);
            }
        }

        $payload = $request->all();

        Log::info('ChapaWebhook: Received', ['payload' => $payload]);

        // ── 2. Extract fields ─────────────────────────────────────────────────
        $event    = $payload['event']  ?? $payload['type']   ?? null;
        $txRef    = $payload['tx_ref'] ?? $payload['trx_ref'] ?? ($payload['data']['tx_ref'] ?? null);
        $mode     = $payload['mode']   ?? 'live';
        $status   = $payload['data']['status'] ?? null;

        if (!$txRef) {
            Log::warning('ChapaWebhook: Missing tx_ref', ['payload' => $payload]);
            return response()->json(['message' => 'Missing tx_ref'], 422);
        }

        Log::info('ChapaWebhook: Processing', [
            'event'  => $event,
            'tx_ref' => $txRef,
            'mode'   => $mode,
        ]);

        // ── 3. Find the payment ───────────────────────────────────────────────
        $payment = Payment::where(function ($q) use ($txRef) {
            $q->where('chapa_tx_ref', $txRef)
              ->orWhere('provider_reference', $txRef);
        })->first();

        if (!$payment) {
            Log::warning('ChapaWebhook: Payment not found', ['tx_ref' => $txRef]);
            // Return 200 so Chapa doesn't keep retrying for unknown references
            return response()->json(['message' => 'Payment not found — acknowledged'], 200);
        }

        // Skip if already in a terminal state
        if (in_array($payment->status, ['completed', 'failed'])) {
            Log::info('ChapaWebhook: Payment already in terminal state', [
                'payment_id' => $payment->id,
                'status'     => $payment->status,
            ]);
            return response()->json(['message' => 'Already processed'], 200);
        }

        // ── 4. Map Chapa event → internal status ──────────────────────────────
        $newStatus = match ($event) {
            'payment.success'    => 'completed',
            'payment.failed'     => 'failed',
            'payment.cancelled'  => 'failed',   // treat as failed for simplicity
            'payment.incomplete' => 'failed',   // timeout → failed
            default              => null,
        };

        // Fallback: use the status field if event is unknown
        if (!$newStatus && $status) {
            $newStatus = match (strtolower($status)) {
                'success'    => 'completed',
                'failed'     => 'failed',
                'cancelled'  => 'failed',
                'incomplete' => 'failed',
                default      => null,
            };
        }

        if (!$newStatus) {
            Log::warning('ChapaWebhook: Unrecognised event', ['event' => $event, 'status' => $status]);
            return response()->json(['message' => "Unrecognised event '{$event}'"], 422);
        }

        // ── 5. Verify with Chapa API before settling (best practice) ─────────
        if ($newStatus === 'completed') {
            $verified = $this->gateway->verifyChapaPayment($txRef);
            if ($verified['status'] !== 'completed') {
                Log::warning('ChapaWebhook: Verification mismatch — not settling', [
                    'tx_ref'           => $txRef,
                    'webhook_event'    => $event,
                    'verified_status'  => $verified['status'],
                ]);
                return response()->json([
                    'message' => 'Verification mismatch — payment not settled',
                ], 422);
            }
        }

        // ── 6. Settle ─────────────────────────────────────────────────────────
        $bookingUser = null;

        DB::transaction(function () use ($payment, $newStatus, &$bookingUser) {
            $payment->update(['status' => $newStatus]);

            if ($newStatus === 'completed') {
                $invoice = $payment->invoice()->with('booking.user', 'customer.user')->first();

                if ($invoice) {
                    $invoice->update(['status' => 'paid']);
                    $bookingUser = $invoice->booking?->user ?? $invoice->customer?->user ?? null;
                }
            }
        });

        // ── 7. Notify customer ────────────────────────────────────────────────
        if ($bookingUser && $newStatus === 'completed') {
            $bookingId = $payment->invoice?->booking_id ?? 0;
            $this->notifications->notifyPaymentConfirmed(
                $bookingUser,
                (float) $payment->amount,
                'chapa',
                $bookingId
            );
        }

        Log::info('ChapaWebhook: Settled', [
            'payment_id' => $payment->id,
            'tx_ref'     => $txRef,
            'new_status' => $newStatus,
            'mode'       => $mode,
        ]);

        return response()->json(['message' => 'Webhook processed', 'status' => $newStatus]);
    }
}
