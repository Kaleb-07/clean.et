import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Receipt,
  ChevronLeft,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react-native";
import { router } from "expo-router";
import {
  useInvoices,
  Invoice,
  PaymentProvider,
} from "../../hooks/useInvoices";
import { useColors } from "../../hooks/useColors";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; Icon: any }
> = {
  unpaid:    { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  label: "Unpaid",    Icon: Clock        },
  paid:      { color: "#10b981", bg: "rgba(16,185,129,0.15)", label: "Paid",      Icon: CheckCircle  },
  overdue:   { color: "#ef4444", bg: "rgba(239,68,68,0.15)",  label: "Overdue",   Icon: AlertCircle  },
  cancelled: { color: "#6b7280", bg: "rgba(107,114,128,0.15)",label: "Cancelled", Icon: AlertCircle  },
};

const PROVIDERS: { value: PaymentProvider; label: string; emoji: string }[] = [
  { value: "telebirr",  label: "Telebirr",  emoji: "📱" },
  { value: "cbe_birr",  label: "CBE Birr",  emoji: "🏦" },
  { value: "amole",     label: "Amole",     emoji: "💳" },
  { value: "cash",      label: "Cash",      emoji: "💵" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { invoices, isLoading, reload, payInvoice, verifyPayment } = useInvoices();

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const handlePay = async (provider: PaymentProvider) => {
    if (!selectedInvoice) return;
    setPaying(true);
    try {
      const payment = await payInvoice(selectedInvoice.id, provider);
      setSelectedInvoice(null);

      if (payment.checkout_url) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.href = payment.checkout_url;
          return;
        } else {
          await Linking.openURL(payment.checkout_url);
        }
      } else {
        Alert.alert(
          "Payment Recorded",
          "Your cash payment has been recorded. An admin will confirm it shortly."
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not initiate payment.");
    } finally {
      setPaying(false);
    }
  };

  const handleVerify = async (paymentId: number) => {
    setVerifyingId(paymentId);
    try {
      await verifyPayment(paymentId);
      Alert.alert("Success! 🎉", "Payment has been verified and confirmed.");
    } catch (e: any) {
      Alert.alert("Verification Failed", e?.message ?? "Could not verify payment yet.");
    } finally {
      setVerifyingId(null);
    }
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.unpaid;
    const StatusIcon = sc.Icon;
    const isPaid = item.status === "paid" || item.status === "cancelled";
    const pendingPayment = item.payments.find((p) => p.status === "pending");
    const hasActivePayment = item.payments.some((p) =>
      ["pending", "completed", "paid"].includes(p.status)
    );

    return (
      <Pressable onPress={() => router.push(`/invoices/${item.id}`)}>
        <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header row */}
          <View style={styles.cardHeader}>
            <Receipt size={18} color="#6366f1" />
            <Text style={[styles.cardId, { color: colors.text }]}>Invoice #{item.id}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: sc.bg, borderColor: sc.color },
              ]}
            >
              <StatusIcon size={11} color={sc.color} />
              <Text style={[styles.badgeText, { color: sc.color }]}>
                {sc.label}
              </Text>
            </View>
          </View>

          {/* Amount */}
          <Text style={[styles.amount, { color: colors.text }]}>
            ETB {item.amount.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
          </Text>

          {/* Booking info */}
          {item.booking && (
            <Text style={[styles.bookingInfo, { color: colors.subtext }]}>
              {item.booking.sector_name ?? "Cleaning Service"} ·{" "}
              {item.booking.booking_date}
            </Text>
          )}

          {/* Due date */}
          {item.due_at && (
            <Text style={[styles.dueDate, { color: colors.subtext }, item.status === "overdue" && { color: "#ef4444" }]}>
              Due: {item.due_at}
            </Text>
          )}

          {/* Pay button */}
          {!isPaid && !hasActivePayment && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation(); // Avoid double action (routing)
                setSelectedInvoice(item);
              }}
              style={styles.payBtn}
            >
              <CreditCard size={15} color="#fff" />
              <Text style={styles.payBtnText}>Pay Now</Text>
            </Pressable>
          )}

          {hasActivePayment && !isPaid && pendingPayment && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
              <View style={styles.pendingBadge}>
                <Clock size={13} color="#f59e0b" />
                <Text style={styles.pendingText}>Payment in progress</Text>
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleVerify(pendingPayment.id);
                }}
                disabled={verifyingId === pendingPayment.id}
                style={[styles.payBtn, { backgroundColor: "#10b981", paddingVertical: 8, paddingHorizontal: 12 }]}
              >
                {verifyingId === pendingPayment.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.payBtnText, { fontSize: 12 }]}>Confirm Payment</Text>
                )}
              </Pressable>
            </View>
          )}
        </BlurView>
      </Pressable>
    );
  };

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 56) }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>My Invoices</Text>
      </View>

      {/* ── List ── */}
      <FlatList
        data={invoices}
        keyExtractor={(inv) => String(inv.id)}
        refreshing={isLoading}
        onRefresh={reload}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 32 },
        ]}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Receipt size={40} color={colors.subtext} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Invoices Yet</Text>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                Invoices are generated when your bookings are completed.
              </Text>
            </View>
          ) : null
        }
        renderItem={renderInvoice}
      />

      {/* ── Payment Provider Modal ── */}
      <Modal
        visible={!!selectedInvoice}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedInvoice(null)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={60} tint={colors.isDark ? "dark" : "light"} style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Payment Method</Text>

            {selectedInvoice && (
              <Text style={[styles.modalAmount, { color: colors.text }]}>
                ETB{" "}
                {selectedInvoice.amount.toLocaleString("en-ET", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            )}

            {PROVIDERS.map((p) => (
              <Pressable
                key={p.value}
                onPress={() => handlePay(p.value)}
                disabled={paying}
                style={({ pressed }) => [
                  styles.providerBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.75 },
                ]}
              >
                {paying ? (
                  <ActivityIndicator color="#6366f1" size="small" />
                ) : (
                  <>
                    <Text style={styles.providerEmoji}>{p.emoji}</Text>
                    <Text style={[styles.providerLabel, { color: colors.text }]}>{p.label}</Text>
                  </>
                )}
              </Pressable>
            ))}

            <Pressable
              onPress={() => setSelectedInvoice(null)}
              style={[styles.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
          </BlurView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 8, marginRight: 4 },
  title: { flex: 1, color: "#fff", fontSize: 22, fontWeight: "700" },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardId: { flex: 1, color: "#fff", fontWeight: "600", fontSize: 15 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  amount: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  bookingInfo: { color: "#a3a3a3", fontSize: 13 },
  dueDate: { color: "#6b7280", fontSize: 13 },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  payBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  pendingText: { color: "#f59e0b", fontSize: 13, fontWeight: "600" },
  empty: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  emptyText: {
    color: "#a3a3a3",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    gap: 12,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  modalAmount: {
    color: "#6366f1",
    fontSize: 24,
    fontWeight: "800",
  },
  providerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 56,
    justifyContent: "center",
  },
  providerEmoji: { fontSize: 24 },
  providerLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginTop: 4,
  },
  cancelText: { color: "#a3a3a3", fontSize: 15, fontWeight: "600" },
});
