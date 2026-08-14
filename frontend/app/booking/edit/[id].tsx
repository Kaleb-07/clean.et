import React, { useState, useMemo, useEffect } from "react";
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
  CheckCircle2,
  Info,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInRight, FadeIn, ZoomIn } from "react-native-reanimated";

import { useServices } from "../../../hooks/useServices";
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

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM"
];

export default function EditBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { services, loading: servicesLoading } = useServices();
  const { getBooking, updateBooking, isLoading: bookingsLoading } = useBookings();
  const { t } = useLanguage();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const booking = useMemo(() => getBooking(id!), [id, getBooking]);
  const service = useMemo(() => 
    booking ? services.find(s => String(s.id) === String(booking.service?.id)) : null,
    [services, booking]
  );

  useEffect(() => {
    if (booking) {
      setSelectedDate(new Date(booking.booking_date + "T00:00:00"));
      setSelectedTime(to12h(booking.booking_time));
    }
  }, [booking]);

  // Generate next 14 days
  const dates = useMemo(() => {
    const list = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const handleUpdate = async () => {
    if (!selectedTime) {
      Alert.alert(t("selection_required"), t("select_time_msg"));
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsSubmitting(true);
    try {
      // Format date as YYYY-MM-DD in local time
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      await updateBooking(id!, {
        date: dateStr,
        timeSlot: selectedTime,
      });

      setShowSuccess(true);
    } catch (e: any) {
      console.error("Booking update error:", e);
      const msg = e.response?.data?.message || e.message || "Failed to update booking";
      Alert.alert("Update Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSelected = (date: Date) => 
    date.toDateString() === selectedDate.toDateString();

  if (servicesLoading || bookingsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!booking || !service) {
    return (
      <View style={styles.errorContainer}>
        <Info size={48} color="#ef4444" />
        <Text style={styles.errorText}>Booking not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView 
        contentContainerStyle={{ 
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: insets.bottom + 40 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable 
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <ChevronLeft size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Booking</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* SERVICE INFO */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.section}>
          <BlurView intensity={20} tint="dark" style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <View style={styles.durationBadge}>
                  <Clock size={12} color="#a3a3a3" />
                  <Text style={styles.durationText}>{service.duration || "45"} min</Text>
                </View>
              </View>
              <Text style={styles.price}>${service.price}</Text>
            </View>
            <Text style={styles.description}>{service.description}</Text>
          </BlurView>
        </Animated.View>

        {/* DATE SELECTOR */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarIcon size={18} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>{t("select_date")}</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
          >
            {dates.map((date, i) => (
              <Animated.View key={i.toString()} entering={FadeInRight.delay(i * 50)}>
                <Pressable
                  onPress={() => {
                    setSelectedDate(date);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.dateItem,
                    isSelected(date) && styles.dateItemActive
                  ]}
                >
                  <Text style={[styles.dayName, isSelected(date) && styles.textActive]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dayNumber, isSelected(date) && styles.textActive]}>
                    {date.getDate()}
                  </Text>
                  {isSelected(date) && (
                    <View style={styles.activeDot} />
                  )}
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        {/* TIME SELECTOR */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>{t("select_time")}</Text>
          </View>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((time) => (
              <Pressable
                key={time}
                onPress={() => {
                  setSelectedTime(time);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.timeItem,
                  selectedTime === time && styles.timeItemActive
                ]}
              >
                <Text style={[styles.timeText, selectedTime === time && styles.textActive]}>
                  {time}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* SUMMARY & BUTTON */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleUpdate}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.bookBtn,
              (pressed || isSubmitting) && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.bookBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* SUCCESS MODAL */}
      <Modal transparent visible={showSuccess} animationType="fade" aria-hidden={false}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View entering={ZoomIn} style={styles.successModal}>
            <View style={styles.successIcon}>
              <Check size={40} color="#ffffff" />
            </View>
            <Text style={styles.successTitle}>Changes Saved!</Text>
            <Text style={styles.successMessage}>
              Your booking has been updated successfully.
            </Text>
            <Pressable 
              style={styles.doneButton}
              onPress={() => {
                setShowSuccess(false);
                router.replace("/(tabs)/booking");
              }}
            >
              <Text style={styles.doneButtonText}>{t("view_bookings")}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0b0b1f" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#0b0b1f" },
  errorText: { color: "#ffffff", fontSize: 18, marginTop: 16, marginBottom: 24 },
  backButton: { backgroundColor: "#6d28d9", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: "#ffffff", fontWeight: "bold" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 24 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  section: { paddingHorizontal: 20, marginBottom: 32 },
  serviceCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", overflow: "hidden" },
  serviceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  serviceName: { fontSize: 22, fontWeight: "bold", color: "#ffffff", marginBottom: 4 },
  durationBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  durationText: { color: "#a3a3a3", fontSize: 12, fontWeight: "600" },
  price: { fontSize: 24, fontWeight: "bold", color: "#8b5cf6" },
  description: { fontSize: 15, color: "#94a3b8", lineHeight: 22 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  dateList: { gap: 12, paddingRight: 20 },
  dateItem: { width: 65, height: 85, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  dateItemActive: { backgroundColor: "#6d28d9", borderColor: "#8b5cf6" },
  dayName: { fontSize: 12, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" },
  dayNumber: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  textActive: { color: "#ffffff" },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#ffffff", marginTop: 6 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeItem: { width: "31%", paddingVertical: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  timeItemActive: { backgroundColor: "#6d28d9", borderColor: "#8b5cf6" },
  timeText: { fontSize: 13, color: "#ffffff", fontWeight: "600" },
  footer: { paddingHorizontal: 20, marginTop: 10 },
  bookBtn: { backgroundColor: "#6d28d9", paddingVertical: 18, borderRadius: 20, alignItems: "center", shadowColor: "#6d28d9", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  bookBtnText: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  successModal: { width: "100%", backgroundColor: "#1a1b3a", borderRadius: 32, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#10b981", justifyContent: "center", alignItems: "center", marginBottom: 24, shadowColor: "#10b981", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  successTitle: { fontSize: 24, fontWeight: "bold", color: "#ffffff", marginBottom: 12, textAlign: "center" },
  successMessage: { fontSize: 16, color: "#a3a3a3", textAlign: "center", marginBottom: 32, lineHeight: 24 },
  doneButton: { backgroundColor: "#6d28d9", paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: "100%", alignItems: "center" },
  doneButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
});
