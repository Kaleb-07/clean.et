import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Animated,
  Platform,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Clock,
  MapPin,
  Star,
  MoreVertical,
  Calendar,
  Sparkles,
  Car,
  Building2,
  Info,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  X,
  Trash2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useBookings, Booking } from "../../hooks/useBookings";
import { useColors } from "../../hooks/useColors";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabType = "upcoming" | "completed" | "cancelled";

type ToastType = "success" | "error";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

// ─── Toast Hook ──────────────────────────────────────────────────────────────

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

// ─── Date & Location Formatters ───────────────────────────────────────────────

function formatBookingDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return "Flexible Schedule";
  try {
    const d = new Date(dateStr + "T00:00:00");
    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    let timeFormatted = "";
    if (timeStr) {
      if (timeStr.includes("AM") || timeStr.includes("PM")) {
        timeFormatted = timeStr;
      } else {
        const [h, m] = timeStr.split(":");
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const h12 = hour % 12 || 12;
        timeFormatted = `${h12}:${m || "00"} ${ampm}`;
      }
    }

    return timeFormatted ? `${dateFormatted} • ${timeFormatted}` : dateFormatted;
  } catch {
    return dateStr;
  }
}

function getBookingLocation(item: Booking): string {
  if (item.vehicle) {
    const carName = [item.vehicle.make, item.vehicle.model].filter(Boolean).join(" ");
    if (carName) return carName;
    if (item.vehicle.plate_number) return `Plate: ${item.vehicle.plate_number}`;
    return item.vehicle.vehicle_class || "Mobile Vehicle Detailing";
  }
  if (item.building_profile?.name) {
    return `${item.building_profile.name}${item.building_profile.floor_count ? ` (${item.building_profile.floor_count}F)` : ""}`;
  }
  if (item.requirement_data) {
    const addr =
      item.requirement_data.address ||
      item.requirement_data.location ||
      item.requirement_data.city ||
      item.requirement_data.site;
    if (typeof addr === "string" && addr.trim()) return addr.trim();
  }
  return "Bole Subcity, Addis Ababa";
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { bookings, isLoading, reload, cancelBooking } = useBookings();
  const { toast, show: showToast, opacity, translateY } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [cancelTargetBooking, setCancelTargetBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [moreOptionsBooking, setMoreOptionsBooking] = useState<Booking | null>(null);

  // Auto-reload whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // ─── Filter Bookings By Active Tab ──────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab === "upcoming") {
        return !["completed", "cancelled"].includes(b.status);
      }
      if (activeTab === "completed") {
        return b.status === "completed";
      }
      if (activeTab === "cancelled") {
        return b.status === "cancelled";
      }
      return true;
    });
  }, [bookings, activeTab]);

  // ─── Cancellation Handlers ──────────────────────────────────────────────────
  const handleCancel = (booking: Booking) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setCancelTargetBooking(booking);
  };

  const executeCancel = async () => {
    if (!cancelTargetBooking) return;
    setIsCancelling(true);
    try {
      await cancelBooking(cancelTargetBooking.id);
      setCancelTargetBooking(null);
      showToast("Booking cancelled successfully", "success");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not cancel booking.";
      showToast(message, "error");
    } finally {
      setIsCancelling(false);
    }
  };

  // ─── 3-Dots More Options ───────────────────────────────────────────────────
  const handleMoreOptions = (item: Booking) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMoreOptionsBooking(item);
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/home");
  };

  // ─── Render Booking Card ────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Booking }) => {
    const isUpcoming = !["completed", "cancelled"].includes(item.status);
    const isCompleted = item.status === "completed";
    const isCancelled = item.status === "cancelled";
    const canCancel = ["pending", "confirmed"].includes(item.status);

    // Title & Category
    const title = item.staff?.name
      ? item.staff.name
      : item.sector?.name ?? item.service?.name ?? "Cleaning Service";

    const subtitle = item.staff?.name
      ? `${item.staff.role_title || "Specialist"} • Clean.et`
      : `${item.sector?.category_name || "Care"} • 100% Satisfaction`;

    const dateTime = formatBookingDateTime(item.booking_date, item.booking_time);
    const location = getBookingLocation(item);

    // Visual Icon Box
    const SectorIcon = item.vehicle
      ? Car
      : item.building_profile
      ? Building2
      : Sparkles;

    return (
      <Pressable
        onPress={() => router.push(`/booking/status/${item.id}` as any)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            opacity: pressed ? 0.95 : 1,
          },
        ]}
      >
        {/* ── Top Row: Avatar + Info + More Menu ── */}
        <View style={styles.cardTopRow}>
          {/* Avatar / Service Icon Box */}
          <View style={[styles.avatarBox, { backgroundColor: colors.primaryLight, borderColor: "rgba(59, 130, 246, 0.2)" }]}>
            {item.staff?.name ? (
              <View style={styles.initialsContainer}>
                <Text style={[styles.initialsText, { color: colors.primary }]}>
                  {item.staff.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            ) : (
              <SectorIcon size={28} color={colors.primary} strokeWidth={1.8} />
            )}
          </View>

          {/* Title, Subtitle, Rating */}
          <View style={styles.cardHeaderInfo}>
            <Text style={[styles.providerName, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.providerRole, { color: colors.subtext }]} numberOfLines={1}>
              {subtitle}
            </Text>
            <View style={styles.ratingRow}>
              <Star size={13} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.ratingScore, { color: colors.text }]}> 4.9</Text>
              <Text style={[styles.ratingCount, { color: colors.subtext }]}> (120+)</Text>
            </View>
          </View>

          {/* 3-Dots Menu */}
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              handleMoreOptions(item);
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.6 }]}
          >
            <MoreVertical size={18} color={colors.subtext} />
          </Pressable>
        </View>

        {/* ── Middle Row: Date/Time + Location Strip ── */}
        <View style={[styles.infoStrip, { backgroundColor: colors.isDark ? colors.surface : "#F1F5F9" }]}>
          {/* Date & Time */}
          <View style={styles.stripItem}>
            <Clock size={15} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.stripText, { color: colors.text }]} numberOfLines={1}>
              {dateTime}
            </Text>
          </View>

          {/* Location */}
          <View style={[styles.stripItem, { justifyContent: "flex-end", flex: 0.9 }]}>
            <MapPin size={15} color={colors.secondary} strokeWidth={2} />
            <Text style={[styles.stripText, { color: colors.text }]} numberOfLines={1}>
              {location}
            </Text>
          </View>
        </View>

        {/* ── Bottom Row: Action Buttons ── */}
        <View style={styles.actionsRow}>
          {isUpcoming && (
            <>
              {/* Left Button: Cancel or Details */}
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  if (canCancel) {
                    handleCancel(item);
                  } else {
                    router.push(`/booking/status/${item.id}` as any);
                  }
                }}
                style={({ pressed }) => [
                  styles.btnSecondary,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.btnSecondaryText, { color: colors.text }]}>
                  {canCancel ? "Cancel" : "Details"}
                </Text>
              </Pressable>

              {/* Right Button: Reschedule or Live Track */}
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  if (canCancel) {
                    router.push(`/booking/edit/${item.id}` as any);
                  } else {
                    router.push(`/booking/status/${item.id}` as any);
                  }
                }}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Text style={styles.btnPrimaryText}>
                  {canCancel ? "Reschedule" : "Track Status"}
                </Text>
              </Pressable>
            </>
          )}

          {isCompleted && (
            <>
              {/* Left Button: Details / Invoice */}
              <Pressable
                onPress={() => router.push(`/booking/status/${item.id}` as any)}
                style={({ pressed }) => [
                  styles.btnSecondary,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.btnSecondaryText, { color: colors.text }]}>
                  Details
                </Text>
              </Pressable>

              {/* Right Button: Rebook */}
              <Pressable
                onPress={() => router.push("/(tabs)/home" as any)}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Text style={styles.btnPrimaryText}>Book Again</Text>
              </Pressable>
            </>
          )}

          {isCancelled && (
            <>
              {/* Left Button: Details */}
              <Pressable
                onPress={() => router.push(`/booking/status/${item.id}` as any)}
                style={({ pressed }) => [
                  styles.btnSecondary,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.btnSecondaryText, { color: colors.text }]}>
                  Details
                </Text>
              </Pressable>

              {/* Right Button: Rebook */}
              <Pressable
                onPress={() => router.push("/(tabs)/home" as any)}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Text style={styles.btnPrimaryText}>Book Again</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={handleBack}
          style={[
            styles.backBtn,
            { backgroundColor: colors.surface, borderColor: colors.cardBorder },
          ]}
        >
          <ChevronLeft color={colors.text} size={22} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>My Bookings</Text>

        <View style={{ width: 42 }} />
      </View>

      {/* ── Segmented Tab Selector ── */}
      <View
        style={[
          styles.tabsContainer,
          {
            backgroundColor: colors.surface,
            borderWidth: colors.isDark ? 0 : 1,
            borderColor: colors.border,
            elevation: colors.isDark ? 0 : 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: colors.isDark ? 0 : 0.05,
            shadowRadius: 3,
          },
        ]}
      >
        {(["upcoming", "completed", "cancelled"] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <Pressable
              key={tab}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.selectionAsync();
                }
                setActiveTab(tab);
              }}
              style={[
                styles.tabPill,
                isActive && {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.35,
                  shadowRadius: 5,
                  elevation: 4,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? "#FFFFFF" : colors.subtext,
                    fontWeight: isActive ? "700" : "600",
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Bookings List ── */}
      <FlatList
        data={filteredBookings}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={reload}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.surface }]}>
                <Calendar size={36} color={colors.subtext} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No {activeTab} bookings
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.subtext }]}>
                {activeTab === "upcoming"
                  ? "You don't have any upcoming cleanings scheduled."
                  : activeTab === "completed"
                  ? "Completed appointments will appear here."
                  : "You have no cancelled bookings."}
              </Text>
              {activeTab === "upcoming" && (
                <Pressable
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/(tabs)/home" as any)}
                >
                  <Text style={styles.emptyBtnText}>Book a Service</Text>
                </Pressable>
              )}
            </View>
          ) : null
        }
      />

      {/* ── Cancel Confirmation Modal ── */}
      <Modal
        visible={!!cancelTargetBooking}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isCancelling) setCancelTargetBooking(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!isCancelling) setCancelTargetBooking(null);
            }}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalIconWrap}>
              <View style={[styles.modalIconCircle, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                <Trash2 size={28} color="#ef4444" />
              </View>
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>Cancel Booking?</Text>
            <Text style={[styles.modalMessage, { color: colors.subtext }]}>
              Are you sure you want to cancel booking #{cancelTargetBooking?.id} for{" "}
              <Text style={{ fontWeight: "700", color: colors.text }}>
                {cancelTargetBooking?.sector?.name ?? cancelTargetBooking?.service?.name ?? "Cleaning Service"}
              </Text>? This action cannot be undone.
            </Text>

            <View style={styles.modalButtonsRow}>
              <Pressable
                disabled={isCancelling}
                onPress={() => setCancelTargetBooking(null)}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Keep Booking</Text>
              </Pressable>

              <Pressable
                disabled={isCancelling}
                onPress={executeCancel}
                style={({ pressed }) => [
                  styles.modalConfirmBtn,
                  { backgroundColor: "#ef4444" },
                  (pressed || isCancelling) && { opacity: 0.8 },
                ]}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Yes, Cancel</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 3-Dots More Options Modal Sheet ── */}
      <Modal
        visible={!!moreOptionsBooking}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreOptionsBooking(null)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMoreOptionsBooking(null)}
          />
          <View style={[styles.sheetContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Booking #{moreOptionsBooking?.id}
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.subtext }]}>
                {moreOptionsBooking?.sector?.name ?? moreOptionsBooking?.service?.name ?? "Cleaning Service"}
              </Text>
            </View>

            <View style={styles.sheetActionsList}>
              <Pressable
                onPress={() => {
                  const bId = moreOptionsBooking?.id;
                  setMoreOptionsBooking(null);
                  router.push(`/booking/status/${bId}` as any);
                }}
                style={({ pressed }) => [styles.sheetActionItem, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
              >
                <Info size={18} color={colors.primary} />
                <Text style={[styles.sheetActionText, { color: colors.text }]}>View Live Status</Text>
              </Pressable>

              {["pending", "confirmed"].includes(moreOptionsBooking?.status ?? "") && (
                <>
                  <Pressable
                    onPress={() => {
                      const bId = moreOptionsBooking?.id;
                      setMoreOptionsBooking(null);
                      router.push(`/booking/edit/${bId}` as any);
                    }}
                    style={({ pressed }) => [styles.sheetActionItem, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                  >
                    <Clock size={18} color={colors.primary} />
                    <Text style={[styles.sheetActionText, { color: colors.text }]}>Reschedule Date / Time</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      const b = moreOptionsBooking;
                      setMoreOptionsBooking(null);
                      if (b) setCancelTargetBooking(b);
                    }}
                    style={({ pressed }) => [styles.sheetActionItem, { borderColor: "rgba(239,68,68,0.2)" }, pressed && { opacity: 0.7 }]}
                  >
                    <Trash2 size={18} color="#ef4444" />
                    <Text style={[styles.sheetActionText, { color: "#ef4444", fontWeight: "700" }]}>Cancel Booking</Text>
                  </Pressable>
                </>
              )}

              <Pressable
                onPress={() => setMoreOptionsBooking(null)}
                style={({ pressed }) => [styles.sheetDismissBtn, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.sheetDismissText, { color: colors.subtext }]}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },

  // ── Segmented Tabs ────────────────────────
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 14,
  },

  // ── List ──────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // ── Booking Card ──────────────────────────
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  initialsContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  initialsText: {
    fontSize: 18,
    fontWeight: "800",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  providerRole: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: "700",
  },
  ratingCount: {
    fontSize: 11,
    fontWeight: "500",
  },
  moreBtn: {
    padding: 6,
    alignSelf: "flex-start",
  },

  // ── Date & Location Strip ─────────────────
  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 14,
    gap: 8,
  },
  stripItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  stripText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Action Buttons ────────────────────────
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  btnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  btnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Empty State ───────────────────────────
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Toast ─────────────────────────────────
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },

  // ── Modals ────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrap: {
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  sheetSubtitle: {
    fontSize: 13,
  },
  sheetActionsList: {
    gap: 10,
  },
  sheetActionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  sheetActionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  sheetDismissBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  sheetDismissText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
