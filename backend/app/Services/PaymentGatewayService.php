<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Provider-agnostic payment gateway adapter.
 *
 * Each provider returns a unified result:
 *   [
 *     'status'             => 'pending'|'paid',
 *     'provider_reference' => string,
 *     'checkout_url'       => string|null,   // mobile-redirect URL
 *   ]
 *
 * New providers: add a private method and register it in $handlers.
 */
class PaymentGatewayService
{
    /** Map provider slug → handler method name */
    private array $handlers = [
        'telebirr'  => 'handleTelebirr',
        'cbe_birr'  => 'handleCbeBirr',
        'amole'     => 'handleAmole',
        'stripe'    => 'handleStripe',
        'cash'      => 'handleCash',
    ];

    /**
     * Initiate a payment and return a normalised result array.
     *
     * @param Payment   $payment   Freshly-created (status=pending) Payment model
     * @param float     $amount    ETB amount
     * @param string    $currency
     * @param array     $meta      Extra provider-specific data (return_url, etc.)
     */
    public function initiate(
        Payment $payment,
        float $amount,
        string $currency,
        array $meta = []
    ): array {
        $provider = $payment->provider;

        if (! isset($this->handlers[$provider])) {
            throw new \InvalidArgumentException("Unsupported payment provider: {$provider}");
        }

        $handler = $this->handlers[$provider];

        return $this->{$handler}($payment, $amount, $currency, $meta);
    }

    // ─────────────────────────────────────────────────────────
    //  Provider implementations
    //  (Replace stubs with real SDK calls when keys are configured)
    // ─────────────────────────────────────────────────────────

    private function handleTelebirr(Payment $payment, float $amount, string $currency, array $meta): array
    {
        // TODO: Replace with Ethio-Telecom Telebirr SuperApp API when credentials are set.
        // Stub returns a checkout URL so the mobile client can redirect.
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
        // TODO: Replace with Stripe SDK PaymentIntent creation.
        $reference = 'pi_' . strtolower(uniqid());

        return [
            'status'             => 'pending',
            'provider_reference' => $reference,
            'checkout_url'       => "https://checkout.stripe.com/pay/{$reference}",
        ];
    }

    /**
     * Cash payments are recorded immediately as 'pending' — the admin
     * manually marks them 'paid' via the admin panel.
     */
    private function handleCash(Payment $payment, float $amount, string $currency, array $meta): array
    {
        return [
            'status'             => 'pending',
            'provider_reference' => 'CASH-' . strtoupper(uniqid()),
            'checkout_url'       => null,
        ];
    }
}
