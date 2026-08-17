import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
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
  tenant?: { id: number; business_name: string; plan?: string };
  sector?: { id?: number; name: string; category?: { name: string } };
  customer?: { name?: string; email?: string; phone?: string; user?: { name: string; phone: string } };
  staff?: { id: number; role_title: string; name?: string; phone?: string; user?: { name: string } };
  invoice_id?: number | null;
}

interface StaffMember {
  id: number;
  role_title: string;
  name?: string;
  phone?: string;
  tenant_id?: number;
  user?: { name: string; email?: string; phone?: string };
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
  pending:         { color: "#F59E0B", label: "Pending",         icon: "time-outline" },
  confirmed:       { color: "#10B981", label: "Confirmed",       icon: "checkmark-circle-outline" },
  driver_assigned: { color: "#3B82F6", label: "Driver Assigned", icon: "car-outline" },
  picked_up:       { color: "#8B5CF6", label: "Picked Up",       icon: "arrow-up-circle-outline" },
  in_progress:     { color: "#06B6D4", label: "In Progress",     icon: "refresh-circle-outline" },
  completed:       { color: "#34D399", label: "Completed",       icon: "checkmark-done-outline" },
  invoiced:        { color: "#A855F7", label: "Invoiced",        icon: "receipt-outline" },
  cancelled:       { color: "#EF4444", label: "Cancelled",       icon: "close-circle-outline" },
};

const FILTERS = [
  { key: "all",             label: "ALL" },
  { key: "pending",         label: "PENDING" },
  { key: "confirmed",       label: "CONFIRMED" },
  { key: "driver_assigned", label: "ASSIGNED" },
  { key: "in_progress",     label: "IN PROGRESS" },
  { key: "completed",       label: "COMPLETED" },
  { key: "cancelled",       label: "CANCELLED" },
];

function nextStatus(s: BookingStatus): BookingStatus | null {
  if (s === "cancelled" || s === "invoiced") return null;
  const idx = STATUS_FLOW.indexOf(s);
  const next = STATUS_FLOW[idx + 1];
  return next === "cancelled" ? null : next ?? null;
}

/* ─── SUPER ADMIN BOOKING DISPATCH CARD ──────────────────────────────────── */
function SuperAdminBookingCard({
  booking,
  onStatusChange,
  onEdit,
  onDelete,
  onAssignStaff,
  onIssueInvoice,
}: {
  booking: Booking;
  onStatusChange: (status: BookingStatus) => void;
  onEdit: () => void;
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
    : "Unscheduled";

  const customerName =
    booking.customer?.user?.name || booking.customer?.name || "Customer Account";
  const customerPhone =
    booking.customer?.user?.phone || booking.customer?.phone || "No phone";
  const staffName =
    booking.staff?.user?.name || booking.staff?.name || "Unassigned Crew";

  const tenantName = booking.tenant?.business_name || "Platform Direct";

  return (
    <Animated.View entering={FadeInDown}>
      <View style={styles.card}>
        {/* Top Header Row */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            {/* Tenant Company Pill */}
            <View style={styles.tenantPill}>
              <Ionicons name="business" size={12} color="#60A5FA" style={{ marginRight: 4 }} />
              <Text style={styles.tenantPillText}>{tenantName}</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Text style={styles.bookingId}>Booking #{booking.id}</Text>
              {booking.sector && (
                <View style={styles.sectorBadge}>
                  <Text style={styles.sectorBadgeText}>
                    {booking.sector.category?.name ? `${booking.sector.category.name} · ` : ""}
                    {booking.sector.name}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusPill, { backgroundColor: `${meta.color}22`, borderColor: `${meta.color}55` }]}>
            <Ionicons name={meta.icon as any} size={13} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
          </View>
        </View>

        {/* Customer & Technician Details Row */}
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={14} color="#60A5FA" style={{ marginRight: 6 }} />
            <Text style={styles.detailText}>
              <Text style={{ fontWeight: "700", color: "#FFF" }}>Customer:</Text> {customerName} ({customerPhone})
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="construct" size={14} color="#A78BFA" style={{ marginRight: 6 }} />
            <Text style={styles.detailText}>
              <Text style={{ fontWeight: "700", color: "#FFF" }}>Technician Crew:</Text>{" "}
              {booking.staff ? `${staffName} (${booking.staff.role_title || "Tech"})` : "⚠️ Unassigned Crew"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
            <Text style={styles.detailText}>
              <Text style={{ fontWeight: "700", color: "#FFF" }}>Scheduled Slot:</Text> {formattedDate}
            </Text>
          </View>
        </View>

        {/* Price & Status Stepper Row */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Dispatch Service Total:</Text>
          <Text style={styles.priceValue}>
            {booking.currency || "ETB"} {Number(booking.price ?? 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Status Stepper Selector Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFlow}
        >
          {STATUS_FLOW.filter((s) => s !== "cancelled").map((s) => {
            const isCurrent = s === booking.status;
            const m = STATUS_META[s];
            return (
              <TouchableOpacity
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
                    isCurrent && { color: "#FFF", fontWeight: "800" },
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Action Command Row */}
        <View style={styles.actionsRow}>
          {booking.status !== "cancelled" && (
            <TouchableOpacity onPress={onAssignStaff} style={styles.assignBtn}>
              <Ionicons name="person-add-outline" size={14} color="#A78BFA" />
              <Text style={styles.assignText}>⚡ Assign Crew</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
            <Ionicons name="create-outline" size={14} color="#FBBF24" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>

          {booking.status === "completed" && !booking.invoice_id ? (
            <TouchableOpacity onPress={onIssueInvoice} style={styles.issueInvoiceBtn}>
              <Ionicons name="receipt-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.issueInvoiceText}>Invoice</Text>
            </TouchableOpacity>
          ) : (
            next && (
              <TouchableOpacity onPress={() => onStatusChange(next)} style={styles.nextBtn}>
                <Text style={styles.nextText}>Advance ➔ {STATUS_META[next].label}</Text>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color="#F87171" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function AdminBookings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Assign Staff State
  const [assignBookingTarget, setAssignBookingTarget] = useState<Booking | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Edit Booking Modal State
  const [editBookingTarget, setEditBookingTarget] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    price: "",
    status: "pending" as BookingStatus,
    scheduled_at: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
      console.log("Error loading bookings data:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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

  const openEditModal = (b: Booking) => {
    setEditBookingTarget(b);
    setEditForm({
      price: String(b.price ?? ""),
      status: b.status,
      scheduled_at: b.scheduled_at ? b.scheduled_at.split("T")[0] : "",
    });
  };

  const handleSaveBookingEdit = async () => {
    if (!editBookingTarget) return;
    setIsSavingEdit(true);
    try {
      await API.patch(`/bookings/${editBookingTarget.id}/status`, { status: editForm.status });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === editBookingTarget.id
            ? { ...b, price: parseFloat(editForm.price) || b.price, status: editForm.status }
            : b
        )
      );
      setEditBookingTarget(null);
      Alert.alert("Updated", `Booking #${editBookingTarget.id} updated successfully!`);
    } catch (err: any) {
      Alert.alert("Update Error", err?.response?.data?.message || "Failed to update booking.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await API.delete(`/bookings/${deleteId}`);
      setBookings((prev) => prev.filter((b) => b.id !== deleteId));
      setDeleteId(null);
      Alert.alert("Deleted", `Booking #${deleteId} removed successfully.`);
    } catch {
      Alert.alert("Error", "Failed to delete booking.");
    } finally {
      setDeleting(false);
    }
  };

  const handleAssign = async (staffId: number) => {
    if (!assignBookingTarget) return;
    setIsAssigning(true);
    try {
      const res = await API.post(`/bookings/${assignBookingTarget.id}/assign`, { staff_id: staffId });
      const updatedBooking = res.data.data || res.data;
      setBookings((prev) =>
        prev.map((b) => (b.id === assignBookingTarget.id ? { ...b, ...updatedBooking, status: "driver_assigned" } : b))
      );
      setAssignBookingTarget(null);
      Alert.alert("🎉 Assigned!", "Technician crew assigned to booking!");
    } catch (err: any) {
      Alert.alert(
        "Assignment Error",
        err?.response?.data?.message ?? "Failed to assign staff crew."
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleIssueInvoice = async (bookingId: number) => {
    try {
      await API.post(`/admin/invoices/generate/${bookingId}`);
      await loadData();
      Alert.alert("Success", `Invoice generated for Booking #${bookingId}.`);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to generate invoice.");
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesFilter = filter === "all" || b.status === filter;
    const bId = `booking #${b.id}`.toLowerCase();
    const custName = (b.customer?.user?.name || b.customer?.name || "").toLowerCase();
    const tenantName = (b.tenant?.business_name || "").toLowerCase();
    const staffName = (b.staff?.user?.name || b.staff?.name || "").toLowerCase();
    const sectorName = (b.sector?.name || "").toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      bId.includes(q) ||
      custName.includes(q) ||
      tenantName.includes(q) ||
      staffName.includes(q) ||
      sectorName.includes(q);

    return matchesFilter && matchesSearch;
  });

  const inProgressCount = bookings.filter((b) => b.status === "in_progress").length;
  const unassignedCount = bookings.filter((b) => b.status === "pending" || !b.staff).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(admin)/(tabs)/dashboard");
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Global Dispatch Command</Text>
          <Text style={styles.subtitle}>
            {bookings.length} Total Cross-Tenant Bookings Registered
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* ── Global Dispatch Hero Bar ── */}
        <LinearGradient colors={["#1E1B4B", "#312E81"]} style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Super Admin Global Dispatch Monitoring</Text>
              <Text style={styles.heroValue}>{bookings.length} Active Bookings</Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="compass" size={24} color="#60A5FA" />
            </View>
          </View>

          <View style={styles.heroSubRow}>
            <View style={styles.subStatPill}>
              <Text style={styles.subStatLabel}>In Progress Servicing:</Text>
              <Text style={styles.subStatValue}>{inProgressCount} Jobs</Text>
            </View>

            {unassignedCount > 0 && (
              <View style={[styles.subStatPill, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}>
                <Text style={[styles.subStatLabel, { color: "#FBBF24" }]}>
                  ⚠️ {unassignedCount} Needs Crew
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ── Search Input ── */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Booking #, Tenant, Customer, or Tech..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Status Filter Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((item) => {
            const isActive = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Bookings List ── */}
        {loading && bookings.length === 0 ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} size="large" />
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? "Try refining your search term." : "No bookings registered under this filter status."}
            </Text>
          </View>
        ) : (
          filteredBookings.map((b) => (
            <SuperAdminBookingCard
              key={b.id}
              booking={b}
              onStatusChange={(newSt) => updateStatus(b.id, newSt)}
              onEdit={() => openEditModal(b)}
              onDelete={() => setDeleteId(b.id)}
              onAssignStaff={() => setAssignBookingTarget(b)}
              onIssueInvoice={() => handleIssueInvoice(b.id)}
            />
          ))
        )}
      </ScrollView>

      {/* ── ⚡ FUNCTIONAL TECHNICIAN CREW ASSIGNMENT MODAL ── */}
      <Modal visible={!!assignBookingTarget} transparent animationType="fade" onRequestClose={() => setAssignBookingTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>⚡ Assign Technician Crew</Text>
                <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Booking #{assignBookingTarget?.id} · {assignBookingTarget?.tenant?.business_name || "Platform Direct"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssignBookingTarget(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {isAssigning ? (
                <View style={{ paddingVertical: 30, alignItems: "center" }}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 8 }}>Assigning crew member to dispatch...</Text>
                </View>
              ) : staff.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 20 }}>
                  No active technician staff crew registered in platform.
                </Text>
              ) : (
                staff.map((s) => {
                  const isTenantMatch = assignBookingTarget?.tenant?.id && s.tenant_id === assignBookingTarget.tenant.id;
                  const staffDisplayName = s.user?.name || s.name || `Staff #${s.id}`;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.staffSelectItem, isTenantMatch && { borderColor: "#3B82F6", backgroundColor: "#3B82F615" }]}
                      onPress={() => handleAssign(s.id)}
                    >
                      <Ionicons name="person-circle" size={34} color={isTenantMatch ? "#60A5FA" : "#A78BFA"} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>
                            {staffDisplayName}
                          </Text>
                          {isTenantMatch && (
                            <View style={{ backgroundColor: "#3B82F633", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ color: "#60A5FA", fontSize: 9, fontWeight: "800" }}>COMPANY CREW</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                          Role: {s.role_title || "Field Technician"} · {s.user?.phone || s.phone || "No phone"}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color="#10B981" />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setAssignBookingTarget(null)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── ✏️ EDIT BOOKING DETAILS MODAL (WHEN TENANT ADMIN UNAVAILABLE) ── */}
      <Modal visible={!!editBookingTarget} transparent animationType="fade" onRequestClose={() => setEditBookingTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Booking #{editBookingTarget?.id}</Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  Super Admin override for tenant: {editBookingTarget?.tenant?.business_name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditBookingTarget(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Service Price Total (ETB)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={editForm.price}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, price: val }))}
                />
              </View>

              <Text style={styles.inputLabel}>Update Booking Status</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {STATUS_FLOW.map((st) => {
                  const isSel = editForm.status === st;
                  const m = STATUS_META[st];
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusOptionBtn,
                        isSel && { backgroundColor: m.color, borderColor: m.color },
                      ]}
                      onPress={() => setEditForm((p) => ({ ...p, status: st }))}
                    >
                      <Text style={[styles.statusOptionText, isSel && { color: "#FFF", fontWeight: "800" }]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setEditBookingTarget(null)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteModalBtn, { backgroundColor: "#2563EB" }, isSavingEdit && { opacity: 0.7 }]}
                onPress={handleSaveBookingEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>Save Override</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <Modal visible={!!deleteId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: "#EF4444" }]}>
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <Ionicons name="warning-outline" size={36} color="#EF4444" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFF", textAlign: "center" }}>
                Delete Booking #{deleteId}?
              </Text>
              <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                This will permanently erase this booking record and its dispatch assignment.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setDeleteId(null)}
                disabled={deleting}
              >
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteModalBtn, deleting && { opacity: 0.7 }]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>🗑️ Yes, Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#F8FAFC" },
  subtitle: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  refreshBtn: { padding: 6 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 18, borderRadius: 16, marginBottom: 16 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { fontSize: 12, color: "#DBEAFE", fontWeight: "500" },
  heroValue: { fontSize: 24, fontWeight: "800", color: "#FFF", marginTop: 4 },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.3)",
  },
  heroSubRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  subStatPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subStatLabel: { fontSize: 11, color: "#CBD5E1", marginRight: 4 },
  subStatValue: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchInput: { flex: 1, color: "#F8FAFC", marginLeft: 8, fontSize: 13 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterChipActive: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  filterText: { fontSize: 11, color: "#94A3B8", fontWeight: "700" },
  filterTextActive: { color: "#FFF" },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  tenantPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F622",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#3B82F644",
  },
  tenantPillText: { fontSize: 11, fontWeight: "700", color: "#60A5FA" },
  bookingId: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  sectorBadge: { backgroundColor: "#334155", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sectorBadgeText: { fontSize: 10, color: "#34D399", fontWeight: "700" },
  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, gap: 4 },
  statusText: { fontSize: 10, fontWeight: "800" },
  detailsBox: { backgroundColor: "#0F172A", borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: "#334155", gap: 4 },
  detailRow: { flexDirection: "row", alignItems: "center" },
  detailText: { fontSize: 12, color: "#CBD5E1" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  priceLabel: { fontSize: 12, color: "#94A3B8" },
  priceValue: { fontSize: 15, fontWeight: "800", color: "#34D399" },
  statusFlow: { flexDirection: "row", gap: 6, marginTop: 10 },
  flowChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  flowChipText: { fontSize: 10, color: "#94A3B8" },
  actionsRow: { flexDirection: "row", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#334155", gap: 6, alignItems: "center" },
  assignBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF622", borderColor: "#8B5CF655", borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  assignText: { color: "#A78BFA", fontSize: 11, fontWeight: "700", marginLeft: 4 },
  editBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F59E0B22", borderColor: "#F59E0B55", borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  editText: { color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 },
  issueInvoiceBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#059669", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  issueInvoiceText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  nextBtn: { backgroundColor: "#2563EB", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  nextText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  deleteBtn: { padding: 6, marginLeft: "auto" },
  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#F8FAFC", marginTop: 10 },
  emptySub: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 20, maxHeight: "90%", borderWidth: 1, borderColor: "#334155" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#F8FAFC" },
  staffSelectItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: "#334155" },
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  deleteModalBtn: { flex: 1, backgroundColor: "#EF4444", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#CBD5E1", marginBottom: 6 },
  textInput: { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155" },
  statusOptionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  statusOptionText: { fontSize: 11, color: "#94A3B8" },
});
