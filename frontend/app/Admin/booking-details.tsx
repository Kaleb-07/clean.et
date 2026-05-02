import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useState, useCallback } from "react";
import API from "../../src/api/client";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ================= COMPONENT ================= */

export default function BookingDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [booking, setBooking] = useState<any>(null);

  const load = async () => {
    try {
      const res = await API.get(`/bookings/${id}`);
      setBooking(res.data.data);
    } catch (e) {
      console.log(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [id]),
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "in_progress":
        return "#3b82f6";
      default:
        return "#999";
    }
  };

  if (!booking) {
    return (
      <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace("/Admin/bookings")}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>

          <View>
            <Text style={styles.eyebrow}>Booking</Text>
            <Text style={styles.title}>#{booking.id}</Text>
          </View>
        </View>

        {/* CARD */}
        <BlurView intensity={40} tint="dark" style={styles.card}>
          {/* CUSTOMER */}
          <InfoRow
            icon="person-outline"
            label="Customer"
            value={booking?.customer?.name || "N/A"}
          />

          <InfoRow
            icon="mail-outline"
            label="Email"
            value={booking?.customer?.email || "N/A"}
          />

          <Divider />

          {/* SERVICE */}
          <InfoRow
            icon="car-outline"
            label="Service"
            value={booking?.service?.name}
          />

          <InfoRow
            icon="cash-outline"
            label="Price"
            value={`$${booking?.service?.price}`}
          />

          <Divider />

          {/* DATE */}
          <InfoRow
            icon="calendar-outline"
            label="Date"
            value={booking?.booking_date}
          />

          <InfoRow
            icon="time-outline"
            label="Time"
            value={booking?.booking_time}
          />

          <Divider />

          {/* STATUS */}
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>Status</Text>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(booking.status)}22` },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(booking.status) },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(booking.status) },
                ]}
              >
                {booking.status}
              </Text>
            </View>
          </View>
        </BlurView>
      </ScrollView>
    </LinearGradient>
  );
}

/* ================= SMALL COMPONENTS ================= */

const InfoRow = ({ icon, label, value }: any) => (
  <View style={styles.row}>
    <View style={styles.iconBox}>
      <Ionicons name={icon} size={18} color="#8b5cf6" />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

const Divider = () => <View style={styles.divider} />;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },

  loading: {
    color: "#fff",
    textAlign: "center",
    marginTop: 50,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  eyebrow: {
    color: "#8b5cf6",
    fontSize: 12,
  },

  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },

  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(139,92,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  label: {
    fontSize: 12,
    color: "#aaa",
  },

  value: {
    fontSize: 15,
    color: "#fff",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 12,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 6,
    gap: 6,
    alignSelf: "flex-start",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
