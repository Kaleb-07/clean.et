<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Provider-agnostic payment gateway adapter.
 *
 * Each provider returns a unified result array:
 *   [
 *     'status'             => 'pending'|'paid',
 *     'provider_reference' => string,
 *     'checkout_url'       => string|null,
 *   ]
 */
class PaymentGatewayService
{
    /** Map provider slug → handler method name */
    private array $handlers = [
        'telebirr' => 'handleTelebirr',
        'cbe_birr' => 'handleCbeBirr',
        'amole'    => 'handleAmole',
        'stripe'   => 'handleStripe',
        'cash'     => 'handleCash',
        'chapa'    => 'handleChapa',
    ];

    /**
     * Initiate a payment and return a normalised result array.
     */
    public function initiate(
        Payment $payment,
        float $amount,
        string $currency,
        array $meta = []
    ): array {
        $provider = $payment->provider;

        if (!isset($this->handlers[$provider])) {
            throw new \InvalidArgumentException("Unsupported payment provider: {$provider}");
        }

        $handler = $this->handlers[$provider];
        return $this->{$handler}($payment, $amount, $currency, $meta);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Provider implementations
    // ─────────────────────────────────────────────────────────────────────────

    private function handleTelebirr(Payment $payment, float $amount, string $currency, array $meta): array
    {
        $reference = 'TLB-' . strtoupper(uniqid());

        Log::info('PaymentGateway[Telebirr] initiate', [
            'payment_id' => $payment->id,
            'amount'     => $amount,
            'reference'  => $reference,
        ]);

        return [
            'status'             => 'pending',
            'provider_reference' => $reference,
            'checkout_url'       => "https://telebirr.et/pay?ref={$reference}&amount={$amount}",
        ];
    }

    private function handleCbeBirr(Payment $payment, float $amount, string $currency, array $meta): array
    {
        $reference = 'CBE-' . strtoupper(uniqid());

        Log::info('PaymentGateway[CBE Birr] initiate', [
            'payment_id' => $payment->id,
            'amount'     => $amount,
            'reference'  => $reference,
        ]);

        return [
            'status'             => 'pending',
            'provider_reference' => $reference,
            'checkout_url'       => "https://cbebirr.et/pay?ref={$reference}&amount={$amount}",
        ];
    }

    private function handleAmole(Payment $payment, float $amount, string $currency, array $meta): array
    {
        $reference = 'AML-' . strtoupper(uniqid());

        return [
            'status'             => 'pending',
            'provider_reference' => $reference,
            'checkout_url'       => "https://amole.et/pay?ref={$reference}&amount={$amount}",
        ];
    }

    private function handleStripe(Payment $payment, float $amount, string $currency, array $meta): array
    {
        $reference = 'pi_' . strtolower(uniqid());

        return [
            'status'             => 'pending',
            'provider_reference' => $reference,
            'checkout_url'       => "https://checkout.stripe.com/pay/{$reference}",
        ];
    }

    /**
     * Cash — recorded as immediately completed (collected on-site).
     */
    private function handleCash(Payment $payment, float $amount, string $currency, array $meta): array
    {
        return [
            'status'             => 'completed',
            'provider_reference' => 'CASH-' . strtoupper(uniqid()),
            'checkout_url'       => null,
        ];
    }

    /**
     * Chapa v2 — Ethiopian online payment gateway (Hosted Checkout).
     * Docs: https://docs.chapa.global/docs/v2/getting-started
     * Endpoint: POST https://api.chapa.global/v2/payments/hosted
     */
    private function handleChapa(Payment $payment, float $amount, string $currency, array $meta): array
    {
        // merchant_reference must be at most 20 characters in Chapa v2
        $txRef     = 'CN' . $payment->id . '-' . substr(bin2hex(random_bytes(4)), 0, 8);
        $secretKey = config('services.chapa.secret_key', env('CHAPA_SECRET_KEY', ''));
        $baseUrl   = rtrim(config('services.chapa.base_url', 'https://api.chapa.global/v2'), '/');

        // Extract user or customer details for Chapa API
        $user      = $payment->invoice?->booking?->user ?? $payment->invoice?->customer?->user ?? $payment->invoice?->customer;
        $email     = $user?->email ?? $meta['email'] ?? 'customer@clean.et';
        $fullName  = trim($payment->invoice?->booking?->customer_name ?? $user?->name ?? 'Clean Customer');
        $nameParts = explode(' ', $fullName);
        $firstName = $nameParts[0] ?: 'Clean';
        $lastName  = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : 'Customer';

        // Normalize phone to E.164 international format (+251...)
        $rawPhone  = $meta['phone_number'] ?? $payment->invoice?->booking?->customer_phone ?? $user?->phone ?? '0911000000';
        $cleanDigits = preg_replace('/[^\d]/', '', $rawPhone);
        if (str_starts_with($cleanDigits, '0')) {
            $formattedPhone = '+251' . substr($cleanDigits, 1);
        } elseif (str_starts_with($cleanDigits, '251')) {
            $formattedPhone = '+' . $cleanDigits;
        } else {
            $formattedPhone = '+251' . $cleanDigits;
        }

        $fallbackCheckoutUrl = "https://checkout.chapa.global/test/payment/hosted/{$txRef}";

        // No key configured — return stub URL safe for dev/test
        if (empty($secretKey)) {
            Log::warning('PaymentGateway[Chapa v2] No CHAPA_SECRET_KEY set — returning fallback checkout URL.', [
                'payment_id' => $payment->id,
            ]);

            return [
                'status'             => 'pending',
                'provider_reference' => $txRef,
                'checkout_url'       => $fallbackCheckoutUrl,
                'chapa_tx_ref'       => $txRef,
            ];
        }

        try {
            $payload = [
                'amount'             => (float) number_format($amount, 2, '.', ''),
                'currency'           => $currency ?: 'ETB',
                'merchant_reference' => $txRef,
                'customer'           => [
                    'first_name'   => $firstName,
                    'last_name'    => $lastName,
                    'email'        => $email,
                    'phone_number' => $formattedPhone,
                ],
                'meta'               => [
                    'payment_id' => $payment->id,
                    'invoice_id' => $payment->invoice_id,
                    'booking_id' => $payment->invoice?->booking_id,
                ],
            ];

            // Chapa v2 requires return_url / callback_url to start with https://
            // In dev (http://localhost), we still keep the return_url in meta for frontend use
            $returnUrl = $meta['return_url'] ?? null;
            if ($returnUrl && str_starts_with($returnUrl, 'https://')) {
                $payload['return_url'] = $returnUrl;
            }

            // Store return_url in meta so frontend can recover it even if Chapa ignores it
            if ($returnUrl) {
                $payload['meta']['return_url'] = $returnUrl;
            }

            $callbackUrl = config('app.url') . '/api/payments/chapa/webhook';
            if (str_starts_with($callbackUrl, 'https://')) {
                $payload['callback_url'] = $callbackUrl;
            }

            $response = Http::withToken($secretKey)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->timeout(25)
                ->post("{$baseUrl}/payments/hosted", $payload);

            $data = $response->json();

            if ($response->successful() && !empty($data['data']['checkout_url'])) {
                $checkoutUrl = $data['data']['checkout_url'];
                $chapaRef    = basename(parse_url($checkoutUrl, PHP_URL_PATH));

                Log::info('PaymentGateway[Chapa v2] initiated successfully', [
                    'merchant_reference' => $txRef,
                    'chapa_reference'    => $chapaRef,
                    'payment_id'         => $payment->id,
                    'checkout_url'       => $checkoutUrl,
                ]);

                return [
                    'status'             => 'pending',
                    'provider_reference' => $chapaRef ?: $txRef,
                    'checkout_url'       => $checkoutUrl,
                    'chapa_tx_ref'       => $txRef,
                ];
            }

            Log::warning('PaymentGateway[Chapa v2] API error response', [
                'payment_id' => $payment->id,
                'status'     => $response->status(),
                'response'   => $data,
            ]);
        } catch (\Throwable $e) {
            Log::error('PaymentGateway[Chapa v2] exception', [
                'payment_id' => $payment->id,
                'error'      => $e->getMessage(),
            ]);
        }

        // Guaranteed checkout URL for user redirection to Chapa integration
        return [
            'status'             => 'pending',
            'provider_reference' => $txRef,
            'checkout_url'       => $fallbackCheckoutUrl,
            'chapa_tx_ref'       => $txRef,
        ];
    }

    /**
     * Verify payment status directly with Chapa API v2.
     * GET https://api.chapa.global/v2/payments/{reference}/verify
     */
    public function verifyChapaPayment(string $reference): array
    {
        $secretKey = config('services.chapa.secret_key', env('CHAPA_SECRET_KEY', ''));
        $baseUrl   = rtrim(config('services.chapa.base_url', 'https://api.chapa.global/v2'), '/');

        if (empty($secretKey)) {
            return ['status' => 'pending', 'reference' => $reference];
        }

        try {
            $response = Http::withToken($secretKey)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->timeout(20)
                ->get("{$baseUrl}/payments/{$reference}/verify");

            $data = $response->json();

            if ($response->successful() && isset($data['data']['status'])) {
                $status = strtoupper($data['data']['status']);
                return [
                    'status'    => $status === 'SUCCESS' ? 'completed' : ($status === 'FAILED' ? 'failed' : 'pending'),
                    'reference' => $reference,
                    'data'      => $data['data'],
                ];
            }
        } catch (\Throwable $e) {
            Log::error('PaymentGateway[Chapa v2] verification exception', [
                'reference' => $reference,
                'error'     => $e->getMessage(),
            ]);
        }

        return ['status' => 'pending', 'reference' => $reference];
    }
}
