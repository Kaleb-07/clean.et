import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import API from "../../src/api/client";

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Payment {
  id: number;
  provider: string;
  status: "pending" | "paid" | "failed";
  amount: number;
  provider_reference: string | null;
  created_at: string;
}

interface Invoice {
  id: number;
  amount: number;
  currency: string;
  period: string | null;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  due_at: string | null;
  booking?: {
    id: number;
    booking_date: string;
    sector_name: string | null;
    customer?: {
      id: number;
      name: string;
      phone: string;
    };
  };
  payments: Payment[];
}

const STATUS_COLORS: Record<string, string> = {
  draft:     "#64748b",
  sent:      "#3b82f6",
  paid:      "#10b981",
  overdue:   "#ef4444",
  cancelled: "#475569",
};

export default function AdminInvoiceDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const loadDetails = useCallback(async () => {
    try {
      const res = await API.get(`/invoices/${id}`);
      setInvoice(res.data.data ?? res.data);
    } catch (e) {
      console.log("Error loading admin invoice details:", e);
      Alert.alert("Error", "Could not load invoice details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const verifyPayment = async (paymentId: number) => {
    setVerifyingId(paymentId);
    try {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await API.post(`/payments/${paymentId}/verify`);
      Alert.alert("Success", "Payment verified and invoice updated successfully.");
      await loadDetails();
    } catch (e: any) {
      Alert.alert(
        "Verification Failed",
        e?.response?.data?.message ?? "Could not verify payment."
      );
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={["#07070f", "#0f1028"]} style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </LinearGradient>
    );
  }

  if (!invoice) {
    return (
      <LinearGradient colors={["#07070f", "#0f1028"]} style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Invoice not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const color = STATUS_COLORS[invoice.status] ?? "#64748b";

  return (
    <LinearGradient colors={["#07070f", "#0f1028", "#1a1445"]} style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Invoice INV-{String(invoice.id).padStart(4, "0")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
        {/* Invoice Summary Card */}
        <BlurView intensity={30} tint="dark" style={styles.summaryCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <View style={[styles.statusPill, { borderColor: `${color}55` }]}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusText, { color }]}>
                {invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.amount}>
            {invoice.currency} {Number(invoice.amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
          </Text>

          <View style={styles.divider} />

          {invoice.period && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Billing Period:</Text>
              <Text style={styles.metaValue}>{invoice.period}</Text>
            </View>
          )}

          {invoice.due_at && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date:</Text>
              <Text style={styles.metaValue}>
                {new Date(invoice.due_at).toLocaleDateString("en-ET", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          )}
        </BlurView>

        {/* Customer Details */}
        {invoice.booking?.customer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <BlurView intensity={20} tint="dark" style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color="#8b5cf6" />
                <View>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{invoice.booking.customer.name}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={16} color="#8b5cf6" />
                <View>
                  <Text style={styles.detailLabel}>Phone Number</Text>
                  <Text style={styles.detailValue}>{invoice.booking.customer.phone}</Text>
                </View>
              </View>
            </BlurView>
          </View>
        )}

        {/* Service Details */}
        {invoice.booking && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Booking Details</Text>
            <BlurView intensity={20} tint="dark" style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Ionicons name="construct-outline" size={16} color="#8b5cf6" />
                <View>
                  <Text style={styles.detailLabel}>Service / Sector</Text>
                  <Text style={styles.detailValue}>{invoice.booking.sector_name ?? "General Clean"}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color="#8b5cf6" />
                <View>
                  <Text style={styles.detailLabel}>Scheduled Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(invoice.booking.booking_date).toLocaleDateString("en-ET", {
                      weekday: "short",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            </BlurView>
          </View>
        )}

        {/* Payments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Logs</Text>
          {invoice.payments.length === 0 ? (
            <BlurView intensity={15} tint="dark" style={styles.emptyPayments}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#475569" />
              <Text style={styles.emptyPaymentsText}>No payments logged for this invoice.</Text>
            </BlurView>
          ) : (
            invoice.payments.map((p) => {
              const isPending = p.status === "pending";
              return (
                <BlurView key={p.id} intensity={20} tint="dark" style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <View>
                      <Text style={styles.paymentTitle}>
                        {p.provider.toUpperCase()} Method
                      </Text>
                      {p.provider_reference && (
                        <Text style={styles.paymentRef}>Ref: {p.provider_reference}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.paymentAmount}>
                        ETB {p.amount.toLocaleString()}
                      </Text>
                      <Text style={[
                        styles.paymentStatus,
                        p.status === "completed" ? { color: "#10b981" } : { color: "#f59e0b" }
                      ]}>
                        {p.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {isPending && (
                    <Pressable
                      onPress={() => verifyPayment(p.id)}
                      disabled={verifyingId !== null}
                      style={({ pressed }) => [
                        styles.verifyBtn,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      {verifyingId === p.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                          <Text style={styles.verifyBtnText}>Verify & Confirm Payment</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </BlurView>
              );
            })
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  errorText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  errorBtnText: { color: "#a78bfa", fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  summaryCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginBottom: 24,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: "#94a3b8", fontSize: 13 },
  amount: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 8,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 16,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  metaLabel: { color: "#64748b", fontSize: 13 },
  metaValue: { color: "#fff", fontSize: 13, fontWeight: "600" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },

  section: { marginBottom: 24 },
  sectionTitle: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 4,
  },

  detailCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
    gap: 16,
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  detailLabel: { color: "#64748b", fontSize: 11, textTransform: "uppercase" },
  detailValue: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 2 },

  emptyPayments: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
    gap: 8,
  },
  emptyPaymentsText: { color: "#64748b", fontSize: 13 },

  paymentCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentTitle: { color: "#fff", fontWeight: "600", fontSize: 14 },
  paymentRef: { color: "#64748b", fontSize: 11, marginTop: 2 },
  paymentAmount: { color: "#fff", fontWeight: "700", fontSize: 15 },
  paymentStatus: { fontSize: 11, fontWeight: "700", marginTop: 4 },

  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 12,
  },
  verifyBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
