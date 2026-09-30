import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import API from "../../src/api/client";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../hooks/useColors";
import { useLanguage } from "../../contexts/LanguageContext";

export default function BookingDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const bookingId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;

  const load = async () => {
    if (!bookingId) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await API.get(`/bookings/${bookingId}`);
      setBooking(res.data.data);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [id])
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { label: t("stage_completed").toUpperCase(), color: "#34D399", bg: "#10B98122", border: "#10B98155" };
      case "in_progress":
        return { label: t("stage_cleaning").toUpperCase(), color: "#60A5FA", bg: "#3B82F622", border: "#3B82F655" };
      case "pending":
        return { label: t("stage_received").toUpperCase(), color: "#FBBF24", bg: "#F59E0B22", border: "#F59E0B55" };
      default:
        return { label: (status || "UNKNOWN").toUpperCase(), color: colors.subtext, bg: colors.isDark ? "#47556922" : "#E2E8F0", border: colors.cardBorder };
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{t("booking_not_found")}</Text>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(admin)/(tabs)/bookings");
          }}
          style={styles.errorBtn}
        >
          <Text style={styles.errorBtnText}>{t("return_to_dispatch")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await API.patch(`/bookings/${booking.id}/status`, { status: newStatus });
      setBooking((prev: any) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (e) {
      console.log("Error updating status:", e);
    }
  };

  const LIFECYCLE_STEPS = [
    { key: "pending", label: t("stage_received"), icon: "time-outline", color: "#FBBF24" },
    { key: "confirmed", label: t("stage_confirmed"), icon: "checkmark-circle-outline", color: "#60A5FA" },
    { key: "driver_assigned", label: t("stage_assigned"), icon: "person-add-outline", color: "#818CF8" },
    { key: "in_progress", label: t("stage_cleaning"), icon: "play-circle-outline", color: "#C084FC" },
    { key: "completed", label: t("stage_completed"), icon: "checkmark-done-circle-outline", color: "#34D399" },
    { key: "invoiced", label: t("stage_invoiced"), icon: "document-text-outline", color: "#2DD4BF" },
  ];

  const badge = getStatusBadge(booking.status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(admin)/(tabs)/bookings");
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t("booking_record_title")} #{booking.id}</Text>
          <Text style={styles.headerSubtitle}>
            🏢 {booking.tenant?.business_name || "Platform Direct"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HERO CARD */}
        <LinearGradient colors={["#1E1B4B", "#312E81"]} style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>{t("total_booking_amount")}</Text>
              <Text style={styles.heroValue}>
                ETB {Number(booking.service?.price || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── 🔄 STAGE LIFECYCLE TRACKER ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("job_lifecycle_stage")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
              {LIFECYCLE_STEPS.map((step, idx) => {
                const isCurrent = booking.status === step.key;
                const currentIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === booking.status);
                const isPast = currentIdx !== -1 && idx < currentIdx;

                return (
                  <TouchableOpacity
                    key={step.key}
                    onPress={() => handleUpdateStatus(step.key)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: isCurrent ? step.color + "33" : isPast ? (colors.isDark ? "#1E293B" : "#E2E8F0") : (colors.isDark ? "#0F172A" : colors.card),
                      borderColor: isCurrent ? step.color : isPast ? "#34D39955" : colors.cardBorder,
                      borderWidth: 1.5,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 20,
                      gap: 5,
                    }}
                  >
                    <Ionicons
                      name={isPast ? "checkmark-circle" : (step.icon as any)}
                      size={14}
                      color={isCurrent ? step.color : isPast ? "#34D399" : colors.subtext}
                    />
                    <Text
                      style={{
                        color: isCurrent ? colors.text : isPast ? colors.text : colors.subtext,
                        fontSize: 11,
                        fontWeight: isCurrent ? "800" : "600",
                      }}
                    >
                      {step.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* DETAILS SECTION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("customer_details")}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color="#60A5FA" />
            <Text style={styles.infoLabel}>{t("client_name")}</Text>
            <Text style={styles.infoValue}>{booking.customer?.name || "Anonymous Client"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={16} color="#60A5FA" />
            <Text style={styles.infoLabel}>{t("client_email")}</Text>
            <Text style={styles.infoValue}>{booking.customer?.email || "No email registered"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color="#60A5FA" />
            <Text style={styles.infoLabel}>{t("client_phone")}</Text>
            <Text style={styles.infoValue}>{booking.customer?.phone || "No phone registered"}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("service_scope")}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="cut" size={16} color="#34D399" />
            <Text style={styles.infoLabel}>{t("service_label")}</Text>
            <Text style={styles.infoValue}>{booking.service?.name || "Standard Clean"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#34D399" />
            <Text style={styles.infoLabel}>{t("date_label")}</Text>
            <Text style={styles.infoValue}>{booking.booking_date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color="#34D399" />
            <Text style={styles.infoLabel}>{t("time_label")}</Text>
            <Text style={styles.infoValue}>{booking.booking_time}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("assigned_dispatch_crew")}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="construct" size={16} color="#A78BFA" />
            <Text style={styles.infoLabel}>{t("technician_label")}</Text>
            <Text style={styles.infoValue}>{booking.staff?.name || t("unassigned_label")}</Text>
          </View>
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
    errorText: { color: "#F87171", fontSize: 14, fontWeight: "700", marginTop: 10 },
    errorBtn: { backgroundColor: colors.isDark ? "#334155" : colors.cardBorder, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 14 },
    errorBtnText: { color: colors.text, fontWeight: "700", fontSize: 12 },
  });
