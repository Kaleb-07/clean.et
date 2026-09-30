import React, { useState, useMemo } from "react";
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
  Linking,
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
  Banknote,
  Smartphone,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInRight, FadeIn, ZoomIn } from "react-native-reanimated";

import API from "../../../src/api/client";
import { useServices } from "../../../hooks/useServices";
import { useBookings } from "../../../hooks/useBookings";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useColors } from "../../../hooks/useColors";

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM"
];

export default function BookingDetailsScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { services, loading: servicesLoading } = useServices();
  const { addBooking } = useBookings();
  const { t } = useLanguage();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentTiming, setPaymentTiming] = useState<"after" | "before">("after");
  const [bookingError, setBookingError] = useState<string | null>(null);

  const service = useMemo(() => 
    services.find(s => String(s.id) === String(serviceId)),
    [services, serviceId]
  );

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

  const handleBooking = async () => {
    setBookingError(null);

    if (!selectedTime) {
      const err = "Please select a time slot for your service.";
      setBookingError(err);
      if (Platform.OS === "web" && typeof window !== "undefined") window.alert(err);
      else Alert.alert("Selection Required", err);
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

      const created = await addBooking({
        serviceId: serviceId!,
        date: dateStr,
        timeSlot: selectedTime,
      });

      // If user chose Pay Online Now (Chapa), initiate payment & redirect to Chapa immediately
      if (paymentTiming === "before" && created?.id) {
        try {
          // Build return_url — Chapa will redirect back here after payment
          const appBaseUrl = process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:8081";
          const returnUrl = `${appBaseUrl}/payment/callback?booking_id=${created.id}`;

          const res = await API.post(`/bookings/${created.id}/collect-payment`, {
            provider: "chapa",
            return_url: returnUrl,
          });
          const checkoutUrl = res.data?.checkout_url || res.data?.payment?.checkout_url;
          if (checkoutUrl) {
            if (Platform.OS === "web" && typeof window !== "undefined") {
              window.location.assign(checkoutUrl);
              return;
            } else {
              await Linking.openURL(checkoutUrl);
              router.replace(`/payment/callback?booking_id=${created.id}` as any);
              return;
            }
          }
        } catch (payErr: any) {
          const msg = payErr?.response?.data?.message || payErr?.message || "Could not connect to Chapa payment gateway.";
          setBookingError(msg);
          if (Platform.OS === "web" && typeof window !== "undefined") window.alert(`Chapa Payment Error: ${msg}`);
          else Alert.alert("Chapa Payment Error", msg);
          return;
        }
      }

      // Cash on Delivery: show success modal
      setShowSuccess(true);
    } catch (e: any) {
      console.error("Booking submission error:", e);
      const validationErrors = e?.response?.data?.errors;
      let msg = "";
      if (validationErrors) {
        msg = Object.entries(validationErrors)
          .map(([field, msgs]) => `• ${field}: ${(msgs as string[]).join(", ")}`)
          .join("\n");
      } else {
        msg = e?.response?.data?.message || e?.message || "Failed to create booking";
      }
      setBookingError(msg);
      if (Platform.OS === "web" && typeof window !== "undefined") window.alert(`Booking Error:\n${msg}`);
      else Alert.alert("Booking Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSelected = (date: Date) => 
    date.toDateString() === selectedDate.toDateString();

  if (servicesLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Info size={48} color="#ef4444" />
        <Text style={[styles.errorText, { color: colors.text }]}>Service not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.container}>
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
            style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Book Wash</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* SERVICE INFO */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.section}>
          <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.serviceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <View style={[styles.durationBadge, { backgroundColor: colors.surface }]}>
                    <Clock size={12} color={colors.subtext} />
                    <Text style={[styles.durationText, { color: colors.subtext }]}>{service.duration || "45"} min</Text>
                  </View>

                  <View style={{ backgroundColor: "#10B98122", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#10B98155" }}>
                    <Text style={{ color: "#34D399", fontSize: 10, fontWeight: "700" }}>
                      {service.sub_center ? service.sub_center.replace("-", " ").toUpperCase() : "VERIFIED SERVICE BRANCH"}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.price}>ETB {Number(service.price).toLocaleString()}</Text>
            </View>
            <Text style={[styles.description, { color: colors.subtext }]}>{service.description || "Professional service delivered by certified equipment and trained technicians."}</Text>
          </BlurView>
        </Animated.View>

        {/* DATE SELECTOR */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarIcon size={18} color="#8b5cf6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Date</Text>
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
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected(date) && styles.dateItemActive
                  ]}
                >
                  <Text style={[styles.dayName, { color: colors.subtext }, isSelected(date) && styles.textActive]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dayNumber, { color: colors.text }, isSelected(date) && styles.textActive]}>
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Time</Text>
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
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedTime === time && styles.timeItemActive
                ]}
              >
                <Text style={[styles.timeText, { color: colors.text }, selectedTime === time && styles.textActive]}>
                  {time}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* PAYMENT OPTION (PAY BEFORE VS PAY AFTER) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Banknote size={18} color="#8b5cf6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Option</Text>
          </View>
          <View style={{ gap: 10 }}>
            {/* Pay After Cleaning (Cash on Delivery) */}
            <Pressable
              onPress={() => {
                setPaymentTiming("after");
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                {
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  backgroundColor: colors.card,
                  borderColor: paymentTiming === "after" ? "#10b981" : colors.cardBorder,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }
              ]}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: paymentTiming === "after" ? "rgba(16, 185, 129, 0.15)" : colors.surface,
                justifyContent: "center",
                alignItems: "center",
              }}>
                <Banknote size={20} color={paymentTiming === "after" ? "#10b981" : colors.subtext} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Pay After Cleaning (Cash on Delivery)</Text>
                <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>Pay cash to field staff on-site after service</Text>
              </View>
              {paymentTiming === "after" && (
                <CheckCircle2 size={18} color="#10b981" />
              )}
            </Pressable>

            {/* Pay Online Now (Chapa / Mobile Money) */}
            <Pressable
              onPress={() => {
                setPaymentTiming("before");
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                {
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  backgroundColor: colors.card,
                  borderColor: paymentTiming === "before" ? "#8b5cf6" : colors.cardBorder,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }
              ]}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: paymentTiming === "before" ? "rgba(139, 92, 246, 0.15)" : colors.surface,
                justifyContent: "center",
                alignItems: "center",
              }}>
                <Smartphone size={20} color={paymentTiming === "before" ? "#a78bfa" : colors.subtext} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Pay Online Now (Chapa / Mobile Money)</Text>
                <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>Pay immediately via Telebirr, CBE Birr, or Card</Text>
              </View>
              {paymentTiming === "before" && (
                <CheckCircle2 size={18} color="#8b5cf6" />
              )}
            </Pressable>
          </View>
        </View>

        {/* SUMMARY & BUTTON */}
        <View style={styles.footer}>
          {selectedTime && (
            <Animated.View
              entering={FadeInDown}
              style={[
                styles.summaryBox,
                {
                  backgroundColor: colors.isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5",
                  borderColor: colors.isDark ? "rgba(16, 185, 129, 0.2)" : "#A7F3D0"
                }
              ]}
            >
              <CheckCircle2 size={16} color="#10b981" />
              <Text style={styles.summaryText}>
                Scheduled for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {selectedTime}
              </Text>
            </Animated.View>
          )}

          {bookingError && (
            <Animated.View
              entering={FadeInDown}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                borderColor: "rgba(239, 68, 68, 0.3)",
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Info size={18} color="#ef4444" />
              <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "600", flex: 1 }}>
                {bookingError}
              </Text>
            </Animated.View>
          )}

          <Pressable
            onPress={handleBooking}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.bookBtn,
              (pressed || isSubmitting) && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.bookBtnText}>Confirm Booking</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* SUCCESS MODAL */}
      <Modal transparent visible={showSuccess} animationType="fade" aria-hidden={false}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={50} tint={colors.isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <Animated.View entering={ZoomIn} style={[styles.successModal, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.successIcon}>
              <Check size={40} color="#ffffff" />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>{t("booking_success")}</Text>
            <Text style={[styles.successMessage, { color: colors.subtext }]}>
              {t("booking_success_msg")}
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0b0b1f",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#0b0b1f",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: "#ffffff",
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#6d28d9",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  serviceCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: "#a3a3a3",
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  description: {
    fontSize: 14,
    color: "#a3a3a3",
    lineHeight: 20,
  },
  dateList: {
    gap: 12,
    paddingRight: 20,
  },
  dateItem: {
    width: 64,
    height: 80,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  dateItemActive: {
    backgroundColor: "#6d28d9",
    borderColor: "#8b5cf6",
  },
  dayName: {
    fontSize: 12,
    color: "#a3a3a3",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  textActive: {
    color: "#ffffff",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ffffff",
    position: "absolute",
    bottom: 8,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    minWidth: '30%',
    alignItems: 'center',
  },
  timeItemActive: {
    backgroundColor: "#6d28d9",
    borderColor: "#8b5cf6",
  },
  timeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  summaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  summaryText: {
    color: "#10b981",
    fontSize: 13,
    fontWeight: "500",
  },
  bookBtn: {
    backgroundColor: "#6d28d9",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6d28d9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bookBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successModal: {
    width: "100%",
    backgroundColor: "#1a1b3a",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#a3a3a3",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: "#6d28d9",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },
  doneButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
