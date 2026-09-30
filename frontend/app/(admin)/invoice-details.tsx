import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import API from "../../src/api/client";
import { useColors } from "../../hooks/useColors";
import { useLanguage } from "../../contexts/LanguageContext";

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

export default function AdminInvoiceDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const loadDetails = useCallback(async () => {
    try {
      const res = await API.get(`/invoices/${id}`);
      setInvoice(res.data.data ?? res.data);
    } catch (e) {
      console.log("Error loading invoice:", e);
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
      await API.post(`/payments/${paymentId}/verify`);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Success", "Payment verified and invoice marked as paid!");
      loadDetails();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to verify payment.");
    } finally {
      setVerifyingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return { label: "PAID", color: "#34D399", bg: "#10B98122", border: "#10B98155" };
      case "sent":
        return { label: "SENT", color: "#60A5FA", bg: "#3B82F622", border: "#3B82F655" };
      case "overdue":
        return { label: "OVERDUE", color: "#F87171", bg: "#EF444422", border: "#EF444455" };
      default:
        return { label: (status || "DRAFT").toUpperCase(), color: colors.subtext, bg: colors.surface, border: colors.cardBorder };
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Invoice not found.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.errorBtn}
        >
          <Text style={styles.errorBtnText}>Return to Invoices</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = getStatusBadge(invoice.status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Invoice #{invoice.id}</Text>
          <Text style={styles.headerSubtitle}>
            {invoice.booking?.sector_name ? `🏢 ${invoice.booking.sector_name}` : "Platform Invoice"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HERO CARD */}
        <LinearGradient colors={["#1E1B4B", "#312E81"]} style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Total Invoice Amount</Text>
              <Text style={styles.heroValue}>
                ETB {Number(invoice.amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* DETAILS SECTION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Billing Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color="#60A5FA" />
            <Text style={styles.infoLabel}>Client:</Text>
            <Text style={styles.infoValue}>{invoice.booking?.customer?.name || "Client"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color="#60A5FA" />
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{invoice.booking?.customer?.phone || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#34D399" />
            <Text style={styles.infoLabel}>Due Date:</Text>
            <Text style={styles.infoValue}>{invoice.due_at || "Due on Receipt"}</Text>
          </View>
        </View>

        {/* PAYMENTS HISTORY */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recorded Transactions & Payouts</Text>
          {invoice.payments.length === 0 ? (
            <Text style={{ color: colors.subtext, fontSize: 12, fontStyle: "italic" }}>
              No payments logged for this invoice yet.
            </Text>
          ) : (
            invoice.payments.map((p) => (
              <View key={p.id} style={styles.paymentItem}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
                    💳 {p.provider.toUpperCase()} Payment
                  </Text>
                  <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 2 }}>
                    Ref: {p.provider_reference || "N/A"} · {p.created_at}
                  </Text>
                </View>

                {p.status === "pending" ? (
                  <TouchableOpacity
                    style={styles.verifyBtn}
                    onPress={() => verifyPayment(p.id)}
                    disabled={verifyingId === p.id}
                  >
                    {verifyingId === p.id ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>
                        Verify Payment
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#34D399" />
                    <Text style={{ color: "#34D399", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                      VERIFIED
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { justifyContent: "center", alignItems: "center", padding: 20 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      gap: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.isDark ? "#334155" : colors.cardBorder,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    headerSubtitle: { fontSize: 11, color: colors.subtext, marginTop: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    heroCard: { padding: 18, borderRadius: 16, marginBottom: 16 },
    heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    heroLabel: { fontSize: 12, color: "#DBEAFE", fontWeight: "500" },
    heroValue: { fontSize: 24, fontWeight: "800", color: "#FFF", marginTop: 4 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: "800" },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 10 },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    infoLabel: { fontSize: 12, color: colors.subtext, width: 80, marginLeft: 8 },
    infoValue: { fontSize: 13, fontWeight: "700", color: colors.text, flex: 1 },
    paymentItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    verifyBtn: { backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    paidBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#10B98122",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    errorText: { color: "#F87171", fontSize: 14, fontWeight: "700", marginTop: 10 },
    errorBtn: { backgroundColor: colors.isDark ? "#334155" : colors.cardBorder, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 14 },
    errorBtnText: { color: colors.text, fontWeight: "700", fontSize: 12 },
  });
