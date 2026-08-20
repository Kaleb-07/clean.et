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
  TextInput,
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
  tenant?: { id: number; business_name: string; plan: string };
}

interface StaffMember {
  id: number;
  role_title: string;
  user?: { name: string; phone?: string };
}

interface SubscriptionStatus {
  current_plan: string;
  pending_request?: { id: number; plan_id: string; created_at: string } | null;
}

const DEFAULT_SUPER_ADMIN_PLANS = [
  { id: "growth", name: "Growth Tier (8% Commission Fee)", fee: 1500, desc: "Multi-Sector Enabled, Automated Dispatch Queue, Customer Fleet Accounts" },
  { id: "enterprise", name: "Enterprise Core (10% Commission Fee)", fee: 3500, desc: "Full Multi-Sector Schemas, IRATA Rope Access High-Rise, Unlimited Staff & Priority Support" },
];

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [servicesCount, setServicesCount] = useState(0);
  const [analytics, setAnalytics] = useState<any>(null);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>(DEFAULT_SUPER_ADMIN_PLANS);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Crew Assignment Modal State
  const [assignModal, setAssignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Subscription Upgrade Application Modal State
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [targetPlan, setTargetPlan] = useState("growth");
  const [upgradeNotes, setUpgradeNotes] = useState("");
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.role]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Super Admin configured settings & plans
      const settingsRes = await apiFetch<any>("/super-admin/settings").catch(() => null);
      if (settingsRes?.data?.subscription_plans && settingsRes.data.subscription_plans.length > 0) {
        const configured = settingsRes.data.subscription_plans.map((p: any) => ({
          id: p.id,
          name: `${p.name} (${p.commission || 8}% Fee)`,
          fee: p.monthlyFee || 0,
          desc: p.features ? p.features.join(" · ") : p.staffLimit || "Configured by Super Admin",
        }));
        setAvailablePlans(configured);
      }

      if (isSuperAdmin) {
        // Super Admin load
        const [bRes, cRes, stRes, saRes, srvRes, subReqRes] = await Promise.allSettled([
          apiFetch<any>("/bookings"),
          apiFetch<any>("/customers"),
          apiFetch<any>("/staff"),
          apiFetch<any>("/super-admin/analytics"),
          apiFetch<any>("/services"),
          apiFetch<any>("/super-admin/subscription-requests"),
        ]);

        if (bRes.status === "fulfilled") setBookings(bRes.value?.data ?? bRes.value ?? []);
        if (cRes.status === "fulfilled") setCustomers(cRes.value?.data ?? cRes.value ?? []);
        if (stRes.status === "fulfilled") setStaff(stRes.value?.data ?? stRes.value ?? []);
        if (saRes.status === "fulfilled") setAnalytics(saRes.value?.data ?? saRes.value);
        if (srvRes.status === "fulfilled") setServicesCount((srvRes.value?.data ?? srvRes.value ?? []).length);
        if (subReqRes.status === "fulfilled") {
          const reqs = subReqRes.value?.data ?? subReqRes.value ?? [];
          setPendingRequests(reqs.filter((r: any) => r.status === "pending"));
        }
      } else {
        // Tenant Admin load (Scoped to Tenant)
        const [bRes, cRes, stRes, srvRes, subStatusRes] = await Promise.allSettled([
          apiFetch<any>("/bookings"),
          apiFetch<any>("/customers"),
          apiFetch<any>("/staff"),
          apiFetch<any>("/services"),
          apiFetch<any>("/tenant/subscription-status"),
        ]);

        if (bRes.status === "fulfilled") setBookings(bRes.value?.data ?? bRes.value ?? []);
        if (cRes.status === "fulfilled") setCustomers(cRes.value?.data ?? cRes.value ?? []);
        if (stRes.status === "fulfilled") setStaff(stRes.value?.data ?? stRes.value ?? []);
        if (srvRes.status === "fulfilled") setServicesCount((srvRes.value?.data ?? srvRes.value ?? []).length);
        if (subStatusRes.status === "fulfilled") setSubStatus(subStatusRes.value);
      }
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
      Alert.alert("🎉 Assigned", `Technician assigned to Booking #${selectedBooking.id}!`);
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

  /* ─── SUBMIT SUBSCRIPTION UPGRADE REQUEST ─── */
  const handleApplySubscriptionUpgrade = async () => {
    setSubmittingUpgrade(true);
    try {
      await API.post("/tenant/subscription-request", {
        plan_id: targetPlan,
        notes: upgradeNotes.trim() || `Requesting upgrade to ${targetPlan} plan tier.`,
      });

      Alert.alert(
        "⏳ Application Submitted",
        "Your subscription upgrade request has been submitted to the Super Admin for approval!"
      );
      setUpgradeModal(false);
      setUpgradeNotes("");
      loadData();
    } catch (e: any) {
      Alert.alert("Submission Error", e?.response?.data?.message || "Failed to submit upgrade application.");
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  /* ─── SUPER ADMIN APPROVE / REJECT REQUEST ─── */
  const handleReviewRequest = async (requestId: number, action: "approve" | "reject") => {
    try {
      await API.patch(`/super-admin/subscription-requests/${requestId}/${action}`);
      Alert.alert("Success", `Subscription request ${action}d successfully!`);
      loadData();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to review request.");
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
            {isSuperAdmin ? "👑 Super Admin Portal" : `🏢 ${user?.tenant?.business_name || "Company Operations"}`}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? "Platform Governance & Multi-Tenant Control"
              : `Logged in as ${user?.name || "Company Admin"} (${user?.email})`}
          </Text>
        </View>

        <TouchableOpacity onPress={loadData} style={styles.iconBtn}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} style={[styles.iconBtn, { backgroundColor: "#EF444422", borderColor: "#EF444455" }]}>
          <Ionicons name="log-out-outline" size={18} color="#F87171" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {/* ── SUPER ADMIN PENDING SUBSCRIPTION NOTIFICATION BANNER ── */}
        {isSuperAdmin && pendingRequests.length > 0 && (
          <Animated.View entering={FadeInDown} style={styles.alertBanner}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "800" }}>
                {pendingRequests.length} Pending Tenant Subscription Applications
              </Text>
            </View>

            {pendingRequests.map((req) => (
              <View key={req.id} style={styles.alertReqCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>
                    🏢 {req.tenant?.business_name || `Tenant #${req.tenant_id}`}
                  </Text>
                  <Text style={{ color: "#CBD5E1", fontSize: 11, marginTop: 2 }}>
                    Applied for <Text style={{ color: "#60A5FA", fontWeight: "800" }}>{req.plan_id.toUpperCase()} Tier</Text>
                  </Text>
                  {req.notes && <Text style={{ color: "#94A3B8", fontSize: 10, marginTop: 2 }}>"{req.notes}"</Text>}
                </View>

                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.miniApproveBtn, { backgroundColor: "#10B981" }]}
                    onPress={() => handleReviewRequest(req.id, "approve")}
                  >
                    <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>✓ Approve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.miniApproveBtn, { backgroundColor: "#EF4444" }]}
                    onPress={() => handleReviewRequest(req.id, "reject")}
                  >
                    <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>✕ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── TENANT ADMIN SUBSCRIPTION STATUS BANNER ── */}
        {!isSuperAdmin && (
          <LinearGradient colors={["#1E1B4B", "#312E81"]} style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Company Subscription Plan</Text>
                <Text style={styles.heroValue}>
                  {(subStatus?.current_plan || user?.tenant?.plan || "starter").toUpperCase()} TIER
                </Text>
              </View>

              <TouchableOpacity style={styles.upgradePlanBtn} onPress={() => setUpgradeModal(true)}>
                <Ionicons name="sparkles" size={14} color="#FFF" />
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 12, marginLeft: 4 }}>
                  Apply for Upgrade
                </Text>
              </TouchableOpacity>
            </View>

            {subStatus?.pending_request && (
              <View style={styles.pendingBadge}>
                <Ionicons name="time-outline" size={14} color="#FBBF24" />
                <Text style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                  ⏳ Request for {subStatus.pending_request.plan_id.toUpperCase()} Tier is Pending Super Admin Approval
                </Text>
              </View>
            )}
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
            <Text style={styles.metricLabel}>{isSuperAdmin ? "Total System Revenue" : "Company Gross Earnings"}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: "#3B82F622" }]}>
              <Ionicons name="time" size={20} color="#60A5FA" />
            </View>
            <Text style={styles.metricValue}>{activeJobsCount}</Text>
            <Text style={styles.metricLabel}>Active Dispatch Jobs</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: "#A78BFA22" }]}>
              <Ionicons name="construct" size={20} color="#A78BFA" />
            </View>
            <Text style={styles.metricValue}>{staff.length}</Text>
            <Text style={styles.metricLabel}>{isSuperAdmin ? "Global Staff Roster" : "On-Duty Company Crew"}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: "#F59E0B22" }]}>
              <Ionicons name="cut" size={20} color="#FBBF24" />
            </View>
            <Text style={styles.metricValue}>{servicesCount}</Text>
            <Text style={styles.metricLabel}>Cataloged Services</Text>
          </View>
        </View>

        {/* ── QUICK ACTION HUB TILE GRID ── */}
        <Text style={styles.sectionHeaderTitle}>
          {isSuperAdmin ? "👑 Platform Management Suite" : "⚡ Company Operations Control Hub"}
        </Text>

        <View style={styles.actionGrid}>
          {isSuperAdmin ? (
            <>
              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/tenants")}>
                <Ionicons name="business" size={22} color="#60A5FA" />
                <Text style={styles.actionTileTitle}>Tenants & Governance</Text>
                <Text style={styles.actionTileSub}>Analytics, Audit Logs & Config</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/invoices")}>
                <Ionicons name="card" size={22} color="#34D399" />
                <Text style={styles.actionTileTitle}>Billing & Invoices</Text>
                <Text style={styles.actionTileSub}>Global Financials & Status</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/staff")}>
                <Ionicons name="construct" size={22} color="#A78BFA" />
                <Text style={styles.actionTileTitle}>Manage Company Crew</Text>
                <Text style={styles.actionTileSub}>Add Techs & Set Qualifications</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/services")}>
                <Ionicons name="cut" size={22} color="#FBBF24" />
                <Text style={styles.actionTileTitle}>Post Services to Client App</Text>
                <Text style={styles.actionTileSub}>Add/Edit Catalog & Base Prices</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/customers")}>
            <Ionicons name="people" size={22} color="#34D399" />
            <Text style={styles.actionTileTitle}>Customer Directory</Text>
            <Text style={styles.actionTileSub}>View Profiles & Contact Details</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/(tabs)/bookings")}>
            <Ionicons name="calendar" size={22} color="#60A5FA" />
            <Text style={styles.actionTileTitle}>Global Dispatch Queue</Text>
            <Text style={styles.actionTileSub}>View & Assign Technicians</Text>
          </TouchableOpacity>
        </View>

        {/* ── LIVE BOOKINGS DISPATCH QUEUE ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>
            {isSuperAdmin ? "📋 Live Platform Booking Requests" : "📋 Incoming Company Job Dispatch Queue"}
          </Text>
          <Text style={{ color: "#60A5FA", fontSize: 12, fontWeight: "700" }}>{bookings.length} Jobs</Text>
        </View>

        {loading && bookings.length === 0 ? (
          <ActivityIndicator color="#3B82F6" size="large" style={{ marginTop: 20 }} />
        ) : bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color="#475569" />
            <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700", marginTop: 8 }}>No Active Bookings</Text>
            <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
              Customer bookings will appear here in real-time.
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
                      🗓️ {b.booking_date} {b.booking_time ? `at ${b.booking_time}` : ""}
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
                <Text style={styles.modalTitle}>Assign Company Crew</Text>
                <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Booking #{selectedBooking?.id} · {selectedBooking?.service?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: "#CBD5E1", fontSize: 12, marginBottom: 10 }}>
              Select an available field technician to dispatch to client site:
            </Text>

            <ScrollView style={{ maxHeight: 280 }}>
              {staff.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 20 }}>
                  No technicians found on roster. Go to Staff screen to register technicians.
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

      {/* ── 💳 DYNAMIC SUBSCRIPTION PLAN UPGRADE APPLICATION MODAL ── */}
      <Modal visible={upgradeModal} transparent animationType="slide" onRequestClose={() => setUpgradeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Apply for Subscription Upgrade</Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  Select from plans configured by Super Admin and submit for approval
                </Text>
              </View>
              <TouchableOpacity onPress={() => setUpgradeModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Available Super Admin Plan Tiers *</Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                {availablePlans.map((plan) => {
                  const isSel = targetPlan === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      onPress={() => setTargetPlan(plan.id)}
                      style={[styles.planSelectItem, isSel && styles.planSelectItemActive]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                          {plan.name} {plan.fee > 0 ? `· ETB ${Number(plan.fee).toLocaleString()}/mo` : "· Free Entry"}
                        </Text>
                        <Text style={{ color: "#CBD5E1", fontSize: 11, marginTop: 2 }}>{plan.desc}</Text>
                      </View>
                      <Ionicons
                        name={isSel ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={isSel ? "#3B82F6" : "#64748B"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Application Note to Super Admin (Optional)</Text>
                <TextInput
                  placeholder="e.g. Requesting Growth tier for high-rise glass window dispatching..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                  value={upgradeNotes}
                  onChangeText={setUpgradeNotes}
                  style={[styles.textInput, { height: 75, textAlignVertical: "top" }]}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setUpgradeModal(false)} disabled={submittingUpgrade}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleApplySubscriptionUpgrade} disabled={submittingUpgrade}>
                {submittingUpgrade ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>Submit Application</Text>}
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
  heroValue: { fontSize: 22, fontWeight: "800", color: "#FFF", marginTop: 2 },
  upgradePlanBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  pendingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 10 },
  alertBanner: { backgroundColor: "#1E293B", borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: "#F59E0B" },
  alertReqCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: "#334155" },
  miniApproveBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
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
  statusPill: { backgroundColor: "#3B82F622", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusPillText: { fontSize: 10, color: "#60A5FA", fontWeight: "800" },
  jobFooter: { flexDirection: "row", alignItems: "center", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#334155" },
  jobMeta: { fontSize: 11, color: "#94A3B8" },
  dispatchCrewBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#2563EB", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  emptyCard: { backgroundColor: "#1E293B", borderRadius: 14, padding: 30, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 20, maxHeight: "90%", borderWidth: 1, borderColor: "#334155" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#F8FAFC" },
  staffSelectItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: "#334155", gap: 10 },
  staffSelectItemActive: { borderColor: "#10B981", backgroundColor: "#10B98115" },
  staffAvatarBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#A78BFA22", alignItems: "center", justifyContent: "center" },
  planSelectItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: "#334155", gap: 10 },
  planSelectItemActive: { borderColor: "#3B82F6", backgroundColor: "#3B82F615" },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#CBD5E1", marginBottom: 6 },
  textInput: { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155" },
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
});
