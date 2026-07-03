<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\Request;

/**
 * Admin-only invoice management endpoints.
 *
 * POST /api/admin/invoices/generate/{bookingId}
 *   — Idempotently generate (or return existing) invoice for a booking.
 *     Also advances booking status to 'invoiced' if it was 'completed'.
 */
class AdminInvoiceController extends Controller
{
    public function __construct(private BookingService $bookingService)
    {
    }

    // ─────────────────────────────────────────────
    //  POST /api/admin/invoices/generate/{bookingId}
    // ─────────────────────────────────────────────
    public function generate(Request $request, int $bookingId): InvoiceResource
    {
        $booking = Booking::with(['customer', 'sector.category'])->findOrFail($bookingId);

        // Guard: can only invoice completed or in-progress bookings
        abort_unless(
            in_array($booking->status, ['completed', 'in_progress', 'invoiced']),
            422,
            'Invoice can only be generated for completed or in-progress bookings.'
        );

        // Generate (idempotent)
        $invoice = $this->bookingService->generateInvoice($booking);

        // Advance status to invoiced if not already there
        if ($booking->status !== 'invoiced') {
            $this->bookingService->updateStatus($booking->id, 'invoiced');
        }

        $invoice->load(['payments', 'booking.sector']);

        return new InvoiceResource($invoice);
    }
}
