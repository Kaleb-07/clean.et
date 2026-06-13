import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
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
} from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { useBookings } from "../../../hooks/useBookings";
import { useServices } from "../../../hooks/useServices";
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
  const { getBooking, isLoading: bookingsLoading } = useBookings();
  const { services, loading: servicesLoading } = useServices();
  const { t } = useLanguage();

  const booking = useMemo(() => getBooking(bookingId!), [bookingId, getBooking]);
  const service = useMemo(() => 
    booking ? services.find(s => String(s.id) === String(booking.service?.id)) : null,
    [services, booking]
  );

  if (bookingsLoading || servicesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!booking || !service) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const steps = [
    { key: "pending", label: "Booking Received", icon: CircleDashed, color: "#f59e0b" },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "#3b82f6" },
    { key: "in_progress", label: "Washing in Progress", icon: Clock3, color: "#8b5cf6" },
    { key: "completed", label: "Completed", icon: CheckCircle2, color: "#10b981" },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === booking.status);
  const isCancelled = booking.status === "cancelled";

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("booking_details") || "Booking Details"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* STATUS CARD */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.statusSection}>
          <BlurView intensity={20} tint="dark" style={styles.statusCard}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.bookingId}>ID: #{booking.id}</Text>
            </View>

            {isCancelled ? (
              <View style={styles.cancelledBox}>
                <XCircle size={40} color="#ef4444" />
                <Text style={styles.cancelledText}>This booking has been cancelled</Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {steps.map((step, index) => {
                  const isDone = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const Icon = step.icon;

                  return (
                    <View key={step.key} style={styles.timelineItem}>
                      <View style={styles.timelineLeft}>
                        <View style={[
                          styles.dot,
                          isDone && { backgroundColor: step.color },
                          isCurrent && styles.activeDot
                        ]}>
                          {isDone && <CheckCircle2 size={12} color="#ffffff" />}
                        </View>
                        {index < steps.length - 1 && (
                          <View style={[
                            styles.line,
                            index < currentStepIndex && { backgroundColor: step.color }
                          ]} />
                        )}
                      </View>
                      <View style={styles.timelineRight}>
                        <Text style={[
                          styles.stepLabel,
                          isDone && { color: "#ffffff" },
                          isCurrent && { fontWeight: "bold" }
                        ]}>
                          {step.label}
                        </Text>
                        {isCurrent && (
                          <Text style={styles.stepStatus}>Currently in this stage</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </BlurView>
        </Animated.View>

        {/* DETAILS CARD */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>{t("appointment_info") || "Appointment Info"}</Text>
          <BlurView intensity={20} tint="dark" style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Calendar size={20} color="#8b5cf6" />
              <View>
                <Text style={styles.detailLabel}>{t("date") || "Date"}</Text>
                <Text style={styles.detailValue}>{new Date(booking.booking_date).toLocaleDateString()}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Clock size={20} color="#8b5cf6" />
              <View>
                <Text style={styles.detailLabel}>{t("time") || "Time"}</Text>
                <Text style={styles.detailValue}>{to12h(booking.booking_time)}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <MapPin size={20} color="#8b5cf6" />
              <View>
                <Text style={styles.detailLabel}>{t("location") || "Location"}</Text>
                <Text style={styles.detailValue}>Main Car Wash Branch, Addis Ababa</Text>
              </View>
            </View>
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
  scrollContent: { padding: 20 },
  statusSection: { marginBottom: 30 },
  statusCard: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  serviceInfo: { marginBottom: 24 },
  serviceName: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
  bookingId: { color: "#94a3b8", fontSize: 14, marginTop: 4 },
  cancelledBox: { alignItems: "center", padding: 20, gap: 12 },
  cancelledText: { color: "#ef4444", fontSize: 16, fontWeight: "bold" },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: "row", gap: 16 },
  timelineLeft: { alignItems: "center", width: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center", zIndex: 2 },
  activeDot: { borderWidth: 2, borderColor: "#ffffff" },
  line: { width: 2, flex: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 2 },
  timelineRight: { flex: 1, paddingBottom: 24 },
  stepLabel: { fontSize: 16, color: "#94a3b8" },
  stepStatus: { fontSize: 12, color: "#8b5cf6", marginTop: 4 },
  detailsSection: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff", marginBottom: 16 },
  detailsCard: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 4 },
  detailLabel: { fontSize: 12, color: "#94a3b8", textTransform: "uppercase" },
  detailValue: { fontSize: 16, color: "#ffffff", fontWeight: "600", marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: 12 },
});
