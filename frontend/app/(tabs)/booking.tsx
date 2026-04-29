import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Calendar, ChevronRight, Clock, Info, X } from "lucide-react-native";
import { useBookings, Booking } from "../../hooks/useBookings";
import { useServices } from "../../hooks/useServices";

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { bookings, isLoading, reload, updateBookingStatus } = useBookings();
  const { services } = useServices();

  const getService = (id: string) => services.find((s) => s.id === id);

  const handleCancel = (booking: Booking) => {
    Alert.alert(
      "Cancel booking?",
      "This will cancel your scheduled wash. You can always book another time.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel booking",
          style: "destructive",
          onPress: async () => {
            try {
              await updateBookingStatus(booking.id, "cancelled");
            } catch (e) {
              const message =
                e instanceof Error ? e.message : "Could not cancel booking.";
              Alert.alert("Cancel failed", message);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Booking }) => {
    const service = getService(item.serviceId);
    if (!service) return null;

    const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const statusColors: Record<string, string> = {
      pending: "#f59e0b",
      confirmed: "#3b82f6",
      in_progress: "#8b5cf6",
      completed: "#10b981",
      cancelled: "#ef4444",
    };

    const canCancel =
      item.status !== "completed" &&
      item.status !== "cancelled" &&
      item.status !== "in_progress";

    return (
      <Pressable
        onPress={() => router.push(`/booking/status/${item.id}`)}
        style={({ pressed }) => [pressed && { opacity: 0.8 }]}
      >
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.serviceName}>{service.name}</Text>
              <View style={styles.dateContainer}>
                <Calendar size={14} color="#a3a3a3" />
                <Text style={styles.dateText}>{formattedDate}</Text>
                <Clock size={14} color="#a3a3a3" style={{ marginLeft: 8 }} />
                <Text style={styles.dateText}>{item.timeSlot}</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColors[item.status]}20` },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                {item.status.replace("_", " ").toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.price}>${service.price}</Text>
            {canCancel ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleCancel(item);
                }}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <X size={14} color="#fca5a5" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            ) : (
              <ChevronRight size={20} color="#a3a3a3" />
            )}
          </View>
        </BlurView>
      </Pressable>
    );
  };

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 60) }]}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      <FlatList
        data={bookings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshing={isLoading}
        onRefresh={reload}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Info size={32} color="#a3a3a3" />
              </View>
              <Text style={styles.emptyTitle}>No Bookings Yet</Text>
              <Text style={styles.emptyText}>
                Your upcoming car wash appointments will appear here.
              </Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push("/home")}
              >
                <Text style={styles.emptyButtonText}>Book a Wash</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: "#a3a3a3",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 16,
  },
  price: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  cancelBtnText: {
    color: "#fca5a5",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#a3a3a3",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  emptyButton: {
    backgroundColor: "#6d28d9",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
