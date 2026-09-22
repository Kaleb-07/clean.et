<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    // ── GET /notifications ─────────────────────────────────────────────
    // Returns all notifications for the authenticated user (latest first)
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::forUser($request->user()->id)
            ->latest()
            ->get()
            ->map(fn($n) => $this->format($n));

        $unreadCount = Notification::forUser($request->user()->id)
            ->unread()
            ->count();

        return response()->json([
            'data'         => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    // ── POST /notifications/{id}/read ──────────────────────────────────
    public function markRead(Request $request, int $id): JsonResponse
    {
        $notification = Notification::forUser($request->user()->id)->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['message' => 'Marked as read.']);
    }

    // ── POST /notifications/read-all ───────────────────────────────────
    public function markAllRead(Request $request): JsonResponse
    {
        Notification::forUser($request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    // ── DELETE /notifications/{id} ─────────────────────────────────────
    public function destroy(Request $request, int $id): JsonResponse
    {
        $notification = Notification::forUser($request->user()->id)->findOrFail($id);
        $notification->delete();

        return response()->json(['message' => 'Notification deleted.']);
    }

    // ── DELETE /notifications ──────────────────────────────────────────
    public function destroyAll(Request $request): JsonResponse
    {
        Notification::forUser($request->user()->id)->delete();

        return response()->json(['message' => 'All notifications deleted.']);
    }

    // ── GET /notifications/unread-count ────────────────────────────────
    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::forUser($request->user()->id)->unread()->count();

        return response()->json(['unread_count' => $count]);
    }

    // ── GET /notifications/preferences ─────────────────────────────────
    public function getPreferences(Request $request): JsonResponse
    {
        $prefs = $request->user()->getNotificationPreferences();

        return response()->json([
            'status' => 'success',
            'data'   => $prefs,
        ]);
    }

    // ── POST /notifications/preferences ────────────────────────────────
    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'appointment_updates' => 'sometimes|boolean',
            'reminders'           => 'sometimes|boolean',
            'chat_messages'       => 'sometimes|boolean',
            'promotions'          => 'sometimes|boolean',
            'email_notifications' => 'sometimes|boolean',
            'sms_notifications'   => 'sometimes|boolean',
        ]);

        $user = $request->user();
        $current = $user->getNotificationPreferences();
        $updated = array_merge($current, $validated);

        $user->notification_preferences = $updated;
        $user->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Notification preferences updated successfully.',
            'data'    => $updated,
        ]);
    }

    // ── Format helper ──────────────────────────────────────────────────
    private function format(Notification $n): array
    {
        return [
            'id'         => $n->id,
            'type'       => $n->type,
            'title'      => $n->title,
            'body'       => $n->body,
            'data'       => $n->data,
            'is_unread'  => $n->isUnread(),
            'read_at'    => $n->read_at?->toIso8601String(),
            'created_at' => $n->created_at->toIso8601String(),
        ];
    }
}
