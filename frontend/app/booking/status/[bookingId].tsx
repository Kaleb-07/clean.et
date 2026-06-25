import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Clock3,
  CircleDashed,
  XCircle,
  Phone,
  User,
  Shield,
  FileText,
} from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { useBookings } from "../../../hooks/useBookings";
import { useLanguage } from "../../../contexts/LanguageContext";

function to12h(time24: string): string {
  if (!time24) return "";
  const parts = time24.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

export default function BookingStatusScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const insets = useSafeAreaInsets();
  const { getBooking, isLoading } = useBookings();
  const { t } = useLanguage();

  const booking = useMemo(() => getBooking(bookingId!), [bookingId, getBooking]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const bookingName = booking.sector?.name ?? booking.service?.name ?? "Cleaning Service";
  const categoryName = booking.sector?.category_name ?? "Clean.et Service";

  // Full 8-stage lifecycle tracker definitions
  const steps = [
    { key: "pending", label: "Received", desc: "We got your order", color: "#f59e0b", icon: CircleDashed },
    { key: "confirmed", label: "Confirmed", desc: "Booking is approved", color: "#3b82f6", icon: CheckCircle2 },
    { key: "driver_assigned", label: "Driver Assigned", desc: "Driver is selected", color: "#6366f1", icon: User },
    { key: "picked_up", label: "Picked Up", desc: "Vehicle is in transit", color: "#8b5cf6", icon: Clock3 },
    { key: "in_progress", label: "Cleaning", desc: "Service is underway", color: "#a855f7", icon: Clock3 },
    { key: "completed", label: "Completed", desc: "Cleaning completed!", color: "#10b981", icon: CheckCircle2 },
    { key: "invoiced", label: "Invoiced", desc: "Invoice is generated", color: "#14b8a6", icon: FileText },
  ];

  const isCancelled = booking.status === "cancelled";
  const currentStepIndex = steps.findIndex((s) => s.key === booking.status);

  // Initials for staff avatar
  const getInitials = (name?: string) => {
    if (!name) return "ST";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("booking_details") || "Booking Status"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STATUS TIMELINE CARD */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.statusSection}>
          <BlurView intensity={20} tint="dark" style={styles.statusCard}>
            <View style={styles.serviceInfo}>
              <Text style={styles.categoryLabel}>{categoryName}</Text>
              <Text style={styles.serviceName}>{bookingName}</Text>
              <Text style={styles.bookingId}>Booking ID: #{booking.id}</Text>
            </View>

            {isCancelled ? (
              <View style={styles.cancelledBox}>
                <XCircle size={44} color="#ef4444" />
                <Text style={styles.cancelledText}>This booking has been cancelled</Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {steps.map((step, index) => {
                  const isDone = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const Icon = step.icon;

                  // Skip driver_assigned and picked_up stages if not a vehicle booking
                  if ((step.key === "driver_assigned" || step.key === "picked_up") && !booking.vehicle) {
                    return null;
                  }

                  return (
                    <View key={step.key} style={styles.timelineItem}>
                      <View style={styles.timelineLeft}>
                        <View
                          style={[
                            styles.dot,
                            isDone && { backgroundColor: step.color },
                            isCurrent && styles.activeDot,
                          ]}
                        >
                          {isDone ? (
                            <Icon size={12} color="#ffffff" />
                          ) : (
                            <View style={styles.inactiveDotInner} />
                          )}
                        </View>
                        {index < steps.length - 1 && (
                          <View
                            style={[
                              styles.line,
                              index < currentStepIndex && { backgroundColor: step.color },
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.timelineRight}>
                        <Text
                          style={[
                            styles.stepLabel,
                            isDone && { color: "#ffffff" },
                            isCurrent && { fontWeight: "bold", color: step.color },
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={styles.stepDesc}>{step.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </BlurView>
        </Animated.View>

        {/* ASSIGNED STAFF CARD */}
        {booking.staff && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.staffSection}>
            <Text style={styles.sectionTitle}>Assigned Team Member</Text>
            <BlurView intensity={20} tint="dark" style={styles.staffCard}>
              <View style={styles.staffRow}>
                <View style={styles.avatarWrapper}>
                  <LinearGradient colors={["#8b5cf6", "#6366f1"]} style={styles.avatarGradient}>
                    <Text style={styles.avatarText}>{getInitials(booking.staff.name)}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.staffDetails}>
                  <Text style={styles.staffName}>{booking.staff.name}</Text>
                  <Text style={styles.staffRole}>{booking.staff.role_title || "Cleaning Professional"}</Text>
                </View>
                {booking.staff.phone && (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${booking.staff!.phone}`)}
                    style={styles.callBtn}
                  >
                    <Phone size={18} color="#ffffff" />
                  </Pressable>
                )}
              </View>
            </BlurView>
          </Animated.View>
        )}

        {/* DETAILS CARD */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>{t("appointment_info") || "Appointment Info"}</Text>
          <BlurView intensity={20} tint="dark" style={styles.detailsCard}>
            {/* Price */}
            <View style={styles.detailRow}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
                <CheckCircle2 size={18} color="#10b981" />
              </View>
              <View>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={[styles.detailValue, { color: "#10b981" }]}>
                  ETB {Number(booking.service?.price ?? booking.estimated_price ?? 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Date */}
            <View style={styles.detailRow}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
                <Calendar size={18} color="#8b5cf6" />
              </View>
              <View>
                <Text style={styles.detailLabel}>{t("date") || "Date"}</Text>
                <Text style={styles.detailValue}>
                  {new Date(booking.booking_date + "T00:00:00").toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Time */}
            <View style={styles.detailRow}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
                <Clock size={18} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.detailLabel}>{t("time") || "Time"}</Text>
                <Text style={styles.detailValue}>{to12h(booking.booking_time)}</Text>
              </View>
            </View>

            {/* Render Vehicle Profile Info if present */}
            {booking.vehicle && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={[styles.iconBox, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
                    <Shield size={18} color="#f59e0b" />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Vehicle Details</Text>
                    <Text style={styles.detailValue}>
                      {booking.vehicle.make} {booking.vehicle.model}{" "}
                      {booking.vehicle.plate_number ? `(${booking.vehicle.plate_number})` : ""}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Render Building Profile Info if present */}
            {booking.building_profile && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={[styles.iconBox, { backgroundColor: "rgba(236,72,153,0.12)" }]}>
                    <MapPin size={18} color="#ec4899" />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Building Details</Text>
                    <Text style={styles.detailValue}>
                      {booking.building_profile.name} · {booking.building_profile.floor_count} floors ·{" "}
                      {booking.building_profile.area_sqm} sqm
                    </Text>
                  </View>
                </View>
              </>
            )}
          </BlurView>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#ffffff", fontSize: 18, marginBottom: 20 },
  backButton: { backgroundColor: "#6d28d9", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backButtonText: { color: "#ffffff", fontWeight: "bold" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  statusSection: { marginBottom: 24 },
  statusCard: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  serviceInfo: { marginBottom: 24 },
  categoryLabel: { color: "#8b5cf6", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 },
  serviceName: { fontSize: 24, fontWeight: "bold", color: "#ffffff", marginTop: 4 },
  bookingId: { color: "#94a3b8", fontSize: 13, marginTop: 4 },
  cancelledBox: { alignItems: "center", padding: 20, gap: 12 },
  cancelledText: { color: "#ef4444", fontSize: 16, fontWeight: "bold" },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: "row", gap: 16 },
  timelineLeft: { alignItems: "center", width: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center", zIndex: 2 },
  activeDot: { borderWidth: 2, borderColor: "#ffffff" },
  inactiveDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  line: { width: 2, flex: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 4 },
  timelineRight: { flex: 1, paddingBottom: 24 },
  stepLabel: { fontSize: 16, color: "#94a3b8", fontWeight: "600" },
  stepDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },
  // Staff card
  staffSection: { marginBottom: 24 },
  staffCard: { borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  staffRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrapper: { width: 48, height: 48, borderRadius: 24, overflow: "hidden" },
  avatarGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#ffffff", fontWeight: "bold", fontSize: 16 },
  staffDetails: { flex: 1 },
  staffName: { fontSize: 16, fontWeight: "bold", color: "#ffffff" },
  staffRole: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#6d28d9", justifyContent: "center", alignItems: "center" },
  // Details card
  detailsSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#ffffff", marginBottom: 12, marginLeft: 4 },
  detailsCard: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 4 },
  iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  detailLabel: { fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: "600" },
  detailValue: { fontSize: 15, color: "#ffffff", fontWeight: "600", marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: 12 },
});
