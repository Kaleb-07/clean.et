import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2, XCircle, AlertCircle, ChevronLeft, CalendarCheck } from "lucide-react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";

import API from "../../src/api/client";
import { useColors } from "../../hooks/useColors";

type PaymentState = "verifying" | "success" | "failed" | "unknown";

export default function PaymentCallbackScreen() {
  const { booking_id, status } = useLocalSearchParams<{
    booking_id?: string;
    status?: string;
    tx_ref?: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [paymentState, setPaymentState] = useState<PaymentState>("verifying");
  const [message, setMessage] = useState("Verifying your payment...");
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;
    verifyPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyPayment = async () => {
    // If Chapa returned a failure status in the URL
    if (status && status !== "success") {
      setPaymentState("failed");
      setMessage("Payment was not completed. Please try again.");
      return;
    }

    if (!booking_id) {
      setPaymentState("success");
      setMessage("Payment completed! Use the button below to go back to your bookings.");
      return;
    }

    try {
      setMessage("Confirming payment with server...");
      const res = await API.get(`/bookings/${booking_id}/payment-status`);
      const paid = res.data?.paid ?? false;
      const payStatus = res.data?.status ?? "pending";

      if (paid || payStatus === "completed") {
        setPaymentState("success");
        setMessage("Payment confirmed! Tap below to view your booking.");
      } else if (payStatus === "failed") {
        setPaymentState("failed");
        setMessage("Payment failed. Please try again from your booking.");
      } else {
        // Still pending — Chapa webhook may arrive shortly
        setPaymentState("success");
        setMessage("Payment is being processed. Tap below to track your booking.");
      }
    } catch (err) {
      console.warn("Payment callback verification error:", err);
      setPaymentState("unknown");
      setMessage("We couldn't verify the payment status. Please check your booking.");
    }
  };

  const goToBookings = () => {
    router.replace("/(tabs)/bookings" as any);
  };

  const goToBookingDetail = () => {
    if (booking_id) {
      router.replace(`/booking/status/${booking_id}` as any);
    } else {
      router.replace("/(tabs)/bookings" as any);
    }
  };

  const iconColor = () => {
    switch (paymentState) {
      case "success": return "#10b981";
      case "failed":  return "#ef4444";
      case "unknown": return "#f59e0b";
      default:        return "#8b5cf6";
    }
  };

  const title = () => {
    switch (paymentState) {
      case "success": return "Payment Successful!";
      case "failed":  return "Payment Failed";
      case "unknown": return "Status Unknown";
      default:        return "Verifying Payment";
    }
  };

  const renderIcon = () => {
    switch (paymentState) {
      case "success": return <CheckCircle2 size={56} color="#10b981" strokeWidth={1.5} />;
      case "failed":  return <XCircle size={56} color="#ef4444" strokeWidth={1.5} />;
      case "unknown": return <AlertCircle size={56} color="#f59e0b" strokeWidth={1.5} />;
      default:        return <ActivityIndicator size="large" color="#8b5cf6" />;
    }
  };

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: "Payment Return" }} />

      {/* ── Top back button — always visible ── */}
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <Pressable
          onPress={goToBookings}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <ChevronLeft size={20} color={colors.text} />
          <Text style={[styles.backBtnText, { color: colors.text }]}>My Bookings</Text>
        </Pressable>
      </Animated.View>

      {/* ── Main card ── */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>

        {/* Icon */}
        <Animated.View entering={ZoomIn.delay(200)} style={[styles.iconWrapper, { backgroundColor: iconColor() + "18" }]}>
          {renderIcon()}
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Text style={[styles.title, { color: colors.text }]}>{title()}</Text>
        </Animated.View>

        {/* Message */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <Text style={[styles.message, { color: colors.subtext }]}>{message}</Text>
        </Animated.View>

        {/* Buttons — shown after verifying completes */}
        {paymentState !== "verifying" && (
          <Animated.View entering={FadeInDown.delay(500)} style={styles.buttonWrapper}>

            {/* Primary CTA */}
            <Pressable
              style={[styles.primaryButton, { backgroundColor: iconColor() }]}
              onPress={goToBookingDetail}
            >
              <CalendarCheck size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {booking_id ? "View My Booking" : "My Bookings"}
              </Text>
            </Pressable>

            {/* Secondary — always go to bookings tab */}
            <Pressable
              style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={goToBookings}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.subtext }]}>
                Back to Bookings Tab
              </Text>
            </Pressable>

          </Animated.View>
        )}
      </Animated.View>

      {/* ── Bottom safe-area spacer ── */}
      <View style={{ height: insets.bottom + 16 }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: 14,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  buttonWrapper: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
