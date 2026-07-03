import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import API from "../../../src/api/client";

/* ─── TYPES ─────────────────────────────────────────────────────────────── */
type BookingStatus =
  | "pending"
  | "confirmed"
  | "driver_assigned"
  | "picked_up"
  | "in_progress"
  | "completed"
  | "invoiced"
  | "cancelled";

interface Booking {
  id: number;
  status: BookingStatus;
  price: number | null;
  currency: string;
  scheduled_at: string | null;
  sector?: { name: string; category?: { name: string } };
  customer?: { user?: { name: string; phone: string } };
  staff?: { user?: { name: string } };
  invoice_id?: number | null;
}

interface StaffMember {
  id: number;
  role_title: string;
  user: { name: string };
}

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const STATUS_FLOW: BookingStatus[] = [
  "pending",
  "confirmed",
  "driver_assigned",
  "picked_up",
  "in_progress",
  "completed",
  "invoiced",
  "cancelled",
];

const STATUS_META: Record<BookingStatus, { color: string; label: string; icon: string }> = {
  pending:         { color: "#f59e0b", label: "Pending",         icon: "time-outline" },
  confirmed:       { color: "#22c55e", label: "Confirmed",       icon: "checkmark-circle-outline" },
  driver_assigned: { color: "#3b82f6", label: "Driver Assigned", icon: "car-outline" },
  picked_up:       { color: "#8b5cf6", label: "Picked Up",       icon: "arrow-up-circle-outline" },
  in_progress:     { color: "#06b6d4", label: "In Progress",     icon: "refresh-circle-outline" },
  completed:       { color: "#10b981", label: "Completed",       icon: "checkmark-done-outline" },
  invoiced:        { color: "#a855f7", label: "Invoiced",        icon: "receipt-outline" },
  cancelled:       { color: "#ef4444", label: "Cancelled",       icon: "close-circle-outline" },
};

const FILTERS = [
  { key: "all",             label: "All" },
  { key: "pending",         label: "Pending" },
  { key: "confirmed",       label: "Confirmed" },
  { key: "driver_assigned", label: "Assigned" },
  { key: "in_progress",     label: "In Progress" },
  { key: "completed",       label: "Completed" },
  { key: "cancelled",       label: "Cancelled" },
];

function nextStatus(s: BookingStatus): BookingStatus | null {
  if (s === "cancelled" || s === "invoiced") return null;
  const idx = STATUS_FLOW.indexOf(s);
  const next = STATUS_FLOW[idx + 1];
  return next === "cancelled" ? null : next ?? null;
}

/* ─── BOOKING CARD ───────────────────────────────────────────────────────── */
function BookingCard({
  booking,
  onStatusChange,
  onDelete,
  onAssignStaff,
  onIssueInvoice,
}: {
  booking: Booking;
  onStatusChange: (status: BookingStatus) => void;
  onDelete: () => void;
  onAssignStaff: () => void;
  onIssueInvoice: () => void;
}) {
  const meta = STATUS_META[booking.status] ?? STATUS_META.pending;
  const next = nextStatus(booking.status);

  const formattedDate = booking.scheduled_at
    ? new Date(booking.scheduled_at).toLocaleString("en-ET", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <BlurView intensity={30} tint="dark" style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bookingId}>Booking #{booking.id}</Text>
          {booking.sector && (
            <Text style={styles.sectorLabel}>
              {booking.sector.category?.name} · {booking.sector.name}
            </Text>
          )}
        </View>
        <View style={[styles.statusPill, { borderColor: `${meta.color}55` }]}>
          <Ionicons name={meta.icon as any} size={12} color={meta.color} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        {booking.customer?.user && (
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={12} color="#64748b" />
            <Text style={styles.infoText}>{booking.customer.user.name}</Text>
          </View>
        )}
        {formattedDate && (
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={12} color="#64748b" />
            <Text style={styles.infoText}>{formattedDate}</Text>
          </View>
        )}
        {booking.price != null && (
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={12} color="#64748b" />
            <Text style={[styles.infoText, { color: "#a78bfa" }]}>
              ETB {Number(booking.price).toLocaleString()}
            </Text>
          </View>
        )}
        {booking.staff?.user && (
          <View style={styles.infoItem}>
            <Ionicons name="person-circle-outline" size={12} color="#64748b" />
            <Text style={styles.infoText}>Staff: {booking.staff.user.name}</Text>
          </View>
        )}
      </View>

      {/* Status selector chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusFlow}
      >
        {STATUS_FLOW.filter((s) => s !== "cancelled").map((s) => {
          const isCurrent = s === booking.status;
          const m = STATUS_META[s];
          return (
            <Pressable
              key={s}
              onPress={() => onStatusChange(s)}
              style={[
                styles.flowChip,
                isCurrent && { backgroundColor: m.color, borderColor: m.color },
              ]}
            >
              <Text
                style={[
                  styles.flowChipText,
                  isCurrent && { color: "#fff" },
                ]}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {booking.status !== "cancelled" && (
          <Pressable onPress={onAssignStaff} style={styles.assignBtn}>
            <Ionicons name="person-add-outline" size={14} color="#8b5cf6" />
            <Text style={styles.assignText}>Assign</Text>
          </Pressable>
        )}

        {booking.status === "completed" && !booking.invoice_id ? (
          <Pressable onPress={onIssueInvoice} style={styles.issueInvoiceBtn}>
            <Ionicons name="receipt-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.issueInvoiceText}>Issue Invoice</Text>
          </Pressable>
        ) : (
          next && (
            <Pressable onPress={() => onStatusChange(next)} style={styles.nextBtn}>
              <Text style={styles.nextText}>→ {STATUS_META[next].label}</Text>
            </Pressable>
          )
        )}

        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={14} color="#ef4444" />
        </Pressable>
      </View>
    </BlurView>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function AdminBookings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [assignBookingId, setAssignBookingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, stRes] = await Promise.allSettled([
        API.get("/bookings"),
        API.get("/staff"),
      ]);
      if (bRes.status === "fulfilled") setBookings(bRes.value.data.data ?? []);
      if (stRes.status === "fulfilled") setStaff(stRes.value.data ?? []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: BookingStatus) => {
    try {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      await API.patch(`/bookings/${id}/status`, { status });
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
    } catch {
      Alert.alert("Error", "Could not update booking status.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await API.delete(`/bookings/${deleteId}`);
      setBookings((prev) => prev.filter((b) => b.id !== deleteId));
      setDeleteId(null);
    } catch {
      Alert.alert("Error", "Failed to delete booking.");
    } finally {
      setDeleting(false);
    }
  };

  const handleAssign = async (staffId: number) => {
    if (!assignBookingId) return;
    try {
      await API.post(`/bookings/${assignBookingId}/assign`, { staff_id: staffId });
      setAssignBookingId(null);
      await loadData();
    } catch (err: any) {
      Alert.alert(
        "Cannot Assign",
        err?.response?.data?.message ?? "Staff not qualified for this sector."
      );
    }
  };

  const handleIssueInvoice = async (id: number) => {
    try {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      const res = await API.post(`/admin/invoices/generate/${id}`);
      const invoice = res.data.data || res.data;
      Alert.alert(
        "Invoice Generated",
        `Invoice successfully generated for ETB ${Number(invoice.amount).toLocaleString()}.`
      );
      await loadData();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ?? "Could not generate invoice."
      );
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  return (
    <LinearGradient colors={["#07070f", "#0f1028"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor="#8b5cf6"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Manage</Text>
          <Text style={styles.title}>All Bookings</Text>
          <Text style={styles.subtitle}>{filtered.length} bookings</Text>
        </View>

        {/* Filters */}
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
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Booking Cards */}
        {filtered.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            onStatusChange={(status) => updateStatus(b.id, status)}
            onDelete={() => setDeleteId(b.id)}
            onAssignStaff={() => setAssignBookingId(b.id)}
            onIssueInvoice={() => handleIssueInvoice(b.id)}
          />
        ))}

        {filtered.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#1e293b" />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        )}
      </ScrollView>

      {/* ── DELETE CONFIRM ── */}
      {deleteId && (
        <View style={styles.overlay}>
          <BlurView intensity={50} tint="dark" style={styles.confirmCard}>
            <Ionicons name="trash-outline" size={36} color="#ef4444" />
            <Text style={styles.confirmTitle}>Delete Booking?</Text>
            <Text style={styles.confirmText}>This action cannot be undone.</Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setDeleteId(null)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleting}
                style={styles.confirmDeleteBtn}
              >
                <Text style={styles.confirmDeleteText}>
                  {deleting ? "Deleting…" : "Delete"}
                </Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      )}

      {/* ── ASSIGN STAFF MODAL ── */}
      <Modal
        visible={!!assignBookingId}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignBookingId(null)}
      >
        <View style={styles.overlay}>
          <BlurView intensity={40} tint="dark" style={styles.assignSheet}>
            <View style={styles.assignHeader}>
              <Text style={styles.assignTitle}>Assign Staff</Text>
              <Pressable onPress={() => setAssignBookingId(null)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </Pressable>
            </View>
            {staff.length === 0 ? (
              <Text style={styles.noStaffText}>
                No staff members available. Add staff from the Staff Management screen.
              </Text>
            ) : (
              staff.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => handleAssign(s.id)}
                  style={({ pressed }) => [
                    styles.staffOption,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.staffOptionAvatar}>
                    <Text style={styles.staffOptionAvatarText}>
                      {s.user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.staffOptionName}>{s.user.name}</Text>
                    <Text style={styles.staffOptionRole}>{s.role_title}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#475569"
                    style={{ marginLeft: "auto" }}
                  />
                </Pressable>
              ))
            )}
          </BlurView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },

  header: { marginBottom: 16 },
  eyebrow: { color: "#8b5cf6", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 2 },
  subtitle: { color: "#64748b", marginTop: 2 },

  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  filterChipActive: {
    backgroundColor: "rgba(139,92,246,0.25)",
    borderColor: "rgba(139,92,246,0.5)",
  },
  filterChipText: { color: "#64748b", fontSize: 13 },
  filterChipTextActive: { color: "#c4b5fd", fontWeight: "600" },

  card: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  bookingId: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sectorLabel: { color: "#64748b", fontSize: 12, marginTop: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  statusText: { fontSize: 11, fontWeight: "600" },

  infoRow: { gap: 5, marginBottom: 14 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { color: "#94a3b8", fontSize: 12 },

  statusFlow: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 14,
  },
  flowChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  flowChipText: { color: "#64748b", fontSize: 11 },

  actionsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
  },
  assignText: { color: "#a78bfa", fontSize: 12, fontWeight: "600" },
  nextBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#7c3aed",
    alignItems: "center",
  },
  nextText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { color: "#334155", fontSize: 15 },

  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmCard: {
    width: "82%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  confirmTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginTop: 12 },
  confirmText: { color: "#94a3b8", marginTop: 6, marginBottom: 20, textAlign: "center" },
  confirmActions: { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cancelText: { color: "#94a3b8", fontWeight: "600" },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  confirmDeleteText: { color: "#fff", fontWeight: "700" },

  /* Assign staff sheet */
  assignSheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  assignHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  assignTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  noStaffText: { color: "#64748b", textAlign: "center", padding: 20 },
  staffOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  staffOptionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(139,92,246,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  staffOptionAvatarText: { color: "#a78bfa", fontWeight: "bold" },
  staffOptionName: { color: "#fff", fontWeight: "600" },
  staffOptionRole: { color: "#64748b", fontSize: 12 },
  issueInvoiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  issueInvoiceText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
