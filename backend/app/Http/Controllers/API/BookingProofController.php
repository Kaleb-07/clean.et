<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingCompletionProof;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Staff/Admin: attach photo proof to a completed or in-progress booking.
 *
 * POST /api/bookings/{id}/proof
 *   Accepts multipart/form-data with:
 *     - photo       (file, optional)  — uploaded image
 *     - photo_base64 (string, optional) — base64-encoded image (mobile fallback)
 *     - checklist_item (string, optional) — free-text description / checklist note
 */
class BookingProofController extends Controller
{
    public function store(Request $request, $id)
    {
        $user = $request->user();

        // Only staff or admin can attach proofs
        abort_unless(
            $user->is_admin || $user->isStaff(),
            403,
            'Only staff or admin may upload completion proofs.'
        );

        $booking = Booking::findOrFail($id);

        $request->validate([
            'photo'          => 'nullable|file|image|max:8192',
            'photo_base64'   => 'nullable|string',
            'checklist_item' => 'nullable|string|max:255',
        ]);

        // Resolve photo URL: real upload takes priority over base64
        $photoUrl = null;

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store("booking_proofs/{$booking->id}", 'public');
            $photoUrl = Storage::url($path);
        } elseif ($request->filled('photo_base64')) {
            // Store base64 as a data-URL (suitable for MVP; replace with cloud upload later)
            $photoUrl = $request->photo_base64;
        }

        $proof = BookingCompletionProof::create([
            'booking_id'     => $booking->id,
            'photo_url'      => $photoUrl ?? '',
            'checklist_item' => $request->checklist_item,
            'created_at'     => now(),
        ]);

        return response()->json([
            'message' => 'Proof uploaded successfully.',
            'proof'   => [
                'id'             => $proof->id,
                'booking_id'     => $proof->booking_id,
                'photo_url'      => $proof->photo_url,
                'checklist_item' => $proof->checklist_item,
                'created_at'     => $proof->created_at?->toISOString(),
            ],
        ], 201);
    }
}
