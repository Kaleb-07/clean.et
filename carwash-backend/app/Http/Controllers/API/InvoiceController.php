<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Read-only invoice access for customers.
 * Admins can view all invoices regardless of customer.
 *
 * Routes live under auth:sanctum — no admin guard here; ownership
 * check is applied on show() for regular customers.
 */
class InvoiceController extends Controller
{
    // ─────────────────────────────────────────────
    //  GET /api/invoices
    // ─────────────────────────────────────────────
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = Invoice::with(['payments'])
            ->latest();

        // Admins see everything; customers see only their own invoices
        if (! $user->is_admin) {
            $customer = $user->customer;
            abort_unless($customer, 404, 'Customer profile not found.');
            $query->where('customer_id', $customer->id);
        }

        // Optional filter by status: ?status=paid|unpaid|overdue
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $invoices = $query->paginate(20);

        return InvoiceResource::collection($invoices);
    }

    // ─────────────────────────────────────────────
    //  GET /api/invoices/{invoice}
    // ─────────────────────────────────────────────
    public function show(Request $request, Invoice $invoice): InvoiceResource
    {
        $user = $request->user();

        if (! $user->is_admin) {
            $customer = $user->customer;
            abort_unless(
                $customer && $invoice->customer_id === $customer->id,
                403,
                'You do not have access to this invoice.'
            );
        }

        $invoice->load(['payments', 'booking.sector']);

        return new InvoiceResource($invoice);
    }
}
