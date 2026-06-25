import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Calendar,
  ChevronRight,
  Clock,
  Info,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react-native";
import { useBookings, Booking } from "../../hooks/useBookings";

// ─── In-app Toast ────────────────────────────────────────────────────────────

type ToastType = "success" | "error";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

function useToast() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (message: string, type: ToastType = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message, type });
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 14,
      }),
    ]).start();
    timerRef.current = setTimeout(() => hide(), 3500);
  };

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 20,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setToast((t) => ({ ...t, visible: false })));
  };

  return { toast, show, hide, opacity, translateY };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { bookings, isLoading, reload, cancelBooking } = useBookings();
  const { toast, show: showToast, opacity, translateY } = useToast();

  const handleCancel = (booking: Booking) => {
    Alert.alert(
      "Cancel Booking?",
      "This will cancel your scheduled wash. This action cannot be undone.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelBooking(booking.id);
              showToast("Booking cancelled successfully", "success");
            } catch (e) {
              const message =
                e instanceof Error ? e.message : "Could not cancel booking.";
              showToast(message, "error");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Booking }) => {
    // Determine display name: sector-based takes priority, fall back to legacy service
    const displayName =
      item.sector?.name ?? item.service?.name ?? "Cleaning Service";
    const categoryName = item.sector?.category_name ?? null;
    // Price: estimated_price from sector pricing, or legacy service price
    const displayPrice =
      item.estimated_price ?? item.service?.price ?? null;

    const formattedDate = new Date(
      item.booking_date + "T00:00:00"
    ).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const statusConfig: Record<
      string,
      { color: string; bg: string; label: string }
    > = {
      pending:         { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",   label: "Pending" },
      confirmed:       { color: "#3b82f6", bg: "rgba(59,130,246,0.15)",   label: "Confirmed" },
      driver_assigned: { color: "#06b6d4", bg: "rgba(6,182,212,0.15)",    label: "Driver Assigned" },
      picked_up:       { color: "#8b5cf6", bg: "rgba(139,92,246,0.15)",   label: "Picked Up" },
      in_progress:     { color: "#a855f7", bg: "rgba(168,85,247,0.15)",   label: "In Progress" },
      invoiced:        { color: "#f97316", bg: "rgba(249,115,22,0.15)",   label: "Invoiced" },
      completed:       { color: "#10b981", bg: "rgba(16,185,129,0.15)",   label: "Completed" },
      cancelled:       { color: "#ef4444", bg: "rgba(239,68,68,0.15)",    label: "Cancelled" },
    };

    const sc = statusConfig[item.status] ?? {
      color: "#a3a3a3",
      bg: "rgba(163,163,163,0.15)",
      label: item.status,
    };

    // Cancellable only if the job hasn't started or been settled
    const canCancel = [
      "pending",
      "confirmed",
    ].includes(item.status);

    // Sub-info line: vehicle or building profile
    const subInfo = item.vehicle
      ? [
          item.vehicle.make,
          item.vehicle.model,
          item.vehicle.plate_number,
        ]
          .filter(Boolean)
          .join(" ") || item.vehicle.vehicle_class
      : item.building_profile
      ? `${item.building_profile.name} · ${item.building_profile.floor_count}F`
      : null;

    return (
      <Pressable
        onPress={() => router.push(`/booking/status/${item.id}`)}
        style={({ pressed }) => [pressed && { opacity: 0.8 }]}
      >
        <BlurView intensity={20} tint="dark" style={styles.card}>
          {/* ── Card Header ── */}
          <View style={styles.cardHeader}>
            <View style={styles.cardLeft}>
              {categoryName ? (
                <Text style={styles.categoryPill}>{categoryName}</Text>
              ) : null}
              <Text style={styles.serviceName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.dateContainer}>
                <Calendar size={13} color="#a3a3a3" />
                <Text style={styles.dateText}>{formattedDate}</Text>
                <Clock size={13} color="#a3a3a3" style={{ marginLeft: 6 }} />
                <Text style={styles.dateText}>{item.booking_time}</Text>
              </View>
              {subInfo ? (
                <Text style={styles.subInfo} numberOfLines={1}>
                  {subInfo}
                </Text>
              ) : null}
            </View>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: sc.bg, borderColor: sc.color },
              ]}
            >
              <Text style={[styles.statusText, { color: sc.color }]}>
                {sc.label}
              </Text>
            </View>
          </View>

          {/* ── Card Footer ── */}
          <View style={styles.cardFooter}>
            {displayPrice != null ? (
              <Text style={styles.price}>
                ETB {Number(displayPrice).toLocaleString("en-ET", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            ) : (
              <Text style={styles.priceUnknown}>Price TBD</Text>
            )}

            {canCancel ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleCancel(item);
                }}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && { opacity: 0.65 },
                ]}
              >
                <X size={13} color="#fca5a5" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            ) : (
              <ChevronRight size={20} color="#a3a3a3" />
            )}
          </View>
        </BlurView>
      </Pressable>
    );
  };

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 60) }]}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      <FlatList
        data={bookings}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshing={isLoading}
        onRefresh={reload}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Info size={32} color="#a3a3a3" />
              </View>
              <Text style={styles.emptyTitle}>No Bookings Yet</Text>
              <Text style={styles.emptyText}>
                Your upcoming cleaning appointments will appear here.
              </Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push("/home")}
              >
                <Text style={styles.emptyButtonText}>Book a Service</Text>
              </Pressable>
            </View>
          ) : null
        }
      />

      {/* ── Toast Notification ── */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 24,
              opacity,
              transform: [{ translateY }],
              backgroundColor:
                toast.type === "success"
                  ? "rgba(16,185,129,0.95)"
                  : "rgba(239,68,68,0.95)",
            },
          ]}
        >
          {toast.type === "success" ? (
            <CheckCircle size={18} color="#fff" />
          ) : (
            <AlertCircle size={18} color="#fff" />
          )}
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 14,
  },

  // ── Card ─────────────────────────────────
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 10,
  },
  cardLeft: {
    flex: 1,
  },
  categoryPill: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6366f1",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  dateText: {
    fontSize: 13,
    color: "#a3a3a3",
  },
  subInfo: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },

  // ── Status Badge ─────────────────────────
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
    flexShrink: 0, // never shrinks — always shows fully
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Footer ───────────────────────────────
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 14,
  },
  price: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  priceUnknown: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  cancelBtnText: {
    color: "#fca5a5",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Empty State ──────────────────────────
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#a3a3a3",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: "#6d28d9",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  // ── Toast ────────────────────────────────
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
});
