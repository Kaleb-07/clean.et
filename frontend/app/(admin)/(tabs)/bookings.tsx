import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import API from "../../../src/api/client";
import { useAuth } from "../../../contexts/AuthContext";

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
  booking_date?: string;
  booking_time?: string;
  address?: string;
  service?: { name: string; price: number; sub_center?: string };
  tenant?: { id: number; business_name: string; plan?: string };
  customer?: { name?: string; email?: string; phone?: string; user?: { name?: string; phone?: string; email?: string } };
  staff?: { id: number; role_title: string; name?: string; phone?: string; user?: { name: string } };
}

interface StaffMember {
  id: number;
  role_title: string;
  user?: { name: string; phone?: string };
}

export default function AdminBookings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [subCenterFilter, setSubCenterFilter] = useState<string>("ALL");
  const [assignModal, setAssignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "danger" } | null>(null);
  const [inspectBooking, setInspectBooking] = useState<Booking | null>(null);

  const triggerNotification = (message: string, type: "success" | "danger" = "success") => {
    setNotification({ message, type });
    Alert.alert(type === "success" ? "Success" : "Notification", message);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.allSettled([
        API.get("/bookings"),
        API.get("/staff"),
      ]);

      if (bRes.status === "fulfilled") setBookings(bRes.value.data?.data ?? bRes.value.data ?? []);
      if (sRes.status === "fulfilled") setStaff(sRes.value.data?.data ?? sRes.value.data ?? []);
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

  const handleAssignCrew = async () => {
    if (!selectedBooking || !selectedStaffId) {
      triggerNotification("Please select a field technician from roster.", "danger");
      return;
    }

    setAssigning(true);
    try {
      await API.post(`/bookings/${selectedBooking.id}/assign`, { staff_id: selectedStaffId });
      const assignedTech = staff.find((s) => s.id === selectedStaffId);
      const techName = assignedTech?.user?.name || `Tech #${selectedStaffId}`;
      triggerNotification(`⚡ Crew "${techName}" dispatched to Booking #${selectedBooking.id}!`, "success");
      setAssignModal(false);
      setSelectedBooking(null);
      setSelectedStaffId(null);
      loadData();
    } catch (e: any) {
      triggerNotification(`Assignment Error: ${e?.response?.data?.message || "Failed to assign crew member."}`, "danger");
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (bookingId: number, newStatus: string) => {
    try {
      await API.patch(`/bookings/${bookingId}/status`, { status: newStatus });
      triggerNotification(`Status updated: Job #${bookingId} is now ${newStatus.toUpperCase().replace("_", " ")}!`, "success");
      loadData();
    } catch (e: any) {
      triggerNotification(`Status Error: ${e?.response?.data?.message || "Failed to update job status."}`, "danger");
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const statusMatch = filterStatus === "ALL" || (b.status || "").toLowerCase() === filterStatus.toLowerCase();
    const subCenter = (b.service as any)?.sub_center || "";
    const subCenterMatch = subCenterFilter === "ALL" || subCenter === subCenterFilter;
    return statusMatch && subCenterMatch;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── HEADER ── */}
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
          <Text style={styles.headerTitle}>
            {isSuperAdmin ? "👑 Platform Global Dispatch" : "⚡ Company Job Dispatch Center"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? `${bookings.length} Multi-Tenant Platform Bookings`
              : `${bookings.length} Incoming Jobs for ${user?.tenant?.business_name || "Company"}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Ionicons name="refresh" size={18} color={isSuperAdmin ? "#60A5FA" : "#34D399"} />
        </TouchableOpacity>
      </View>

      {/* ── 🔔 ACTION NOTIFICATION TOAST BANNER ── */}
      {notification && (
        <Animated.View entering={FadeInDown} style={[styles.toastBanner, notification.type === "danger" ? styles.toastBannerDanger : styles.toastBannerSuccess]}>
          <Ionicons name={notification.type === "danger" ? "alert-circle" : "checkmark-circle"} size={20} color="#FFF" />
          <Text style={styles.toastText}>{notification.message}</Text>
          <TouchableOpacity onPress={() => setNotification(null)}>
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isSuperAdmin ? "#3B82F6" : "#10B981"} />
        }
      >
        {/* ── HERO BANNER ── */}
        <LinearGradient
          colors={isSuperAdmin ? ["#1E1B4B", "#312E81"] : ["#064E3B", "#047857"]}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>
                {isSuperAdmin ? "Platform Dispatch Command Queue" : "Company Field Dispatch & Fulfillment"}
              </Text>
              <Text style={styles.heroValue}>{bookings.length} Total Job Orders</Text>
            </View>
            <View style={[styles.heroIconBox, !isSuperAdmin && { backgroundColor: "rgba(52, 211, 153, 0.2)", borderColor: "rgba(52, 211, 153, 0.4)" }]}>
              <Ionicons name="calendar" size={24} color="#34D399" />
            </View>
          </View>
        </LinearGradient>

        {/* ── 🏢 SUB-CENTER BRANCH FILTERS ── */}
        {!isSuperAdmin && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[
                { id: "ALL", label: "ALL SUB-CENTERS" },
                { id: "corporate-fleet", label: "🚛 Fleet Wash" },
                { id: "mobile-doorstep", label: "🏠 Doorstep Rig" },
                { id: "valet-pickup", label: "🚗 Valet Pickup" },
                { id: "bay-wash", label: "🧼 Station Bay" },
                { id: "exterior-facade", label: "🏙️ Facade Glass" },
                { id: "interior-deep", label: "🧹 Deep Sanitizer" },
              ].map((sub) => {
                const isSel = subCenterFilter === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => setSubCenterFilter(sub.id)}
                    style={[
                      styles.subCenterTab,
                      isSel && styles.subCenterTabActive,
                    ]}
                  >
                    <Text style={[styles.subCenterTabText, isSel && styles.subCenterTabTextActive]}>
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ── STATUS FILTER TABS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["ALL", "pending", "in_progress", "completed", "cancelled"].map((st) => {
              const isSel = filterStatus === st;
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => setFilterStatus(st)}
                  style={[
                    styles.filterTab,
                    isSel && styles.filterTabActive,
                    isSel && !isSuperAdmin && { backgroundColor: "#059669", borderColor: "#10B981" },
                  ]}
                >
                  <Text style={[styles.filterTabText, isSel && styles.filterTabTextActive]}>
                    {st.toUpperCase().replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ── BOOKINGS LIST ── */}
        {loading && bookings.length === 0 ? (
          <ActivityIndicator color={isSuperAdmin ? "#3B82F6" : "#10B981"} size="large" style={{ marginTop: 40 }} />
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>No Jobs Found</Text>
            <Text style={styles.emptySub}>No bookings match the selected status & sub-center filters.</Text>
          </View>
        ) : (
          filteredBookings.map((b, index) => {
            const customerName = b.customer?.name || b.customer?.user?.name || "Client";
            const customerPhone = b.customer?.phone || b.customer?.user?.phone || "";
            const staffName = b.staff?.name || b.staff?.user?.name || "UNASSIGNED";
            const serviceName = b.service?.name || "Service Clean";
            const price = b.price || b.service?.price || 0;
            const subCenterTag = (b.service as any)?.sub_center ? (b.service as any).sub_center.replace("-", " ").toUpperCase() : null;

            return (
              <Animated.View key={b.id} entering={FadeInDown.delay(index * 30)}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => setInspectBooking(b)} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobTitle}>#{b.id} · {serviceName}</Text>
                      {subCenterTag && (
                        <View style={{ alignSelf: "flex-start", backgroundColor: "#10B98122", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginVertical: 4, borderWidth: 1, borderColor: "#10B98155" }}>
                          <Text style={{ color: "#34D399", fontSize: 9, fontWeight: "800" }}>🏢 {subCenterTag}</Text>
                        </View>
                      )}
                      <Text style={styles.jobCustomer}>👤 {customerName} {customerPhone ? `(📞 ${customerPhone})` : ""}</Text>
                      {b.address && <Text style={styles.jobAddress}>📍 {b.address}</Text>}
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.jobPrice}>ETB {Number(price).toLocaleString("en-ET", { minimumFractionDigits: 2 })}</Text>
                      <View style={[styles.statusPill, !isSuperAdmin && { backgroundColor: "#10B98122", borderColor: "#10B98155" }]}>
                        <Text style={[styles.statusPillText, !isSuperAdmin && { color: "#34D399" }]}>{(b.status || "pending").toUpperCase().replace("_", " ")}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobMeta}>🗓️ {b.booking_date || "Today"} {b.booking_time ? `at ${b.booking_time}` : ""}</Text>
                      <Text style={styles.jobMeta}>
                        👷 Crew: <Text style={{ color: b.staff ? "#34D399" : "#F87171", fontWeight: "700" }}>{staffName}</Text>
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.miniBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F655" }]}
                        onPress={() => setInspectBooking(b)}
                      >
                        <Ionicons name="eye-outline" size={14} color="#60A5FA" />
                        <Text style={[styles.miniBtnText, { color: "#60A5FA" }]}>Inspect</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.miniBtn, !isSuperAdmin && { backgroundColor: "#059669" }]}
                        onPress={() => {
                          setSelectedBooking(b);
                          setSelectedStaffId(b.staff?.id || null);
                          setAssignModal(true);
                        }}
                      >
                        <Ionicons name="flash" size={14} color="#FFF" />
                        <Text style={styles.miniBtnText}>Dispatch</Text>
                      </TouchableOpacity>

                      {b.status !== "completed" && (
                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: "#10B981" }]}
                          onPress={() => handleUpdateStatus(b.id, "completed")}
                        >
                          <Ionicons name="checkmark-done" size={14} color="#FFF" />
                          <Text style={styles.miniBtnText}>Complete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* ── 👁️ INSPECT BOOKING MODAL ── */}
      <Modal visible={!!inspectBooking} transparent animationType="fade" onRequestClose={() => setInspectBooking(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Order Inspection #{inspectBooking?.id}</Text>
                <Text style={{ color: isSuperAdmin ? "#60A5FA" : "#34D399", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Status: {(inspectBooking?.status || "pending").toUpperCase().replace("_", " ")}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectBooking(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Service Offering</Text>
                <Text style={styles.detailValue}>{inspectBooking?.service?.name || "Service Clean"}</Text>
                {(inspectBooking?.service as any)?.sub_center && (
                  <Text style={{ color: "#34D399", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                    🏢 Sub-Center: {(inspectBooking?.service as any).sub_center.replace("-", " ").toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Client Account Details</Text>
                <Text style={styles.detailValue}>
                  👤 {inspectBooking?.customer?.name || inspectBooking?.customer?.user?.name || "Client Account"}
                </Text>
                <Text style={{ color: "#CBD5E1", fontSize: 12, marginTop: 2 }}>
                  📞 {inspectBooking?.customer?.phone || inspectBooking?.customer?.user?.phone || "No phone listed"}
                </Text>
                <Text style={{ color: "#CBD5E1", fontSize: 12, marginTop: 1 }}>
                  ✉️ {inspectBooking?.customer?.email || inspectBooking?.customer?.user?.email || "No email listed"}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Fulfillment Schedule & Location</Text>
                <Text style={styles.detailValue}>
                  🗓️ {inspectBooking?.booking_date || "Today"} {inspectBooking?.booking_time ? `at ${inspectBooking?.booking_time}` : ""}
                </Text>
                <Text style={{ color: "#CBD5E1", fontSize: 12, marginTop: 2 }}>
                  📍 {inspectBooking?.address || "On-Site Service Station"}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Assigned Field Crew</Text>
                <Text style={styles.detailValue}>
                  👷 {inspectBooking?.staff?.name || inspectBooking?.staff?.user?.name || "UNASSIGNED FIELD CREW"}
                </Text>
                {inspectBooking?.staff?.role_title && (
                  <Text style={{ color: "#A78BFA", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                    💼 Designation: {inspectBooking.staff.role_title}
                  </Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Order Financial Total</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#34D399", marginTop: 2 }}>
                  ETB {Number(inspectBooking?.price || inspectBooking?.service?.price || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setInspectBooking(null)}>
                <Text style={styles.closeBtnText}>Close Inspection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, !isSuperAdmin && { backgroundColor: "#059669" }]}
                onPress={() => {
                  setSelectedBooking(inspectBooking);
                  setSelectedStaffId(inspectBooking?.staff?.id || null);
                  setInspectBooking(null);
                  setAssignModal(true);
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 12 }}>⚡ Dispatch Crew</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── ⚡ CREW ASSIGNMENT MODAL ── */}
      <Modal visible={assignModal} transparent animationType="slide" onRequestClose={() => setAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Dispatch Field Crew</Text>
                <Text style={{ color: isSuperAdmin ? "#60A5FA" : "#34D399", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Booking #{selectedBooking?.id} · {selectedBooking?.service?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: "#CBD5E1", fontSize: 12, marginBottom: 10 }}>
              Select available technician from company roster:
            </Text>

            <ScrollView style={{ maxHeight: 280 }}>
              {staff.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 20 }}>
                  No technicians on roster. Go to Staff screen to register crew.
                </Text>
              ) : (
                staff.map((s) => {
                  const staffName = s.user?.name || `Tech #${s.id}`;
                  const isSelected = selectedStaffId === s.id;
                  const avail = (s as any).availability_status || "available";
                  const availLabel = avail === "on_job" ? "🔵 On Job" : avail === "off_duty" ? "🔴 Off Duty" : "🟢 Available";
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedStaffId(s.id)}
                      style={[styles.staffSelectItem, isSelected && styles.staffSelectItemActive]}
                    >
                      <View style={styles.staffAvatarBox}>
                        <Text style={{ color: "#A78BFA", fontWeight: "800" }}>{staffName.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>{staffName}</Text>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: avail === "off_duty" ? "#F87171" : avail === "on_job" ? "#60A5FA" : "#34D399" }}>
                            {availLabel}
                          </Text>
                        </View>
                        <Text style={{ color: "#94A3B8", fontSize: 11 }}>💼 {s.role_title || "Field Tech"}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={isSelected ? "#10B981" : "#64748B"}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setAssignModal(false)} disabled={assigning}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitBtn, !isSuperAdmin && { backgroundColor: "#059669" }]} onPress={handleAssignCrew} disabled={assigning}>
                {assigning ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: "800" }}>Confirm Crew Dispatch</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#F8FAFC" },
  headerSubtitle: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
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
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  filterTab: { backgroundColor: "#1E293B", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  filterTabActive: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  filterTabText: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  filterTabTextActive: { color: "#FFF" },
  card: { backgroundColor: "#1E293B", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#334155" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  jobTitle: { fontSize: 14, fontWeight: "800", color: "#FFF" },
  jobCustomer: { fontSize: 12, color: "#CBD5E1", marginTop: 2 },
  jobAddress: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  jobPrice: { fontSize: 15, fontWeight: "800", color: "#34D399" },
  statusPill: { backgroundColor: "#3B82F622", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, borderWidth: 1, borderColor: "#3B82F655" },
  statusPillText: { fontSize: 10, color: "#60A5FA", fontWeight: "800" },
  cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#334155" },
  jobMeta: { fontSize: 11, color: "#94A3B8" },
  miniBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#2563EB", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  miniBtnText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#F8FAFC", marginTop: 10 },
  emptySub: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 20, maxHeight: "90%", borderWidth: 1, borderColor: "#334155" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#F8FAFC" },
  staffSelectItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: "#334155", gap: 10 },
  staffSelectItemActive: { borderColor: "#10B981", backgroundColor: "#10B98115" },
  staffAvatarBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#A78BFA22", alignItems: "center", justifyContent: "center" },
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  subCenterTab: { backgroundColor: "#0F172A", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  subCenterTabActive: { backgroundColor: "#059669", borderColor: "#34D399" },
  subCenterTabText: { color: "#94A3B8", fontSize: 10, fontWeight: "700" },
  subCenterTabTextActive: { color: "#FFF", fontWeight: "800" },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    gap: 10,
    elevation: 3,
  },
  toastBannerSuccess: {
    backgroundColor: "#059669",
  },
  toastBannerDanger: {
    backgroundColor: "#DC2626",
  },
  toastText: {
    flex: 1,
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  detailSection: { backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  detailLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase" },
  detailValue: { fontSize: 13, fontWeight: "700", color: "#F8FAFC", marginTop: 2 },
});
