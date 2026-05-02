import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { ChevronRight, Trash2, Eye } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import API from "../../../src/api/client";

/* ================= TYPES ================= */
type Booking = {
  id: number;
  status: "pending" | "in_progress" | "completed";
};

/* ================= CONSTANTS ================= */
const STATUS_FLOW: Booking["status"][] = [
  "pending",
  "in_progress",
  "completed",
];

const STATUS_COLORS = {
  pending: "#f59e0b",
  in_progress: "#3b82f6",
  completed: "#10b981",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

function nextStatus(s: Booking["status"]) {
  const idx = STATUS_FLOW.indexOf(s);
  return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

/* ================= COMPONENT ================= */
export default function AdminBookings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await API.get("/bookings");
      setBookings(res.data.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (id: number, status: Booking["status"]) => {
    try {
      await API.patch(`/bookings/${id}/status`, { status });
      await loadBookings(); // ensure refresh completes
    } catch (e) {
      console.log(e);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await API.delete(`/bookings/${deleteId}`);
    setDeleteId(null);
    loadBookings();
  };

  const filtered = useMemo(() => {
    if (filter === "all") return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const advance = async (b: Booking) => {
    const next = nextStatus(b.status);
    if (!next) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await updateBookingStatus(b.id, next);
  };

  const setStatus = async (b: Booking, status: Booking["status"]) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    await updateBookingStatus(b.id, status);
  };

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: (isWeb ? 67 : insets.top) + 12,
            paddingBottom: (isWeb ? 84 : insets.bottom + 84) + 24,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadBookings}
            tintColor="#8b5cf6"
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Manage</Text>
          <Text style={styles.title}>All Bookings</Text>
          <Text style={styles.subtitle}>{filtered.length} bookings</Text>
        </View>

        {/* FILTERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={styles.filterChipText}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* BOOKINGS */}
        {filtered.map((b) => {
          const color = STATUS_COLORS[b.status];
          const next = nextStatus(b.status);

          return (
            <BlurView key={b.id} intensity={40} tint="dark" style={styles.card}>
              {/* HEADER */}
              <View style={styles.cardHeader}>
                <Text style={styles.serviceName}>Booking No: {b.id}</Text>

                <View
                  style={[styles.statusPill, { backgroundColor: `${color}22` }]}
                >
                  <View
                    style={[styles.statusDot, { backgroundColor: color }]}
                  />
                  <Text style={[styles.statusText, { color }]}>{b.status}</Text>
                </View>
              </View>

              {/* STATUS FLOW */}
              <View style={styles.statusFlow}>
                {STATUS_FLOW.map((s) => {
                  const isCurrent = s === b.status;

                  return (
                    <Pressable
                      key={s}
                      onPress={() => setStatus(b, s)}
                      style={[
                        styles.flowChip,
                        isCurrent && {
                          backgroundColor: STATUS_COLORS[s],
                        },
                      ]}
                    >
                      <Text style={styles.flowChipText}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* ACTIONS */}
              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.viewBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/Admin/booking-details",
                      params: { id: b.id },
                    })
                  }
                >
                  <Eye size={16} color="#fff" />
                  <Text style={styles.btnText}>View</Text>
                </Pressable>

                <Pressable
                  onPress={() => setDeleteId(b.id)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>

                {next && (
                  <Pressable
                    onPress={() => advance(b)}
                    style={styles.advanceButton}
                  >
                    <Text style={styles.advanceText}>Next</Text>
                    <ChevronRight size={16} color="#fff" />
                  </Pressable>
                )}
              </View>
            </BlurView>
          );
        })}

        {/* EMPTY */}
        {filtered.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        )}
      </ScrollView>

      {/* DELETE MODAL */}
      {deleteId && (
        <View style={styles.modalOverlay}>
          <BlurView intensity={60} tint="dark" style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Booking</Text>
            <Text style={styles.modalText}>This action cannot be undone.</Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setDeleteId(null)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={confirmDelete}
                style={styles.confirmDeleteBtn}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      )}
    </LinearGradient>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  header: { marginBottom: 16 },
  eyebrow: { color: "#8b5cf6", fontSize: 12 },
  title: { color: "#fff", fontSize: 30, fontWeight: "800" },
  subtitle: { color: "#aaa" },

  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#222",
  },
  filterChipActive: { backgroundColor: "#8b5cf6" },
  filterChipText: { color: "#fff" },

  card: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  serviceName: { color: "#fff" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 20,
  },

  statusDot: { width: 6, height: 6, borderRadius: 3 },

  statusText: {
    marginLeft: 6,
    fontSize: 12,
    textTransform: "capitalize",
  },

  statusFlow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },

  flowChip: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#333",
  },

  flowChipText: { color: "#fff", fontSize: 11 },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 10,
  },

  viewBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  deleteButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  deleteText: { color: "#ef4444" },

  advanceButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#8b5cf6",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  advanceText: { color: "#fff" },

  btnText: { color: "#fff" },

  emptyCard: {
    padding: 30,
    alignItems: "center",
  },

  emptyText: { color: "#fff" },

  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
    width: "85%",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  modalText: {
    color: "#aaa",
    marginBottom: 20,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  cancelText: {
    color: "#aaa",
  },

  confirmDeleteBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },

  confirmDeleteText: {
    color: "#fff",
  },
});
