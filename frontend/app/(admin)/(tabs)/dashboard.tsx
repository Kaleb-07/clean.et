import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import API, { apiFetch } from "../../../src/api/client";
import { useAuth } from "../../../contexts/AuthContext";

/* ─── TYPES ─────────────────────────────────────────────────────────────── */
interface Booking {
  id: number;
  status: string;
  price: number;
  currency?: string;
  booking_date?: string;
  booking_time?: string;
  address?: string;
  service?: { name: string; price: number };
  customer?: { id: number; name: string; phone?: string; email?: string };
  staff?: { id: number; name: string };
  tenant?: { id: number; business_name: string };
}

interface StaffMember {
  id: number;
  role_title: string;
  user?: { name: string; phone?: string };
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [servicesCount, setServicesCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Crew Assignment Modal State
  const [assignModal, setAssignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.role]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, cRes, stRes, srvRes] = await Promise.allSettled([
        apiFetch<any>("/bookings"),
        apiFetch<any>("/customers"),
        apiFetch<any>("/staff"),
        apiFetch<any>("/services"),
      ]);

      if (bRes.status === "fulfilled") setBookings(bRes.value?.data ?? bRes.value ?? []);
      if (cRes.status === "fulfilled") setCustomers(cRes.value?.data ?? cRes.value ?? []);
      if (stRes.status === "fulfilled") setStaff(stRes.value?.data ?? stRes.value ?? []);
      if (srvRes.status === "fulfilled") setServicesCount((srvRes.value?.data ?? srvRes.value ?? []).length);
    } catch (e) {
      console.log("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /* ─── ASSIGN CREW ─── */
  const handleAssignCrew = async () => {
    if (!selectedBooking || !selectedStaffId) {
      return Alert.alert("Select Crew", "Please select a field technician to assign.");
    }

    setAssigning(true);
    try {
      await API.post(`/bookings/${selectedBooking.id}/assign`, { staff_id: selectedStaffId });
      Alert.alert("🎉 Assigned", `Technician assigned to Job #${selectedBooking.id}!`);
      setAssignModal(false);
      setSelectedBooking(null);
      setSelectedStaffId(null);
      loadData();
    } catch (e: any) {
      Alert.alert("Assignment Error", e?.response?.data?.message || "Failed to assign crew member.");
    } finally {
      setAssigning(false);
    }
  };

  // Earnings calculations
  const totalRevenue = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + Number(b.price || b.service?.price || 0), 0);

  const activeJobsCount = bookings.filter((b) => b.status === "pending" || b.status === "in_progress").length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── TOP HEADER BAR ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isSuperAdmin ? "👑 Enterprise Governance Portal" : `🏢 ${user?.tenant?.business_name || "Service Division"}`}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? "Clean.et Executive Multi-Department Control"
              : `Logged in as ${user?.name || "Division Admin"} (${user?.email})`}
          </Text>
        </View>

        {isSuperAdmin && (
          <TouchableOpacity onPress={() => router.push("/(admin)/reports")} style={styles.iconBtn}>
            <Ionicons name="bar-chart-outline" size={18} color="#34D399" />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.push("/(admin)/notifications")} style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={18} color="#F472B6" />
        </TouchableOpacity>

        <TouchableOpacity onPress={loadData} style={styles.iconBtn}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} style={[styles.iconBtn, { backgroundColor: "#EF444422", borderColor: "#EF444455" }]}>
          <Ionicons name="log-out-outline" size={18} color="#F87171" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* ── DEPARTMENT HERO BANNER ── */}
        {!isSuperAdmin && (
          <LinearGradient colors={["#064E3B", "#047857"]} style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Operational Service Division</Text>
                <Text style={styles.heroValue}>
                  {user?.tenant?.business_name ? user.tenant.business_name.toUpperCase() : "CLEANING DIVISION"}
                </Text>
              </View>

              <View style={styles.activeStatusBadge}>
                <Ionicons name="ellipse" size={10} color="#34D399" />
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 11, marginLeft: 6 }}>
                  Division Active
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* ── OPERATIONAL METRICS HERO GRID ── */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Ionicons name="cash" size={20} color="#34D399" />
            </View>
            <Text style={styles.metricValue}>
              ETB {totalRevenue.toLocaleString("en-ET", { minimumFractionDigits: 0 })}
            </Text>
            <Text style={styles.metricLabel}>{isSuperAdmin ? "Total Enterprise GMV" : "Division Gross Earnings"}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: "#3B82F622" }]}>
              <Ionicons name="time" size={20} color="#60A5FA" />
            </View>
            <Text style={styles.metricValue}>{activeJobsCount}</Text>
            <Text style={styles.metricLabel}>Active Job Queue</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: "#A78BFA22" }]}>
              <Ionicons name="construct" size={20} color="#A78BFA" />
            </View>
            <Text style={styles.metricValue}>{staff.length}</Text>
            <Text style={styles.metricLabel}>{isSuperAdmin ? "Global Staff Roster" : "On-Duty Division Crew"}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: "#F59E0B22" }]}>
              <Ionicons name="cut" size={20} color="#FBBF24" />
            </View>
            <Text style={styles.metricValue}>{servicesCount}</Text>
            <Text style={styles.metricLabel}>Division Service Offerings</Text>
          </View>
        </View>

        {/* ── QUICK ACTION HUB TILE GRID ── */}
        <Text style={styles.sectionHeaderTitle}>
          {isSuperAdmin ? "👑 Enterprise Management Suite" : "⚡ Division Operations Control Hub"}
        </Text>

        <View style={styles.actionGrid}>
          {isSuperAdmin ? (
            <>
              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/tenants")}>
                <Ionicons name="business" size={22} color="#60A5FA" />
                <Text style={styles.actionTileTitle}>Divisions & Sectors</Text>
                <Text style={styles.actionTileSub}>Branch Governance & Payouts</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/system")}>
                <Ionicons name="hardware-chip" size={22} color="#F59E0B" />
                <Text style={styles.actionTileTitle}>System Operations</Text>
                <Text style={styles.actionTileSub}>Audits, Broadcasts & Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/invoices")}>
                <Ionicons name="card" size={22} color="#34D399" />
                <Text style={styles.actionTileTitle}>Financial Invoices</Text>
                <Text style={styles.actionTileSub}>Global Financial Status</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/staff")}>
                <Ionicons name="construct" size={22} color="#A78BFA" />
                <Text style={styles.actionTileTitle}>Manage Division Crew</Text>
                <Text style={styles.actionTileSub}>Add Techs & Certifications</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/services")}>
                <Ionicons name="cut" size={22} color="#FBBF24" />
                <Text style={styles.actionTileTitle}>Post Division Services</Text>
                <Text style={styles.actionTileSub}>Configure Offerings & Base Prices</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/customers")}>
            <Ionicons name="people" size={22} color="#34D399" />
            <Text style={styles.actionTileTitle}>Customer Directory</Text>
            <Text style={styles.actionTileSub}>Individual & Fleet Accounts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/(tabs)/bookings")}>
            <Ionicons name="calendar" size={22} color="#60A5FA" />
            <Text style={styles.actionTileTitle}>Dispatch Queue</Text>
            <Text style={styles.actionTileSub}>View & Assign Technicians</Text>
          </TouchableOpacity>

          {isSuperAdmin && (
            <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/broadcast")}>
              <Ionicons name="megaphone" size={22} color="#F59E0B" />
              <Text style={styles.actionTileTitle}>Broadcast Center</Text>
              <Text style={styles.actionTileSub}>Push & Email Announcements</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── LIVE BOOKINGS DISPATCH QUEUE ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>
            {isSuperAdmin ? "📋 Live Platform Booking Requests" : "📋 Incoming Division Job Queue"}
          </Text>
          <Text style={{ color: "#34D399", fontSize: 12, fontWeight: "700" }}>{bookings.length} Jobs</Text>
        </View>

        {loading && bookings.length === 0 ? (
          <ActivityIndicator color="#10B981" size="large" style={{ marginTop: 20 }} />
        ) : bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color="#475569" />
            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700", marginTop: 8 }}>No Active Orders</Text>
            <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
              Customer bookings for this division will appear here in real-time.
            </Text>
          </View>
        ) : (
          bookings.slice(0, 5).map((b, index) => (
            <Animated.View key={b.id} entering={FadeInDown.delay(index * 40)}>
              <View style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle}>
                      #{b.id} · {b.service?.name || "Service Clean"}
                    </Text>
                    <Text style={styles.jobCustomer}>
                      👤 {b.customer?.name || "Client"} {b.customer?.phone ? `(📞 ${b.customer.phone})` : ""}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.jobPrice}>
                      ETB {Number(b.price || b.service?.price || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{(b.status || "pending").toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                {/* Dispatch Detail Row */}
                <View style={styles.jobFooter}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobMeta}>
                      🗓️ {b.booking_date || "Today"} {b.booking_time ? `at ${b.booking_time}` : ""}
                    </Text>
                    <Text style={styles.jobMeta}>
                      👷 Crew: <Text style={{ color: b.staff ? "#34D399" : "#F87171", fontWeight: "700" }}>{b.staff?.name || "UNASSIGNED"}</Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.dispatchCrewBtn}
                    onPress={() => {
                      setSelectedBooking(b);
                      setSelectedStaffId(b.staff?.id || null);
                      setAssignModal(true);
                    }}
                  >
                    <Ionicons name="flash" size={14} color="#FFF" />
                    <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800", marginLeft: 4 }}>
                      ⚡ Assign Crew
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* ── ⚡ CREW ASSIGNMENT MODAL ── */}
      <Modal visible={assignModal} transparent animationType="slide" onRequestClose={() => setAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign Division Crew</Text>
                <Text style={{ color: "#34D399", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Job #{selectedBooking?.id} · {selectedBooking?.service?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: "#CBD5E1", fontSize: 12, marginBottom: 10 }}>
              Select an available technician to dispatch to client site:
            </Text>

            <ScrollView style={{ maxHeight: 280 }}>
              {staff.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 20 }}>
                  No technicians found on roster. Go to Staff screen to register crew.
                </Text>
              ) : (
                staff.map((s) => {
                  const staffName = s.user?.name || `Tech #${s.id}`;
                  const isSelected = selectedStaffId === s.id;
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
                        <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>{staffName}</Text>
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

              <TouchableOpacity style={styles.submitBtn} onPress={handleAssignCrew} disabled={assigning}>
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
    gap: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#F8FAFC" },
  headerSubtitle: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#334155", justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 18, borderRadius: 16, marginBottom: 16 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { fontSize: 12, color: "#DBEAFE", fontWeight: "500" },
  heroValue: { fontSize: 20, fontWeight: "800", color: "#FFF", marginTop: 2 },
  activeStatusBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  metricCard: { width: "48%", backgroundColor: "#1E293B", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#334155" },
  metricIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#10B98122", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  metricValue: { fontSize: 18, fontWeight: "800", color: "#FFF" },
  metricLabel: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 10 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: "800", color: "#F8FAFC", marginBottom: 10 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  actionTile: { width: "48%", backgroundColor: "#1E293B", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#334155" },
  actionTileTitle: { fontSize: 13, fontWeight: "800", color: "#FFF", marginTop: 8 },
  actionTileSub: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  jobCard: { backgroundColor: "#1E293B", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  jobHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  jobTitle: { fontSize: 14, fontWeight: "800", color: "#FFF" },
  jobCustomer: { fontSize: 12, color: "#CBD5E1", marginTop: 2 },
  jobPrice: { fontSize: 15, fontWeight: "800", color: "#34D399" },
  statusPill: { backgroundColor: "#10B98122", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusPillText: { fontSize: 10, color: "#34D399", fontWeight: "800" },
  jobFooter: { flexDirection: "row", alignItems: "center", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#334155" },
  jobMeta: { fontSize: 11, color: "#94A3B8" },
  dispatchCrewBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#059669", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  emptyCard: { backgroundColor: "#1E293B", borderRadius: 14, padding: 30, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 20, maxHeight: "90%", borderWidth: 1, borderColor: "#334155" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#F8FAFC" },
  staffSelectItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: "#334155", gap: 10 },
  staffSelectItemActive: { borderColor: "#10B981", backgroundColor: "#10B98115" },
  staffAvatarBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#A78BFA22", alignItems: "center", justifyContent: "center" },
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#059669", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
});
