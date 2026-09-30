import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Receipt,
  ChevronLeft,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Tag,
} from "lucide-react-native";
import API from "../../src/api/client";
import { PaymentProvider, Payment, Invoice } from "../../hooks/useInvoices";
import { useColors } from "../../hooks/useColors";

// ─── Status Config ───────────────────────────────────────────────────────────
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
  { value: "chapa",     label: "Chapa (Online Payment)", emoji: "⚡" },
  { value: "telebirr",  label: "Telebirr",              emoji: "📱" },
  { value: "cbe_birr",  label: "CBE Birr",              emoji: "🏦" },
  { value: "amole",     label: "Amole",                 emoji: "💳" },
  { value: "cash",      label: "Cash",                  emoji: "💵" },
];

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [providerModalVisible, setProviderModalVisible] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/invoices/${id}`);
      setInvoice(res.data.data || res.data);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to load invoice details.");
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePayment = async (provider: PaymentProvider) => {
    if (!invoice) return;
    setPaying(true);
    setProviderModalVisible(false);
    try {
      const res = await API.post("/payments", {
        invoice_id: invoice.id,
        provider,
      });
      const payment: Payment = res.data.data || res.data;

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
      await fetchInvoice();
    } catch (err: any) {
      Alert.alert("Payment Error", err?.response?.data?.message ?? "Could not initiate payment.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={colors.gradients.background} style={styles.centerRoot}>
        <ActivityIndicator size="large" color="#6366f1" />
      </LinearGradient>
    );
  }

  if (!invoice) {
    return (
      <LinearGradient colors={colors.gradients.background} style={styles.centerRoot}>
        <AlertCircle size={48} color="#ef4444" />
        <Text style={[styles.errorText, { color: colors.text }]}>Invoice not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backLink, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const sc = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.unpaid;
  const StatusIcon = sc.Icon;
  const isPaid = invoice.status === "paid" || invoice.status === "cancelled";
  const hasActivePayment = invoice.payments.some((p) =>
    ["pending", "completed", "paid"].includes(p.status)
  );

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Invoice #{invoice.id}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        {/* Main Details Card */}
        <BlurView intensity={30} tint={colors.isDark ? "dark" : "light"} style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.invoiceHeaderRow}>
            <View style={styles.invoiceLogoWrap}>
              <Receipt size={24} color="#6366f1" />
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: sc.bg, borderColor: sc.color },
              ]}
            >
              <StatusIcon size={12} color={sc.color} />
              <Text style={[styles.badgeText, { color: sc.color }]}>
                {sc.label}
              </Text>
            </View>
          </View>

          <Text style={[styles.amount, { color: colors.text }]}>
            {invoice.currency} {invoice.amount.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
          </Text>

          {invoice.due_at && (
            <View style={styles.metaRow}>
              <Calendar size={14} color="#6b7280" />
              <Text style={[styles.metaText, { color: colors.subtext }, invoice.status === "overdue" && { color: "#ef4444", fontWeight: "600" }]}>
                Due on {new Date(invoice.due_at).toLocaleDateString("en-ET", { day: "2-digit", month: "short", year: "numeric" })}
              </Text>
            </View>
          )}
        </BlurView>

        {/* Booking Reference Block */}
        {invoice.booking && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Details</Text>
            <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.detailItem}>
                <Tag size={16} color="#6366f1" />
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: colors.subtext }]}>Sector / Category</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {invoice.booking.sector_name ?? "Cleaning Service"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Calendar size={16} color="#6366f1" />
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: colors.subtext }]}>Service Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(invoice.booking.booking_date).toLocaleDateString("en-ET", {
                      weekday: "short",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => router.push(`/booking/status/${invoice.booking?.id}`)}
                style={styles.bookingLinkBtn}
              >
                <Text style={styles.bookingLinkText}>Track Appointment Status</Text>
                <ArrowRight size={14} color="#a78bfa" />
              </Pressable>
            </BlurView>
          </View>
        )}

        {/* Payments History Block */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Log</Text>
          {invoice.payments.length === 0 ? (
            <BlurView intensity={15} tint={colors.isDark ? "dark" : "light"} style={[styles.emptyPayments, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <ShieldCheck size={20} color={colors.subtext} />
              <Text style={[styles.emptyPaymentsText, { color: colors.subtext }]}>No payments logged yet.</Text>
            </BlurView>
          ) : (
            invoice.payments.map((p) => {
              const isPaidPayment = ["completed", "paid"].includes(p.status);
              return (
                <BlurView key={p.id} intensity={15} tint={colors.isDark ? "dark" : "light"} style={[styles.paymentRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentProvider, { color: colors.text }]}>
                      {p.provider.toUpperCase()} (Ref: {p.provider_reference || "N/A"})
                    </Text>
                    <Text style={[styles.paymentDate, { color: colors.subtext }]}>
                      {new Date(p.created_at).toLocaleString("en-ET", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.paymentAmount, { color: colors.text }, isPaidPayment && { color: "#10b981" }]}>
                      ETB {p.amount.toLocaleString()}
                    </Text>
                    <View style={styles.paymentStatusPill}>
                      <View
                        style={[
                          styles.paymentStatusDot,
                          { backgroundColor: isPaidPayment ? "#10b981" : "#f59e0b" },
                        ]}
                      />
                      <Text style={[styles.paymentStatusText, { color: isPaidPayment ? "#10b981" : "#f59e0b" }]}>
                        {p.status}
                      </Text>
                    </View>
                  </View>
                </BlurView>
              );
            })
          )}
        </View>

        {/* Pay Action Buttons */}
        {!isPaid && !hasActivePayment && (
          <Pressable
            onPress={() => setProviderModalVisible(true)}
            style={({ pressed }) => [styles.payNowBtn, pressed && { opacity: 0.85 }]}
          >
            <CreditCard size={18} color="#fff" />
            <Text style={styles.payNowBtnText}>Select Payment Method & Pay</Text>
          </Pressable>
        )}

        {hasActivePayment && !isPaid && (
          <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Clock size={18} color="#f59e0b" />
            <Text style={styles.pendingText}>
              A payment is currently in progress. If you just sent funds, please wait a moment for admin verification.
            </Text>
          </BlurView>
        )}
      </ScrollView>

      {/* Payment Provider Modal */}
      <Modal
        visible={providerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setProviderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={60} tint={colors.isDark ? "dark" : "light"} style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Payment Method</Text>
            <Text style={[styles.modalAmount, { color: colors.text }]}>
              ETB {invoice.amount.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
            </Text>

            {PROVIDERS.map((p) => (
              <Pressable
                key={p.value}
                onPress={() => handleInitiatePayment(p.value)}
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
              onPress={() => setProviderModalVisible(false)}
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerRoot: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  errorText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  backLink: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  backLinkText: { color: "#a78bfa", fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 8, marginRight: 4 },
  title: { flex: 1, color: "#fff", fontSize: 20, fontWeight: "700" },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  mainCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    gap: 16,
    marginBottom: 24,
  },
  invoiceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(99,102,241,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  amount: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { color: "#94a3b8", fontSize: 13 },

  section: { marginBottom: 24 },
  sectionTitle: { color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontWeight: "600" },

  detailsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
    gap: 16,
  },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailTextCol: { flex: 1 },
  detailLabel: { color: "#64748b", fontSize: 11, textTransform: "uppercase" },
  detailValue: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 2 },

  bookingLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(167,139,250,0.08)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.2)",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  bookingLinkText: { color: "#a78bfa", fontSize: 13, fontWeight: "600" },

  emptyPayments: {
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
    gap: 8,
  },
  emptyPaymentsText: { color: "#64748b", fontSize: 13 },

  paymentRow: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentProvider: { color: "#fff", fontWeight: "600", fontSize: 13 },
  paymentDate: { color: "#64748b", fontSize: 11, marginTop: 2 },
  paymentAmount: { color: "#fff", fontWeight: "700", fontSize: 14 },
  paymentStatusPill: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  paymentStatusDot: { width: 6, height: 6, borderRadius: 3 },
  paymentStatusText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },

  payNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366f1",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  payNowBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  pendingCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    backgroundColor: "rgba(245,158,11,0.05)",
    overflow: "hidden",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  pendingText: { color: "#f59e0b", fontSize: 13, flex: 1, lineHeight: 18 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    gap: 12,
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  modalAmount: { color: "#6366f1", fontSize: 24, fontWeight: "800", marginBottom: 8 },
  providerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  providerEmoji: { fontSize: 22 },
  providerLabel: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginTop: 4,
  },
  cancelText: { color: "#a3a3a3", fontSize: 14, fontWeight: "600" },
});
