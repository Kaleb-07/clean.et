import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import API from "../../src/api/client";
import { useAuth } from "../../contexts/AuthContext";

/* ─── TYPES ──────────────────────────────────────────────────────────────── */
type BookingStatus =
  | "pending" | "confirmed" | "driver_assigned" | "picked_up"
  | "in_progress" | "completed" | "invoiced" | "cancelled";

type ChapaStep =
  | "method"      // pick mobile method (telebirr, cbebirr…)
  | "phone"       // enter phone number
  | "processing"  // waiting for USSD / OTP
  | "success"     // payment confirmed
  | "failed";     // payment failed / cancelled / timed out

type MobileMethod = {
  id: string;
  label: string;
  color: string;
  icon: string;
};

interface Booking {
  id: number;
  status: BookingStatus;
  price: number | null;
  booking_date?: string;
  booking_time?: string;
  address?: string;
  notes?: string;
  service?: { name: string; price?: number; sub_center?: string };
  customer?: {
    name?: string;
    phone?: string;
    user?: { name?: string; phone?: string; email?: string };
  };
  staff?: { id: number; role_title: string; user?: { id?: string | number; name: string } };
}

/* ─── STATUS CONFIG ──────────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:         { label: "Accepted",    color: "#FBBF24", bg: "#FBBF2420", icon: "checkmark-circle-outline" },
  confirmed:       { label: "Confirmed",   color: "#60A5FA", bg: "#60A5FA20", icon: "checkmark-circle-outline" },
  driver_assigned: { label: "New Job",     color: "#A78BFA", bg: "#A78BFA20", icon: "flash-outline" },
  picked_up:       { label: "Picked Up",   color: "#818CF8", bg: "#818CF820", icon: "car-outline" },
  in_progress:     { label: "In Progress", color: "#C084FC", bg: "#C084FC20", icon: "play-circle-outline" },
  completed:       { label: "Completed",   color: "#34D399", bg: "#34D39920", icon: "checkmark-done-circle-outline" },
  invoiced:        { label: "Invoiced",    color: "#2DD4BF", bg: "#2DD4BF20", icon: "document-text-outline" },
  cancelled:       { label: "Cancelled",   color: "#F87171", bg: "#F8717120", icon: "close-circle-outline" },
};

/* ─── CHAPA MOBILE METHODS ───────────────────────────────────────────────── */
const MOBILE_METHODS: MobileMethod[] = [
  { id: "telebirr",  label: "Telebirr",   color: "#F59E0B", icon: "phone-portrait-outline" },
  { id: "cbebirr",   label: "CBE Birr",   color: "#3B82F6", icon: "card-outline" },
  { id: "mpesa",     label: "M-Pesa",     color: "#16A34A", icon: "phone-portrait-outline" },
  { id: "awashbirr", label: "Awash Birr", color: "#7C3AED", icon: "wallet-outline" },
  { id: "ebirr",     label: "eBirr",      color: "#DC2626", icon: "phone-portrait-outline" },
];

/* ─── ACTION CONFIG ──────────────────────────────────────────────────────── */
interface ActionDef {
  label: string;
  icon: string;
  next: BookingStatus;
  color: string;
  bg: string;
  confirm?: string;
}

function getActions(status: BookingStatus): ActionDef[] {
  switch (status) {
    case "driver_assigned":
      return [
        { label: "Accept Job",   icon: "checkmark-circle", next: "pending",     color: "#34D399", bg: "#34D39920" },
        { label: "Decline",      icon: "close-circle",     next: "cancelled",   color: "#F87171", bg: "#F8717120",
          confirm: "Are you sure you want to decline this job?" },
      ];
    case "pending":
    case "confirmed":
      return [
        { label: "Start Cleaning", icon: "play-circle",   next: "in_progress", color: "#C084FC", bg: "#C084FC20" },
        { label: "Cancel",         icon: "close-circle",  next: "cancelled",   color: "#F87171", bg: "#F8717120",
          confirm: "Are you sure you want to cancel this job?" },
      ];
    case "in_progress":
      return [
        { label: "Mark Completed", icon: "checkmark-done-circle", next: "completed", color: "#34D399", bg: "#34D39920" },
        { label: "Cancel Job",     icon: "close-circle",          next: "cancelled", color: "#F87171", bg: "#F8717120",
          confirm: "Are you sure you want to cancel this in-progress job?" },
      ];
    default:
      return [];
  }
}

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
/** Normalise phone to 251XXXXXXXXX */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("251") && digits.length === 12) return digits;
  if (digits.startsWith("0")   && digits.length === 10) return "251" + digits.slice(1);
  if (digits.startsWith("9")   && digits.length === 9)  return "251" + digits;
  return digits;
}

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */
function StatCard({
  value, label, color, icon, delay,
}: { value: number; label: string; color: string; icon: string; delay: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={[styles.statCard, { borderColor: color + "30" }]}
    >
      <View style={[styles.statIconBox, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

/* ─── JOB CARD ───────────────────────────────────────────────────────────── */
function JobCard({
  booking, onPress, delay,
}: { booking: Booking; onPress: () => void; delay: number }) {
  const cfg        = STATUS_CFG[booking.status] || STATUS_CFG.pending;
  const clientName = booking.customer?.name || booking.customer?.user?.name || "Client";
  const hasActions = getActions(booking.status).length > 0;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity style={styles.jobCard} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />
        <View style={styles.jobCardBody}>
          <View style={styles.jobCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.jobCardId}>JOB #{booking.id}</Text>
              <Text style={styles.jobCardService} numberOfLines={1}>
                {booking.service?.name || "Service"}
              </Text>
            </View>
            <View style={[styles.jobStatusPill, { backgroundColor: cfg.bg, borderColor: cfg.color + "50" }]}>
              <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
              <Text style={[styles.jobStatusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          <View style={styles.jobMetaRow}>
            <View style={styles.jobMeta}>
              <Ionicons name="person-outline" size={12} color="#64748B" />
              <Text style={styles.jobMetaText} numberOfLines={1}>{clientName}</Text>
            </View>
            {booking.booking_time && (
              <View style={styles.jobMeta}>
                <Ionicons name="time-outline" size={12} color="#64748B" />
                <Text style={styles.jobMetaText}>{booking.booking_time}</Text>
              </View>
            )}
          </View>
          {hasActions && <Text style={styles.tapHint}>Tap to manage this job →</Text>}
        </View>
        <View style={styles.jobCardChevron}>
          <Ionicons name="chevron-forward" size={16} color={hasActions ? cfg.color : "#334155"} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function StaffDashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [inspecting,   setInspecting]   = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Payment modal state ── */
  const [paymentModal,   setPaymentModal]   = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [paymentMethod,  setPaymentMethod]  = useState<"cash" | "chapa" | null>(null);
  const [cashAmount,     setCashAmount]     = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  /* ── Chapa Direct Charge state ── */
  const [chapaStep,        setChapaStep]        = useState<ChapaStep>("method");
  const [chapaMobileMethod, setChapaMobileMethod] = useState<string>("telebirr");
  const [chapaPhone,       setChapaPhone]       = useState("");
  const [chapaPhoneError,  setChapaPhoneError]  = useState("");
  const [chapaTxRef,       setChapaTxRef]       = useState<string | null>(null);
  const [chapaCheckoutUrl, setChapaCheckoutUrl] = useState<string | null>(null);
  const [chapaFailReason,  setChapaFailReason]  = useState("");
  const [pollCount,        setPollCount]        = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progressAnim = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%` as any,
  }));

  /* ─────────────────────────────────────────────────────────────────────────
     DATA LOADING
     ───────────────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      const [bRes, stRes] = await Promise.allSettled([
        API.get("/bookings"),
        API.get("/staff"),
      ]);

      let profile: any = null;
      if (stRes.status === "fulfilled") {
        const list: any[] = stRes.value.data?.data ?? stRes.value.data ?? [];
        profile = list.find(
          (s: any) => s.user?.id === user?.id || s.user_id === user?.id
        ) ?? null;
        setStaffProfile(profile);
      }

      if (bRes.status === "fulfilled") {
        const all: Booking[] = bRes.value.data?.data ?? bRes.value.data ?? [];
        const mine = all.filter((b) => {
          const staffUserId  = (b.staff as any)?.user?.id;
          const staffUserId2 = (b.staff as any)?.user_id;
          const byUserId     = staffUserId  != null && String(staffUserId)  === String(user?.id);
          const byUserId2    = staffUserId2 != null && String(staffUserId2) === String(user?.id);
          const byStaffId    = profile ? b.staff?.id === profile.id : false;
          return byUserId || byUserId2 || byStaffId;
        });
        setBookings(mine);

        const done = mine.filter(
          (b) => b.status === "completed" || b.status === "invoiced"
        ).length;
        progressAnim.value = withDelay(
          400,
          withTiming(mine.length > 0 ? done / mine.length : 0, {
            duration: 1000,
            easing: Easing.out(Easing.cubic),
          })
        );
      }
    } catch (e) {
      console.log("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  /* ─────────────────────────────────────────────────────────────────────────
     COMPLETE BOOKING (optimistic)
     ───────────────────────────────────────────────────────────────────────── */
  const completeBooking = useCallback(async (booking: Booking) => {
    // Already in a terminal state — just update local state silently
    if (booking.status === "completed" || booking.status === "invoiced") {
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status: "completed" as BookingStatus } : b))
      );
      Alert.alert("✅ Payment Collected", "Payment recorded and job is complete.");
      return;
    }
    try {
      await API.patch(`/bookings/${booking.id}/staff-status`, { status: "completed" });
      setBookings((prev) => {
        const next = prev.map((b) =>
          b.id === booking.id ? { ...b, status: "completed" as BookingStatus } : b
        );
        const done = next.filter(
          (b) => b.status === "completed" || b.status === "invoiced"
        ).length;
        progressAnim.value = withTiming(next.length > 0 ? done / next.length : 0, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        });
        return next;
      });
      Alert.alert("✅ Job Completed", "Payment collected and job marked as completed.");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Could not mark job as completed.";
      // Transition error means it's already in the right state — treat as success
      if (msg.toLowerCase().includes("cannot transition") || msg.toLowerCase().includes("completed")) {
        setBookings((prev) =>
          prev.map((b) => (b.id === booking.id ? { ...b, status: "completed" as BookingStatus } : b))
        );
        Alert.alert("✅ Payment Collected", "Payment recorded successfully.");
      } else {
        Alert.alert("Status Update Failed", msg);
      }
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     OPEN PAYMENT MODAL
     ───────────────────────────────────────────────────────────────────────── */
  const openPaymentModal = useCallback((booking: Booking) => {
    setPaymentBooking(booking);
    setPaymentMethod("cash");
    setCashAmount(String(Number(booking.price || 0).toFixed(2)));
    setInspecting(null);
    setPaymentModal(true);
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     CHAPA DIRECT CHARGE — INITIATE
     ───────────────────────────────────────────────────────────────────────── */
  const initiateChapaDirectCharge = useCallback(async () => {
    if (!paymentBooking) return;

    const raw   = chapaPhone.trim();
    const phone = normalisePhone(raw);

    // Validate phone format
    if (!/^251\d{9}$/.test(phone)) {
      setChapaPhoneError("Enter a valid Ethiopian phone: 09XXXXXXXX or 251XXXXXXXXX");
      return;
    }
    setChapaPhoneError("");
    setChapaStep("processing");
    setPollCount(0);

    try {
      const res  = await API.post(`/bookings/${paymentBooking.id}/collect-payment`, {
        provider:        "chapa",
        phone_number:    phone,
        payment_method:  chapaMobileMethod,
        return_url:      "cleanet://payment-callback",
      });
      const data = res.data;

      setChapaTxRef(data.chapa_tx_ref ?? data.payment?.chapa_tx_ref ?? null);
      setChapaCheckoutUrl(data.checkout_url ?? null);

      // If the gateway already returned paid (unlikely in direct charge but handle it)
      if (data.paid) {
        setChapaStep("success");
        setPaymentModal(false);
        await completeBooking(paymentBooking);
        return;
      }

      // Start polling
      startPolling(paymentBooking);

    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Could not initiate payment.";
      setChapaFailReason(msg);
      setChapaStep("failed");
    }
  }, [paymentBooking, chapaPhone, chapaMobileMethod, completeBooking]);

  /* ─────────────────────────────────────────────────────────────────────────
     CHAPA POLLING — checks backend every 4 s, up to ~90 s (22 polls)
     ───────────────────────────────────────────────────────────────────────── */
  const startPolling = useCallback(
    (booking: Booking) => {
      let count = 0;
      const MAX_POLLS = 22; // 22 × 4 s ≈ 88 s

      const poll = async () => {
        count += 1;
        setPollCount(count);

        try {
          const res    = await API.get(`/bookings/${booking.id}/payment-status`);
          const status = res.data?.status as string;
          const paid   = res.data?.paid as boolean;

          if (paid || status === "completed") {
            setChapaStep("success");
            setPaymentModal(false);
            await completeBooking(booking);
            return;
          }

          if (status === "failed") {
            setChapaFailReason(
              "Payment failed. This could be due to insufficient funds, cancellation, or a timeout."
            );
            setChapaStep("failed");
            return;
          }
        } catch (err) {
          // Network hiccup — keep polling
          console.warn("Chapa poll error:", err);
        }

        if (count >= MAX_POLLS) {
          setChapaFailReason(
            "Payment timed out. Please ask the client to check their phone and try again."
          );
          setChapaStep("failed");
          return;
        }

        // Schedule next poll
        pollTimerRef.current = setTimeout(poll, 4000);
      };

      pollTimerRef.current = setTimeout(poll, 4000);
    },
    [completeBooking]
  );

  // Clear poll timer when modal closes
  useEffect(() => {
    if (!paymentModal && pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
    }
  }, [paymentModal]);

  /* ─────────────────────────────────────────────────────────────────────────
     CASH PAYMENT
     ───────────────────────────────────────────────────────────────────────── */
  const handleCashPayment = useCallback(async () => {
    if (!paymentBooking) return;
    const amt = parseFloat(cashAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter the amount received from the client.");
      return;
    }

    setPaymentLoading(true);
    try {
      try {
        await API.post(`/bookings/${paymentBooking.id}/collect-payment`, {
          provider:        "cash",
          amount_received: amt,
        });
      } catch (paymentErr: any) {
        console.warn("cash collect-payment failed (non-blocking):", paymentErr?.response?.data?.message);
      }
      setPaymentModal(false);
      await completeBooking(paymentBooking);
    } finally {
      setPaymentLoading(false);
    }
  }, [paymentBooking, cashAmount, completeBooking]);

  /* ─────────────────────────────────────────────────────────────────────────
     CONFIRM BUTTON HANDLER
     ───────────────────────────────────────────────────────────────────────── */
  const handleConfirm = useCallback(() => {
    if (paymentMethod === "cash") {
      handleCashPayment();
    } else if (paymentMethod === "chapa") {
      // Move from method-select to phone-entry step
      setChapaStep("phone");
    }
  }, [paymentMethod, handleCashPayment]);

  /* ─────────────────────────────────────────────────────────────────────────
     STATUS ACTION (accept / start / cancel)
     ───────────────────────────────────────────────────────────────────────── */
  const handleAction = useCallback(
    (action: ActionDef) => {
      if (!inspecting) return;

      if (action.next === "completed") {
        openPaymentModal(inspecting);
        return;
      }

      const execute = async () => {
        setActionLoading(true);
        try {
          await API.patch(`/bookings/${inspecting.id}/staff-status`, { status: action.next });
          const updated: Booking = { ...inspecting, status: action.next as BookingStatus };
          setInspecting(updated);
          setBookings((prev) => {
            const next = prev.map((b) =>
              b.id === inspecting.id ? { ...b, status: action.next as BookingStatus } : b
            );
            const done = next.filter(
              (b) => b.status === "completed" || b.status === "invoiced"
            ).length;
            progressAnim.value = withTiming(
              next.length > 0 ? done / next.length : 0,
              { duration: 600, easing: Easing.out(Easing.cubic) }
            );
            return next;
          });
        } catch (e: any) {
          Alert.alert(
            "Update Failed",
            e?.response?.data?.message || "Could not update job status."
          );
        } finally {
          setActionLoading(false);
        }
      };

      if (action.confirm) {
        Alert.alert("Confirm Action", action.confirm, [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", style: "destructive", onPress: execute },
        ]);
      } else {
        execute();
      }
    },
    [inspecting, openPaymentModal]
  );

  /* ─────────────────────────────────────────────────────────────────────────
     DERIVED VALUES
     ───────────────────────────────────────────────────────────────────────── */
  const today         = todayStr();
  const newJobs       = bookings.filter((b) => b.status === "driver_assigned");
  const activeJobs    = bookings.filter(
    (b) => b.status === "in_progress" || b.status === "pending" || b.status === "confirmed"
  );
  const todayJobs     = bookings.filter(
    (b) =>
      b.booking_date === today &&
      b.status !== "completed" &&
      b.status !== "cancelled" &&
      b.status !== "invoiced"
  );
  const completed     = bookings.filter(
    (b) => b.status === "completed" || b.status === "invoiced"
  );
  const completionPct =
    bookings.length > 0 ? Math.round((completed.length / bookings.length) * 100) : 0;
  const nextJob       = newJobs[0] ?? activeJobs[0] ?? todayJobs[0] ?? null;
  const currentActions = inspecting ? getActions(inspecting.status) : [];

  const selectedMethod = MOBILE_METHODS.find((m) => m.id === chapaMobileMethod)!;

  /* ─────────────────────────────────────────────────────────────────────────
     LOADING STATE
     ───────────────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color="#A78BFA" size="large" />
        <Text style={{ color: "#64748B", marginTop: 12, fontSize: 13 }}>Loading dashboard…</Text>
      </View>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A78BFA" />
        }
      >
        {/* ══ GREETING ══ */}
        <Animated.View entering={FadeInUp.duration(500)} style={styles.greetingSection}>
          <View>
            <Text style={styles.greetingTop}>{getGreeting()},</Text>
            <Text style={styles.greetingName}>
              {(user?.name || "Technician").split(" ")[0]} 👋
            </Text>
            <Text style={styles.greetingRole}>
              {staffProfile?.role_title || "Field Technician"}
            </Text>
          </View>
          <TouchableOpacity onPress={load} style={styles.refreshPill}>
            <Ionicons name="refresh-outline" size={15} color="#A78BFA" />
          </TouchableOpacity>
        </Animated.View>

        {/* ══ NEW JOB BANNER ══ */}
        {newJobs.length > 0 && (
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <TouchableOpacity
              style={styles.newJobBanner}
              onPress={() => setInspecting(newJobs[0])}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#4C1D95", "#6D28D9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newJobBannerGrad}
              >
                <View style={styles.newJobBannerLeft}>
                  <View style={styles.newJobDot} />
                  <View>
                    <Text style={styles.newJobBannerTitle}>
                      {newJobs.length} New Job{newJobs.length > 1 ? "s" : ""} Assigned
                    </Text>
                    <Text style={styles.newJobBannerSub}>Tap to review and accept</Text>
                  </View>
                </View>
                <Ionicons
                  name="arrow-forward-circle"
                  size={22}
                  color="rgba(196,181,253,0.7)"
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ══ STAT CARDS ══ */}
        <View style={styles.statsRow}>
          <StatCard value={newJobs.length}    label="New"    color="#A78BFA" icon="flash-outline"                 delay={100} />
          <StatCard value={activeJobs.length} label="Active" color="#C084FC" icon="play-circle-outline"           delay={150} />
          <StatCard value={completed.length}  label="Done"   color="#34D399" icon="checkmark-done-circle-outline" delay={200} />
          <StatCard value={bookings.length}   label="Total"  color="#60A5FA" icon="layers-outline"                delay={250} />
        </View>

        {/* ══ COMPLETION PROGRESS ══ */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.progressCard}
        >
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Overall Completion</Text>
              <Text style={styles.progressSub}>
                {completed.length} of {bookings.length} jobs done
              </Text>
            </View>
            <Text style={styles.progressPct}>{completionPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
        </Animated.View>

        {/* ══ NEXT UP CARD ══ */}
        {nextJob && (
          <Animated.View entering={FadeInDown.delay(360).springify()}>
            <TouchableOpacity
              style={styles.nextCard}
              activeOpacity={0.88}
              onPress={() => setInspecting(nextJob)}
            >
              <LinearGradient
                colors={["#3B0764", "#5B21B6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nextGradient}
              >
                <View style={styles.nextTop}>
                  <View style={styles.nextLabelPill}>
                    <Ionicons name="flash" size={11} color="#C4B5FD" />
                    <Text style={styles.nextLabelText}>
                      {newJobs.length > 0
                        ? "NEEDS ACCEPTANCE"
                        : activeJobs.length > 0
                        ? "ACTIVE JOB"
                        : "UP NEXT"}
                    </Text>
                  </View>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={22}
                    color="rgba(196,181,253,0.5)"
                  />
                </View>
                <Text style={styles.nextService} numberOfLines={1}>
                  {nextJob.service?.name || "Cleaning Service"}
                </Text>
                <View style={styles.nextMetas}>
                  <View style={styles.nextMeta}>
                    <Ionicons name="person-circle-outline" size={14} color="#C4B5FD" />
                    <Text style={styles.nextMetaText} numberOfLines={1}>
                      {nextJob.customer?.name || nextJob.customer?.user?.name || "Client"}
                    </Text>
                  </View>
                  {nextJob.booking_time && (
                    <View style={styles.nextMeta}>
                      <Ionicons name="time-outline" size={14} color="#C4B5FD" />
                      <Text style={styles.nextMetaText}>{nextJob.booking_time}</Text>
                    </View>
                  )}
                  {nextJob.address && (
                    <View style={[styles.nextMeta, { flex: 1 }]}>
                      <Ionicons name="location-outline" size={14} color="#C4B5FD" />
                      <Text style={styles.nextMetaText} numberOfLines={1}>
                        {nextJob.address}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.nextFooter}>
                  <View style={[styles.jobStatusPill, {
                    backgroundColor: "rgba(196,181,253,0.15)",
                    borderColor: "rgba(196,181,253,0.3)",
                  }]}>
                    <Ionicons
                      name={STATUS_CFG[nextJob.status]?.icon as any}
                      size={11}
                      color="#C4B5FD"
                    />
                    <Text style={[styles.jobStatusText, { color: "#C4B5FD" }]}>
                      {STATUS_CFG[nextJob.status]?.label}
                    </Text>
                  </View>
                  <Text style={styles.nextPrice}>
                    ETB{" "}
                    {Number(nextJob.price || nextJob.service?.price || 0).toLocaleString(
                      "en-ET",
                      { minimumFractionDigits: 2 }
                    )}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ══ AWAITING ACCEPTANCE ══ */}
        {newJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Awaiting Your Acceptance</Text>
            {newJobs.map((b, i) => (
              <JobCard
                key={b.id}
                booking={b}
                onPress={() => setInspecting(b)}
                delay={i * 50 + 380}
              />
            ))}
          </View>
        )}

        {/* ══ ACTIVE JOBS ══ */}
        {activeJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔵 Active Jobs</Text>
            {activeJobs.map((b, i) => (
              <JobCard
                key={b.id}
                booking={b}
                onPress={() => setInspecting(b)}
                delay={i * 50 + 420}
              />
            ))}
          </View>
        )}

        {/* ══ TODAY'S SCHEDULE ══ */}
        {todayJobs.filter(
          (b) =>
            b.status !== "driver_assigned" &&
            b.status !== "in_progress" &&
            b.status !== "pending" &&
            b.status !== "confirmed"
        ).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Today's Schedule</Text>
            {todayJobs
              .filter(
                (b) =>
                  b.status !== "driver_assigned" &&
                  b.status !== "in_progress" &&
                  b.status !== "pending" &&
                  b.status !== "confirmed"
              )
              .map((b, i) => (
                <JobCard
                  key={b.id}
                  booking={b}
                  onPress={() => setInspecting(b)}
                  delay={i * 50 + 460}
                />
              ))}
          </View>
        )}

        {/* ══ CERTIFICATIONS ══ */}
        {(staffProfile?.sector_qualifications?.length ?? 0) > 0 && (
          <Animated.View
            entering={FadeInDown.delay(500).springify()}
            style={styles.certCard}
          >
            <Text style={styles.certTitle}>🏅 Your Certifications</Text>
            <View style={styles.certRow}>
              {staffProfile.sector_qualifications.map((q: string) => (
                <View key={q} style={styles.certTag}>
                  <Text style={styles.certTagText}>
                    {q.replace(/-/g, " ").toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ══ EMPTY ══ */}
        {bookings.length === 0 && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.emptyBox}>
            <LinearGradient
              colors={["#1E1B4B", "#1E293B"]}
              style={styles.emptyGradient}
            >
              <Ionicons name="construct-outline" size={48} color="#334155" />
              <Text style={styles.emptyTitle}>No jobs assigned yet</Text>
              <Text style={styles.emptySub}>
                Your dispatcher will assign tasks to you.{"\n"}Pull down to refresh.
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════════
          JOB DETAIL + ACTION MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!inspecting}
        transparent
        animationType="slide"
        onRequestClose={() => !actionLoading && setInspecting(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalJobId}>Job #{inspecting?.id}</Text>
                {inspecting && (
                  <View style={[styles.jobStatusPill, {
                    backgroundColor: STATUS_CFG[inspecting.status]?.bg,
                    borderColor:     STATUS_CFG[inspecting.status]?.color + "50",
                    marginTop: 5,
                  }]}>
                    <Ionicons
                      name={STATUS_CFG[inspecting.status]?.icon as any}
                      size={11}
                      color={STATUS_CFG[inspecting.status]?.color}
                    />
                    <Text style={[styles.jobStatusText, { color: STATUS_CFG[inspecting.status]?.color }]}>
                      {STATUS_CFG[inspecting.status]?.label}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setInspecting(null)}
                style={styles.modalClose}
                disabled={actionLoading}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBlock}>
                <View style={styles.modalBlockIcon}>
                  <Ionicons name="sparkles-outline" size={16} color="#A78BFA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalBlockLabel}>SERVICE</Text>
                  <Text style={styles.modalBlockValue}>
                    {inspecting?.service?.name || "Cleaning Service"}
                  </Text>
                  {inspecting?.service?.sub_center && (
                    <Text style={styles.modalSubCenter}>
                      🏢 {inspecting.service.sub_center.replace(/-/g, " ").toUpperCase()}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.modalBlock}>
                <View style={styles.modalBlockIcon}>
                  <Ionicons name="person-outline" size={16} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalBlockLabel}>CLIENT</Text>
                  <Text style={styles.modalBlockValue}>
                    {inspecting?.customer?.name ||
                      inspecting?.customer?.user?.name ||
                      "Client"}
                  </Text>
                  {(inspecting?.customer?.phone || inspecting?.customer?.user?.phone) && (
                    <Text style={styles.modalBlockSub}>
                      📞{" "}
                      {inspecting?.customer?.phone || inspecting?.customer?.user?.phone}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.modalBlock}>
                <View style={styles.modalBlockIcon}>
                  <Ionicons name="calendar-outline" size={16} color="#34D399" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalBlockLabel}>SCHEDULE</Text>
                  <Text style={styles.modalBlockValue}>
                    {inspecting?.booking_date || "TBD"}
                    {inspecting?.booking_time ? `  ·  ${inspecting.booking_time}` : ""}
                  </Text>
                  {inspecting?.address && (
                    <Text style={styles.modalBlockSub}>
                      📍 {inspecting.address}
                    </Text>
                  )}
                </View>
              </View>

              {inspecting?.notes && (
                <View style={styles.modalBlock}>
                  <View style={styles.modalBlockIcon}>
                    <Ionicons name="document-text-outline" size={16} color="#FBBF24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalBlockLabel}>NOTES</Text>
                    <Text style={[styles.modalBlockSub, { lineHeight: 20 }]}>
                      {inspecting.notes}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalValueRow}>
                <Text style={styles.modalValueLabel}>Job Value</Text>
                <Text style={styles.modalValueNum}>
                  ETB{" "}
                  {Number(
                    inspecting?.price || inspecting?.service?.price || 0
                  ).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </ScrollView>

            {currentActions.length > 0 && (
              <View style={styles.actionSection}>
                <Text style={styles.actionSectionTitle}>UPDATE JOB STATUS</Text>
                <View style={styles.actionRow}>
                  {currentActions.map((action) => (
                    <TouchableOpacity
                      key={action.next}
                      style={[
                        styles.actionBtn,
                        { backgroundColor: action.bg, borderColor: action.color + "50" },
                      ]}
                      onPress={() => handleAction(action)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size={16} color={action.color} />
                      ) : (
                        <>
                          <Ionicons name={action.icon as any} size={18} color={action.color} />
                          <Text style={[styles.actionBtnText, { color: action.color }]}>
                            {action.label}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {currentActions.length === 0 && inspecting && (
              <View style={styles.terminalState}>
                <Ionicons
                  name={STATUS_CFG[inspecting.status]?.icon as any}
                  size={16}
                  color={STATUS_CFG[inspecting.status]?.color}
                />
                <Text style={[styles.terminalText, { color: STATUS_CFG[inspecting.status]?.color }]}>
                  This job is {STATUS_CFG[inspecting.status]?.label.toLowerCase()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalDismiss}
              onPress={() => setInspecting(null)}
              disabled={actionLoading}
            >
              <Text style={styles.modalDismissText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAYMENT COLLECTION MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={paymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (paymentLoading || chapaStep === "processing") return;
          setPaymentModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              {/* ── STAFF CASH COLLECTION MODAL ── */}
              {paymentModal && (
                <>
                  <View style={styles.modalHeaderRow}>
                    <View>
                      <Text style={styles.modalJobId}>Collect Cash Payment</Text>
                      <Text style={{ color: "#64748B", fontSize: 12, marginTop: 3 }}>
                        Job #{paymentBooking?.id} · ETB{" "}
                        {Number(paymentBooking?.price || 0).toLocaleString("en-ET", {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setPaymentModal(false)}
                      style={styles.modalClose}
                    >
                      <Ionicons name="close" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  {/* Amount display */}
                  <View style={styles.payAmountBox}>
                    <Text style={styles.payAmountLabel}>TOTAL DUE</Text>
                    <Text style={styles.payAmountValue}>
                      ETB{" "}
                      {Number(paymentBooking?.price || 0).toLocaleString("en-ET", {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                    <Text style={styles.payAmountSub}>
                      {paymentBooking?.service?.name || "Cleaning Service"}
                      {paymentBooking?.customer?.name
                        ? ` · ${paymentBooking.customer.name}`
                        : paymentBooking?.customer?.user?.name
                        ? ` · ${paymentBooking.customer.user.name}`
                        : ""}
                    </Text>
                  </View>

                  {/* Cash amount input */}
                  <Animated.View
                    entering={FadeInDown.duration(250)}
                    style={styles.cashInputSection}
                  >
                    <Text style={styles.cashInputLabel}>AMOUNT RECEIVED FROM CLIENT (ETB)</Text>
                    <View style={styles.cashInputRow}>
                      <View style={styles.cashInputPrefix}>
                        <Text style={styles.cashInputPrefixText}>ETB</Text>
                      </View>
                      <TextInput
                        style={styles.cashInput}
                        value={cashAmount}
                        onChangeText={setCashAmount}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#475569"
                        selectionColor="#34D399"
                      />
                    </View>
                    {(() => {
                      const due      = Number(paymentBooking?.price || 0);
                      const received = parseFloat(cashAmount) || 0;
                      const change   = received - due;
                      if (received <= 0) return null;
                      return (
                        <View style={styles.changeRow}>
                          <Ionicons
                            name={change >= 0 ? "checkmark-circle" : "alert-circle"}
                            size={14}
                            color={change >= 0 ? "#34D399" : "#F87171"}
                          />
                          <Text style={{
                            color:      change >= 0 ? "#34D399" : "#F87171",
                            fontSize:   12,
                            fontWeight: "700",
                          }}>
                            {change >= 0
                              ? `Change to give: ETB ${change.toFixed(2)}`
                              : `Short by: ETB ${Math.abs(change).toFixed(2)}`}
                          </Text>
                        </View>
                      );
                    })()}
                  </Animated.View>

                  {/* Confirm button */}
                  <TouchableOpacity
                    style={[
                      styles.payConfirmBtn,
                      { backgroundColor: "#059669" },
                    ]}
                    onPress={handleConfirm}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#FFF"
                        />
                        <Text style={styles.payConfirmBtnText}>
                          Confirm Cash Received
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalDismiss}
                    onPress={() => setPaymentModal(false)}
                  >
                    <Text style={styles.modalDismissText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080C14" },
  scroll:    { paddingBottom: 40 },

  /* Greeting */
  greetingSection: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  greetingTop:  { fontSize: 14, color: "#64748B", fontWeight: "600" },
  greetingName: { fontSize: 26, fontWeight: "800", color: "#F8FAFC", marginTop: 2 },
  greetingRole: { fontSize: 12, color: "#A78BFA", fontWeight: "600", marginTop: 4 },
  refreshPill: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(167,139,250,0.1)",
    borderWidth: 1, borderColor: "rgba(167,139,250,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  /* New job banner */
  newJobBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, overflow: "hidden" },
  newJobBannerGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  newJobBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  newJobDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: "#C4B5FD",
    shadowColor: "#A78BFA", shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
  },
  newJobBannerTitle: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  newJobBannerSub:   { color: "#C4B5FD", fontSize: 11, marginTop: 2 },

  /* Stat cards */
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 18 },
  statCard: {
    flex: 1, backgroundColor: "#111827", borderRadius: 14,
    padding: 12, alignItems: "center", borderWidth: 1,
  },
  statIconBox: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  statNum:   { fontSize: 20, fontWeight: "800", color: "#F8FAFC" },
  statLabel: { fontSize: 10, color: "#64748B", fontWeight: "700", marginTop: 3 },

  /* Progress card */
  progressCard: {
    marginHorizontal: 16, marginBottom: 18, backgroundColor: "#111827",
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1E293B",
  },
  progressHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 14,
  },
  progressTitle: { fontSize: 14, fontWeight: "700", color: "#F8FAFC" },
  progressSub:   { fontSize: 11, color: "#64748B", marginTop: 3 },
  progressPct:   { fontSize: 28, fontWeight: "800", color: "#A78BFA" },
  progressTrack: { height: 8, backgroundColor: "#1E293B", borderRadius: 4, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 4, backgroundColor: "#A78BFA" },

  /* Next card */
  nextCard:     { marginHorizontal: 16, marginBottom: 20, borderRadius: 20, overflow: "hidden" },
  nextGradient: { padding: 20 },
  nextTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  nextLabelPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(196,181,253,0.15)",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(196,181,253,0.25)",
  },
  nextLabelText: { color: "#C4B5FD", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  nextService:   { fontSize: 20, fontWeight: "800", color: "#FFF", marginBottom: 12 },
  nextMetas:     { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  nextMeta:      { flexDirection: "row", alignItems: "center", gap: 5 },
  nextMetaText:  { color: "#C4B5FD", fontSize: 12, fontWeight: "600" },
  nextFooter:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nextPrice:     { fontSize: 16, fontWeight: "800", color: "#FFF" },

  /* Section */
  section:      { marginBottom: 8, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: "800", color: "#94A3B8",
    marginBottom: 10, letterSpacing: 0.4,
  },

  /* Job card */
  jobCard: {
    flexDirection: "row", backgroundColor: "#111827",
    borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#1E293B",
    overflow: "hidden", alignItems: "stretch",
  },
  accentBar:      { width: 3 },
  jobCardBody:    { flex: 1, padding: 13 },
  jobCardTop:     { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  jobCardId:      { fontSize: 10, color: "#475569", fontWeight: "700" },
  jobCardService: { fontSize: 14, fontWeight: "800", color: "#F8FAFC", marginTop: 2 },
  jobStatusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  jobStatusText:  { fontSize: 10, fontWeight: "800" },
  jobMetaRow:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  jobMeta:        { flexDirection: "row", alignItems: "center", gap: 4 },
  jobMetaText:    { fontSize: 11, color: "#64748B" },
  tapHint:        { fontSize: 10, color: "#A78BFA", marginTop: 8, fontWeight: "600" },
  jobCardChevron: { justifyContent: "center", paddingHorizontal: 12 },

  /* Certs */
  certCard: {
    marginHorizontal: 16, marginTop: 6, marginBottom: 10,
    backgroundColor: "#111827", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#1E293B",
  },
  certTitle: { color: "#F8FAFC", fontSize: 13, fontWeight: "700", marginBottom: 10 },
  certRow:   { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  certTag: {
    backgroundColor: "rgba(167,139,250,0.1)",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: "rgba(167,139,250,0.25)",
  },
  certTagText: { color: "#C4B5FD", fontSize: 10, fontWeight: "700" },

  /* Empty */
  emptyBox:      { marginHorizontal: 16, marginTop: 10, borderRadius: 20, overflow: "hidden" },
  emptyGradient: { padding: 40, alignItems: "center" },
  emptyTitle:    { fontSize: 16, fontWeight: "700", color: "#475569", marginTop: 16 },
  emptySub:      { fontSize: 12, color: "#334155", marginTop: 6, textAlign: "center", lineHeight: 18 },

  /* Modal shell */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 22, paddingBottom: 36,
    borderWidth: 1, borderColor: "#1E293B",
    maxHeight: "94%",
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: "#334155",
    borderRadius: 2, alignSelf: "center", marginBottom: 18,
  },
  modalHeaderRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 16,
  },
  modalJobId: { fontSize: 22, fontWeight: "800", color: "#F8FAFC" },
  modalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center",
  },
  modalBlock: {
    flexDirection: "row", gap: 14, backgroundColor: "#0D1117",
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#1E293B",
  },
  modalBlockIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center",
  },
  modalBlockLabel: {
    fontSize: 10, color: "#475569", fontWeight: "700",
    letterSpacing: 0.8, marginBottom: 3,
  },
  modalBlockValue: { fontSize: 14, fontWeight: "700", color: "#F8FAFC" },
  modalBlockSub:   { fontSize: 12, color: "#64748B", marginTop: 3 },
  modalSubCenter:  { fontSize: 11, color: "#A78BFA", fontWeight: "700", marginTop: 3 },
  modalValueRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#0D1117", borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: "#1E293B",
  },
  modalValueLabel: { fontSize: 12, color: "#64748B", fontWeight: "700" },
  modalValueNum:   { fontSize: 20, fontWeight: "800", color: "#34D399" },

  /* Action buttons */
  actionSection:      { marginTop: 14 },
  actionSectionTitle: {
    fontSize: 10, fontWeight: "800", color: "#475569",
    letterSpacing: 0.8, marginBottom: 10,
  },
  actionRow:    { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: "800" },
  terminalState: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 14, paddingVertical: 10,
    backgroundColor: "#0D1117", borderRadius: 12,
    borderWidth: 1, borderColor: "#1E293B",
  },
  terminalText: { fontSize: 13, fontWeight: "700" },
  modalDismiss: {
    backgroundColor: "#1E293B", borderRadius: 14,
    paddingVertical: 14, alignItems: "center", marginTop: 10,
  },
  modalDismissText: { color: "#F8FAFC", fontWeight: "700", fontSize: 14 },

  /* ── Payment modal ── */
  payAmountBox: {
    backgroundColor: "#0D1117", borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: "#1E293B", alignItems: "center",
  },
  payAmountLabel: {
    fontSize: 11, color: "#475569", fontWeight: "700",
    letterSpacing: 0.8, marginBottom: 6,
  },
  payAmountValue: { fontSize: 30, fontWeight: "800", color: "#34D399" },
  payAmountSub:   { fontSize: 12, color: "#64748B", marginTop: 4, textAlign: "center" },

  payMethodTitle: {
    fontSize: 11, color: "#475569", fontWeight: "800",
    letterSpacing: 0.8, marginBottom: 12,
  },
  payMethodRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  payMethodCard: {
    flex: 1, backgroundColor: "#0D1117", borderRadius: 16, padding: 16,
    alignItems: "center", borderWidth: 1.5, borderColor: "#1E293B",
    position: "relative",
  },
  payMethodCardActive:      { borderColor: "#34D39960", backgroundColor: "#34D39908" },
  payMethodCardChapaActive: { borderColor: "#F59E0B60", backgroundColor: "#F59E0B08" },
  payMethodIconBox: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  payMethodName:  { fontSize: 15, fontWeight: "800", color: "#94A3B8", marginBottom: 3 },
  payMethodDesc:  { fontSize: 11, color: "#475569", textAlign: "center" },
  payMethodCheck: { position: "absolute", top: 10, right: 10 },

  /* Mobile method chips */
  mobileMethodChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5,
    backgroundColor: "#0D1117", borderColor: "#1E293B",
  },
  mobileMethodChipText: { fontSize: 12, fontWeight: "700", color: "#475569" },

  /* Cash input */
  cashInputSection: { marginBottom: 14 },
  cashInputLabel:   {
    fontSize: 11, color: "#64748B", fontWeight: "700",
    letterSpacing: 0.6, marginBottom: 8,
  },
  cashInputRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#0D1117",
    borderRadius: 14, borderWidth: 1.5, borderColor: "#34D39955", overflow: "hidden",
  },
  cashInputPrefix: {
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: "#34D39915",
    borderRightWidth: 1, borderRightColor: "#34D39930",
  },
  cashInputPrefixText: { color: "#34D399", fontWeight: "800", fontSize: 14 },
  cashInput: {
    flex: 1, color: "#F8FAFC", fontSize: 22, fontWeight: "800",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  changeRow: {
    flexDirection: "row", alignItems: "center",
    gap: 6, marginTop: 8, paddingHorizontal: 4,
  },

  /* Phone entry */
  chapaMethodBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, marginBottom: 14,
  },
  chapaMethodBadgeText: { fontSize: 13, fontWeight: "800" },

  phoneInputLabel: {
    fontSize: 11, color: "#64748B", fontWeight: "700",
    letterSpacing: 0.6, marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#0D1117",
    borderRadius: 14, borderWidth: 1.5, borderColor: "#F59E0B55", overflow: "hidden",
    marginBottom: 6,
  },
  phoneInputPrefix: {
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: "#F59E0B15",
    borderRightWidth: 1, borderRightColor: "#F59E0B30",
  },
  phoneInputPrefixText: { color: "#F59E0B", fontWeight: "800", fontSize: 13 },
  phoneInput: {
    flex: 1, color: "#F8FAFC", fontSize: 20, fontWeight: "800",
    paddingHorizontal: 16, paddingVertical: 12,
    letterSpacing: 2,
  },
  phoneErrorText: { color: "#F87171", fontSize: 11, fontWeight: "600", marginBottom: 8 },
  phoneHintText:  { color: "#475569", fontSize: 11, marginBottom: 10 },

  testModeBox: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: "#6366F110", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: "#6366F130", marginBottom: 12,
  },
  testModeText: { flex: 1, color: "#818CF8", fontSize: 11, lineHeight: 16 },

  /* Processing / polling */
  processingIconRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#F59E0B15", borderWidth: 2, borderColor: "#F59E0B40",
    alignItems: "center", justifyContent: "center", marginBottom: 18,
  },
  processingTitle:    { fontSize: 20, fontWeight: "800", color: "#F8FAFC", marginBottom: 8 },
  processingSubtitle: { fontSize: 13, color: "#64748B", textAlign: "center" },
  pollCounterRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 20, backgroundColor: "#0D1117",
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: "#1E293B",
  },
  pollDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B",
  },
  pollCounterText: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  chapaFallbackBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 14, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 10, borderWidth: 1, borderColor: "#F59E0B40",
    backgroundColor: "#F59E0B10",
  },
  chapaFallbackBtnText: { color: "#F59E0B", fontSize: 12, fontWeight: "700" },

  /* Confirm button */
  payConfirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#334155", borderRadius: 14,
    paddingVertical: 16, marginBottom: 10,
  },
  payConfirmBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
});
