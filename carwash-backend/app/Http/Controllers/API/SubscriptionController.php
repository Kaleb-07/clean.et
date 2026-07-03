<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    private array $plans = [
        [
            'id' => 'plus',
            'name' => 'Plus Care',
            'price' => 1500.00,
            'currency' => 'ETB',
            'features' => [
                '10% off all bookings',
                'Up to 4 standard washes/month',
                'Standard support'
            ]
        ],
        [
            'id' => 'premium',
            'name' => 'Premium Elite',
            'price' => 3000.00,
            'currency' => 'ETB',
            'features' => [
                '20% off all bookings',
                'Up to 8 standard washes/month',
                'Priority scheduling',
                'VIP customer support'
            ]
        ]
    ];

    // GET /api/subscriptions/plans
    public function plans()
    {
        return response()->json($this->plans);
    }

    // POST /api/subscriptions/subscribe
    public function subscribe(Request $request)
    {
        $request->validate([
            'plan' => 'required|string|in:plus,premium,business',
            'billing_cycle' => 'required|string|in:monthly',
        ]);

        $user = $request->user();
        $customer = $user->customer;
        abort_unless($customer, 404, 'Customer profile not found.');

        // Get plan details
        $planId = $request->plan;
        $planDetails = collect($this->plans)->firstWhere('id', $planId);

        $invoice = DB::transaction(function () use ($customer, $planDetails, $request, $user) {
            // 1. Create or update subscription model as cancelled/inactive first
            $subscription = $customer->subscriptions()->create([
                'plan' => $planDetails['id'],
                'billing_cycle' => $request->billing_cycle,
                'status' => 'cancelled', // start inactive/cancelled until payment verified
                'renews_at' => now()->addMonth(),
            ]);

            // 2. Generate Invoice with booking_id = null
            return Invoice::create([
                'tenant_id' => $user->tenant_id,
                'customer_id' => $customer->id,
                'booking_id' => null, // null represents subscription billing
                'amount' => $planDetails['price'],
                'currency' => $planDetails['currency'],
                'period' => now()->format('Y-m'),
                'status' => 'sent',
                'due_at' => now()->addDays(3)->toDateString(),
            ]);
        });

        $invoice->load('payments');

        return response()->json([
            'message' => 'Subscription initiated. Please settle the generated invoice.',
            'invoice' => $invoice,
        ], 201);
    }
}
