import React, { useState, useCallback } from "react";
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

export default function BookingDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        return { label: "COMPLETED", color: "#34D399", bg: "#10B98122", border: "#10B98155" };
      case "in_progress":
        return { label: "DISPATCHED", color: "#60A5FA", bg: "#3B82F622", border: "#3B82F655" };
      case "pending":
        return { label: "PENDING QUEUE", color: "#FBBF24", bg: "#F59E0B22", border: "#F59E0B55" };
      default:
        return { label: (status || "UNKNOWN").toUpperCase(), color: "#94A3B8", bg: "#47556922", border: "#47556955" };
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
        <Text style={styles.errorText}>Booking record not found.</Text>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(admin)/(tabs)/bookings");
          }}
          style={styles.errorBtn}
        >
          <Text style={styles.errorBtnText}>Return to Dispatch</Text>
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
    { key: "pending", label: "Received", icon: "time-outline", color: "#FBBF24" },
    { key: "confirmed", label: "Confirmed", icon: "checkmark-circle-outline", color: "#60A5FA" },
    { key: "driver_assigned", label: "Driver Assigned", icon: "person-add-outline", color: "#818CF8" },
    { key: "in_progress", label: "Cleaning", icon: "play-circle-outline", color: "#C084FC" },
    { key: "completed", label: "Completed", icon: "checkmark-done-circle-outline", color: "#34D399" },
    { key: "invoiced", label: "Invoiced", icon: "document-text-outline", color: "#2DD4BF" },
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
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Booking Record #{booking.id}</Text>
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
              <Text style={styles.heroLabel}>Total Booking Amount</Text>
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
          <Text style={styles.sectionTitle}>Job Lifecycle Stage (Tap to Update Stage)</Text>
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
                      backgroundColor: isCurrent ? step.color + "33" : isPast ? "#1E293B" : "#0F172A",
                      borderColor: isCurrent ? step.color : isPast ? "#34D39955" : "#334155",
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
                      color={isCurrent ? step.color : isPast ? "#34D399" : "#64748B"}
                    />
                    <Text
                      style={{
                        color: isCurrent ? "#FFF" : isPast ? "#CBD5E1" : "#64748B",
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
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color="#60A5FA" />
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{booking.customer?.name || "Anonymous Client"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={16} color="#60A5FA" />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{booking.customer?.email || "No email registered"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color="#60A5FA" />
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{booking.customer?.phone || "No phone registered"}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Service Scope</Text>
          <View style={styles.infoRow}>
            <Ionicons name="cut" size={16} color="#34D399" />
            <Text style={styles.infoLabel}>Service:</Text>
            <Text style={styles.infoValue}>{booking.service?.name || "Standard Clean"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#34D399" />
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{booking.booking_date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color="#34D399" />
            <Text style={styles.infoLabel}>Time:</Text>
            <Text style={styles.infoValue}>{booking.booking_time}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Assigned Dispatch Crew</Text>
          <View style={styles.infoRow}>
            <Ionicons name="construct" size={16} color="#A78BFA" />
            <Text style={styles.infoLabel}>Technician:</Text>
            <Text style={styles.infoValue}>{booking.staff?.name || "Unassigned"}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  center: { justifyContent: "center", alignItems: "center", padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#F8FAFC" },
  headerSubtitle: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 18, borderRadius: 16, marginBottom: 16 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { fontSize: 12, color: "#DBEAFE", fontWeight: "500" },
  heroValue: { fontSize: 24, fontWeight: "800", color: "#FFF", marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: "800" },
  sectionCard: { backgroundColor: "#1E293B", borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#334155" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#FFF", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  infoLabel: { fontSize: 12, color: "#94A3B8", width: 80, marginLeft: 8 },
  infoValue: { fontSize: 13, fontWeight: "700", color: "#F8FAFC", flex: 1 },
  errorText: { color: "#F87171", fontSize: 14, fontWeight: "700", marginTop: 10 },
  errorBtn: { backgroundColor: "#334155", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 14 },
  errorBtnText: { color: "#FFF", fontWeight: "700", fontSize: 12 },
});
