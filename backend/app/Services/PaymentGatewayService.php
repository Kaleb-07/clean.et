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
     * Chapa — Ethiopian online payment gateway (Hosted Checkout).
     * Docs: https://developer.chapa.co
     * Endpoint: POST https://api.chapa.co/v1/transaction/initialize
     */
    private function handleChapa(Payment $payment, float $amount, string $currency, array $meta): array
    {
        $txRef     = 'CN' . $payment->id . '-' . substr(bin2hex(random_bytes(4)), 0, 8);
        $secretKey = config('services.chapa.secret_key', env('CHAPA_SECRET_KEY', ''));
        $baseUrl   = rtrim(config('services.chapa.base_url', 'https://api.chapa.co/v1'), '/');

        // Extract user or customer details for Chapa API
        $user      = $payment->invoice?->booking?->user ?? $payment->invoice?->customer?->user ?? $payment->invoice?->customer;
        $rawEmail = $user?->email ?? $meta['email'] ?? '';
        $domain   = substr(strrchr($rawEmail, "@"), 1);
        // Ensure email is a real domain that passes Chapa's DNS MX validator
        if (
            filter_var($rawEmail, FILTER_VALIDATE_EMAIL) &&
            !str_contains($rawEmail, 'example.') &&
            !str_contains($rawEmail, 'clean.et') &&
            !str_contains($rawEmail, 'test.') &&
            !str_contains($rawEmail, 'localhost') &&
            (in_array($domain, ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com']) || @checkdnsrr($domain, 'MX'))
        ) {
            $email = $rawEmail;
        } else {
            $email = 'kaleb@gmail.com';
        }

        $fullName  = trim($payment->invoice?->booking?->customer_name ?? $user?->name ?? 'Clean Customer');
        $nameParts = explode(' ', $fullName);
        $firstName = $nameParts[0] ?: 'Clean';
        $lastName  = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : 'Customer';

        // Validate / normalize Ethiopian mobile phone (09xxxxxxxx or 07xxxxxxxx)
        $rawPhone = $meta['phone_number'] ?? $payment->invoice?->booking?->customer_phone ?? $user?->phone ?? '';
        $digits   = preg_replace('/[^\d]/', '', $rawPhone);
        if (str_starts_with($digits, '251') && strlen($digits) === 12) {
            $formattedPhone = '0' . substr($digits, 3);
        } elseif (str_starts_with($digits, '0') && strlen($digits) === 10) {
            $formattedPhone = $digits;
        } elseif ((str_starts_with($digits, '9') || str_starts_with($digits, '7')) && strlen($digits) === 9) {
            $formattedPhone = '0' . $digits;
        } else {
            // Default valid test number accepted by Chapa
            $formattedPhone = '0911234567';
        }

        // No key configured — return error
        if (empty($secretKey)) {
            Log::warning('PaymentGateway[Chapa] No CHAPA_SECRET_KEY set.', [
                'payment_id' => $payment->id,
            ]);

            throw new \RuntimeException('Chapa secret key is not configured.');
        }

        try {
            $returnUrl = $meta['return_url'] ?? null;
            $callbackUrl = config('app.url') . '/api/payments/chapa/webhook';

            // Standard Chapa v1 payload
            $payload = [
                'amount'       => (string) number_format($amount, 2, '.', ''),
                'currency'     => $currency ?: 'ETB',
                'email'        => $email,
                'first_name'   => $firstName,
                'last_name'    => $lastName,
                'phone_number' => $formattedPhone,
                'tx_ref'       => $txRef,
            ];

            if ($returnUrl) {
                $payload['return_url'] = $returnUrl;
            }
            if ($callbackUrl && str_starts_with($callbackUrl, 'https://')) {
                $payload['callback_url'] = $callbackUrl;
            }

            $endpoint = str_contains($baseUrl, 'v2') ? "{$baseUrl}/payments/hosted" : "{$baseUrl}/transaction/initialize";

            Log::info('PaymentGateway[Chapa] Sending payload to Chapa', [
                'endpoint' => $endpoint,
                'payload'  => $payload,
            ]);

            $response = Http::withToken($secretKey)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->timeout(25)
                ->post($endpoint, $payload);

            $data = $response->json();

            if ($response->successful() && !empty($data['data']['checkout_url'])) {
                $checkoutUrl = $data['data']['checkout_url'];
                $chapaRef    = basename(parse_url($checkoutUrl, PHP_URL_PATH));

                Log::info('PaymentGateway[Chapa] initiated successfully', [
                    'tx_ref'          => $txRef,
                    'chapa_reference' => $chapaRef,
                    'payment_id'      => $payment->id,
                    'checkout_url'    => $checkoutUrl,
                ]);

                return [
                    'status'             => 'pending',
                    'provider_reference' => $txRef,
                    'checkout_url'       => $checkoutUrl,
                    'chapa_tx_ref'       => $txRef,
                ];
            }

            Log::error('PaymentGateway[Chapa] API rejected request', [
                'payment_id' => $payment->id,
                'status'     => $response->status(),
                'response'   => $data,
            ]);

            $errorMessage = is_array($data['message'] ?? null) 
                ? json_encode($data['message']) 
                : ($data['message'] ?? 'Could not initialize Chapa payment.');

            throw new \RuntimeException($errorMessage);
        } catch (\Throwable $e) {
            Log::error('PaymentGateway[Chapa] exception', [
                'payment_id' => $payment->id,
                'error'      => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Verify payment status directly with Chapa API.
     * GET https://api.chapa.co/v1/transaction/verify/{tx_ref}
     */
    public function verifyChapaPayment(string $reference): array
    {
        $secretKey = config('services.chapa.secret_key', env('CHAPA_SECRET_KEY', ''));
        $baseUrl   = rtrim(config('services.chapa.base_url', 'https://api.chapa.co/v1'), '/');

        if (empty($secretKey)) {
            return ['status' => 'pending', 'reference' => $reference];
        }

        try {
            $endpoint = str_contains($baseUrl, 'v2')
                ? "{$baseUrl}/payments/{$reference}/verify"
                : "{$baseUrl}/transaction/verify/{$reference}";

            $response = Http::withToken($secretKey)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->timeout(20)
                ->get($endpoint);

            $data = $response->json();

            if ($response->successful()) {
                $status = strtoupper($data['data']['status'] ?? $data['status'] ?? '');
                return [
                    'status'    => ($status === 'SUCCESS' || $status === 'COMPLETED') ? 'completed' : ($status === 'FAILED' ? 'failed' : 'pending'),
                    'reference' => $reference,
                    'data'      => $data['data'] ?? [],
                ];
            }
        } catch (\Throwable $e) {
            Log::error('PaymentGateway[Chapa] verification exception', [
                'reference' => $reference,
                'error'     => $e->getMessage(),
            ]);
        }

        return ['status' => 'pending', 'reference' => $reference];
    }
}
