import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  Info,
  Check,
  Sparkles,
  MapPin,
  Car,
  Building2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInRight, ZoomIn } from "react-native-reanimated";

import { useBookings, Booking } from "../../../hooks/useBookings";
import { useColors } from "../../../hooks/useColors";
import { useLanguage } from "../../../contexts/LanguageContext";
import API from "../../../src/api/client";

function to12h(time24?: string): string {
  if (!time24) return "09:00 AM";
  const trimmed = time24.trim();
  if (trimmed.includes("AM") || trimmed.includes("PM")) {
    return trimmed;
  }
  const parts = trimmed.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parts[1].slice(0, 2) : "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM"
];

export default function EditBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { getBooking, updateBooking, isLoading: hookLoading } = useBookings();
  const { t } = useLanguage();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [fetchingDirect, setFetchingDirect] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>("09:00 AM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch or resolve booking
  const loadBookingDetails = useCallback(async () => {
    if (!id) return;
    const cached = getBooking(id);
    if (cached) {
      setBooking(cached);
      return;
    }

    setFetchingDirect(true);
    try {
      const res = await API.get(`/bookings/${id}`);
      const data = res.data?.data ?? res.data;
      if (data) {
        setBooking(data);
      }
    } catch (e) {
      console.error("Failed to load booking by ID:", e);
    } finally {
      setFetchingDirect(false);
    }
  }, [id, getBooking]);

  useEffect(() => {
    loadBookingDetails();
  }, [loadBookingDetails]);

  // Sync date/time when booking loads
  useEffect(() => {
    if (booking) {
      if (booking.booking_date) {
        const parsed = new Date(booking.booking_date + "T00:00:00");
        if (!isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
        }
      }
      if (booking.booking_time) {
        setSelectedTime(to12h(booking.booking_time));
      }
    }
  }, [booking]);

  // Generate next 14 days
  const dates = useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const handleUpdate = async () => {
    if (!selectedTime) {
      Alert.alert(t("selection_required") || "Selection Required", t("select_time_msg") || "Please choose a time slot.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsSubmitting(true);
    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const updated = await updateBooking(String(id), {
        date: dateStr,
        timeSlot: selectedTime,
      });

      if (updated) {
        setBooking(updated);
      }
      setShowSuccess(true);
    } catch (e: any) {
      console.error("Booking reschedule error:", e);
      const msg = e.response?.data?.message || e.message || "Failed to update booking date and time.";
      Alert.alert("Update Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSelected = (date: Date) =>
    date.toDateString() === selectedDate.toDateString();

  const loading = fetchingDirect || (hookLoading && !booking);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Info size={48} color="#ef4444" />
        <Text style={styles.errorText}>Booking #{id} not found</Text>
        <Pressable
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/booking"))}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const bookingTitle = booking.sector?.name ?? booking.service?.name ?? "Cleaning Service";
  const bookingCategory = booking.sector?.category_name ?? (booking.sector as any)?.category?.name ?? "Clean.et Service";
  const bookingPrice = Number(booking.price ?? booking.estimated_price ?? booking.service?.price ?? 0);

  const ServiceIcon = booking.vehicle
    ? Car
    : booking.building_profile
    ? Building2
    : Sparkles;

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/booking"))}
            style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          >
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Reschedule Booking</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* SERVICE / SECTOR INFO CARD */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.section}>
          <View style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.serviceHeader}>
              <View style={styles.serviceInfoCol}>
                <Text style={[styles.categoryBadge, { color: colors.primary }]}>{bookingCategory}</Text>
                <Text style={[styles.serviceName, { color: colors.text }]}>{bookingTitle}</Text>
                <Text style={[styles.bookingIdSub, { color: colors.subtext }]}>Booking #{booking.id}</Text>
              </View>
              <View style={[styles.iconPill, { backgroundColor: colors.primaryLight }]}>
                <ServiceIcon size={24} color={colors.primary} />
              </View>
            </View>

            <View style={[styles.currentStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Clock size={14} color={colors.primary} />
              <Text style={[styles.currentStripText, { color: colors.text }]}>
                Current: {booking.booking_date} • {to12h(booking.booking_time)}
              </Text>
              {bookingPrice > 0 && (
                <Text style={[styles.priceTag, { color: "#10b981" }]}>
                  ETB {bookingPrice.toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* DATE SELECTOR */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarIcon size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("select_date") || "Select New Date"}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
          >
            {dates.map((date, i) => {
              const active = isSelected(date);
              return (
                <Animated.View key={i.toString()} entering={FadeInRight.delay(i * 30)}>
                  <Pressable
                    onPress={() => {
                      setSelectedDate(date);
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.dateItem,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.dayName, { color: active ? "#ffffff" : colors.subtext }]}>
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </Text>
                    <Text style={[styles.dayNumber, { color: active ? "#ffffff" : colors.text }]}>
                      {date.getDate()}
                    </Text>
                    {active && <View style={styles.activeDot} />}
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        {/* TIME SELECTOR */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("select_time") || "Select New Time"}
            </Text>
          </View>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((time) => {
              const active = selectedTime === time;
              return (
                <Pressable
                  key={time}
                  onPress={() => {
                    setSelectedTime(time);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.timeItem,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.timeText, { color: active ? "#ffffff" : colors.text }]}>
                    {time}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* SUBMIT BUTTON */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleUpdate}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              (pressed || isSubmitting) && { opacity: 0.88, transform: [{ scale: 0.98 }] },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Confirm Reschedule</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* SUCCESS MODAL */}
      <Modal transparent visible={showSuccess} animationType="fade" aria-hidden={false}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={Platform.OS === "ios" ? 50 : 100} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View entering={ZoomIn} style={[styles.successModal, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.successIcon}>
              <Check size={36} color="#ffffff" strokeWidth={3} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Rescheduled Successfully!</Text>
            <Text style={[styles.successMessage, { color: colors.subtext }]}>
              Your booking has been updated to{" "}
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {selectedTime}
              </Text>.
            </Text>
            <View style={styles.modalActionButtons}>
              <Pressable
                style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowSuccess(false);
                  router.replace(`/booking/status/${id}` as any);
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>View Live Status</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSecondaryBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setShowSuccess(false);
                  router.replace("/(tabs)/booking");
                }}
              >
                <Text style={[styles.modalSecondaryBtnText, { color: colors.text }]}>Back to My Bookings</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { color: "#ffffff", fontSize: 18, marginTop: 16, marginBottom: 24, textAlign: "center" },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  backButtonText: { color: "#ffffff", fontWeight: "bold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  serviceCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  serviceInfoCol: { flex: 1, paddingRight: 10 },
  categoryBadge: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  serviceName: { fontSize: 20, fontWeight: "700", marginBottom: 2 },
  bookingIdSub: { fontSize: 13 },
  iconPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  currentStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  currentStripText: { fontSize: 13, flex: 1, fontWeight: "500" },
  priceTag: { fontSize: 14, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  dateList: { gap: 10, paddingRight: 20 },
  dateItem: {
    width: 66,
    height: 82,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  dayName: { fontSize: 11, fontWeight: "600", marginBottom: 4, textTransform: "uppercase" },
  dayNumber: { fontSize: 20, fontWeight: "700" },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#ffffff", marginTop: 4 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeItem: {
    width: "31%",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  timeText: { fontSize: 13, fontWeight: "600" },
  footer: { paddingHorizontal: 20, marginTop: 8 },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  successModal: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
  },
  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  successTitle: { fontSize: 22, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  successMessage: { fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  modalActionButtons: { width: "100%", gap: 10 },
  modalPrimaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    width: "100%",
  },
  modalPrimaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  modalSecondaryBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
  },
  modalSecondaryBtnText: { fontSize: 14, fontWeight: "600" },
});
