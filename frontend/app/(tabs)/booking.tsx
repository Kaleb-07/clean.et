import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Platform, Modal, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Calendar, ChevronRight, Clock, Info, X, Edit2, Plus } from "lucide-react-native";
import { useBookings, Booking } from "../../hooks/useBookings";
import { useServices } from "../../hooks/useServices";
import { useLanguage } from "../../contexts/LanguageContext";

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { bookings, isLoading, reload, deleteBooking } = useBookings();
  const { services } = useServices();
  const { t } = useLanguage();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const getService = (id: string) => services.find((s) => s.id === id);

  const handleCancel = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancelModalVisible(true);
  };

  const onConfirmCancel = async () => {
    if (!bookingToCancel) return;
    
    setIsCancelling(true);
    try {
      console.log("[BookingsScreen] Confirming cancel via popup for:", bookingToCancel.id);
      await deleteBooking(bookingToCancel.id);
      setCancelModalVisible(false);
      setBookingToCancel(null);
    } catch (e) {
      console.error("[BookingsScreen] Cancel error:", e);
      const message = e instanceof Error ? e.message : "Could not cancel booking.";
      Alert.alert("Cancel failed", message);
    } finally {
      setIsCancelling(false);
    }
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

    const canModify =
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
            <View style={styles.actionRow}>
              {canModify && (
                <>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/booking/edit/${item.id}`);
                    }}
                    style={({ pressed }) => [
                      styles.editBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Edit2 size={14} color="#a3e635" />
                    <Text style={styles.editBtnText}>{t("edit")}</Text>
                  </Pressable>

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
                    <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
                  </Pressable>
                </>
              )}
              {!canModify && <ChevronRight size={20} color="#a3a3a3" />}
            </View>
          </View>
        </BlurView>
      </Pressable>
    );
  };

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 60) }]}>
        <Text style={styles.title}>{t("my_bookings")}</Text>
      </View>

      <FlatList
        data={bookings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        refreshing={isLoading}
        onRefresh={reload}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Info size={32} color="#a3a3a3" />
              </View>
              <Text style={styles.emptyTitle}>{t("no_bookings")}</Text>
              <Text style={styles.emptyText}>
                {t("no_bookings_msg")}
              </Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push("/home")}
              >
                <Text style={styles.emptyButtonText}>{t("book_a_wash")}</Text>
              </Pressable>
            </View>
          ) : null
        }
      />

      <Pressable 
        style={({ pressed }) => [
          styles.fab,
          pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 }
        ]}
        onPress={() => router.push("/home")}
      >
        <LinearGradient
          colors={["#8b5cf6", "#6d28d9"]}
          style={styles.fabGradient}
        >
          <Plus size={24} color="#ffffff" />
          <Text style={styles.fabText}>{t("new_booking")}</Text>
        </LinearGradient>
      </Pressable>

      {/* CUSTOM CANCEL MODAL */}
      <Modal
        transparent
        visible={cancelModalVisible}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.popupContainer}>
            <View style={styles.popupIcon}>
              <X size={32} color="#ef4444" />
            </View>
            <Text style={styles.popupTitle}>{t("cancel_booking")}</Text>
            <Text style={styles.popupMessage}>{t("cancel_msg")}</Text>
            
            <View style={styles.popupActions}>
              <Pressable
                style={[styles.popupButton, styles.keepButton]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.keepButtonText}>{t("keep_it")}</Text>
              </Pressable>
              
              <Pressable
                style={[styles.popupButton, styles.confirmCancelButton]}
                onPress={onConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.confirmCancelText}>{t("cancel")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  actionRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(163, 230, 53, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(163, 230, 53, 0.3)",
  },
  editBtnText: {
    color: "#a3e635",
    fontSize: 13,
    fontWeight: "600",
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
  fab: {
    position: "absolute",
    bottom: 100, // Higher up to avoid tab bar
    right: 24,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 999,
  },
  fabGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  fabText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  popupContainer: {
    width: "100%",
    backgroundColor: "#1a1b3a",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  popupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
  },
  popupMessage: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  popupActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  popupButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  keepButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  keepButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
  confirmCancelButton: {
    backgroundColor: "#ef4444",
  },
  confirmCancelText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
