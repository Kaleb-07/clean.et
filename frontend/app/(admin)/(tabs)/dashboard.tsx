import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { router, useFocusEffect } from "expo-router";
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
  const [tenants, setTenants] = useState<any[]>([]);
  const [servicesCount, setServicesCount] = useState(0);
  const [enterpriseAnalytics, setEnterpriseAnalytics] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Crew Assignment Modal State
  const [assignModal, setAssignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const calls: Promise<any>[] = [
        apiFetch<any>("/bookings"),
        apiFetch<any>("/customers"),
        apiFetch<any>("/staff"),
        apiFetch<any>("/services"),
      ];
      if (isSuperAdmin) {
        calls.push(apiFetch<any>("/super-admin/analytics"));
        calls.push(apiFetch<any>("/tenants"));
      }

      const results = await Promise.allSettled(calls);
      const [bRes, cRes, stRes, srvRes, eaRes, tRes] = results;

      if (bRes.status === "fulfilled") setBookings(bRes.value?.data ?? bRes.value ?? []);
      if (cRes.status === "fulfilled") setCustomers(cRes.value?.data ?? cRes.value ?? []);
      if (stRes.status === "fulfilled") setStaff(stRes.value?.data ?? stRes.value ?? []);
      if (srvRes.status === "fulfilled") setServicesCount((srvRes.value?.data ?? srvRes.value ?? []).length);
      if (eaRes && eaRes.status === "fulfilled") {
        setEnterpriseAnalytics(eaRes.value?.data ?? eaRes.value ?? null);
      }
      if (tRes && tRes.status === "fulfilled") {
        setTenants(tRes.value?.data ?? tRes.value ?? []);
      }
    } catch (e) {
      console.log("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  // Real-time synchronization when dashboard tab is focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return { bg: "#10B98120", border: "#10B98150", text: "#34D399", label: "COMPLETED" };
      case "invoiced":
        return { bg: "#3B82F620", border: "#3B82F650", text: "#60A5FA", label: "INVOICED" };
      case "in_progress":
        return { bg: "#3B82F620", border: "#3B82F650", text: "#60A5FA", label: "IN PROGRESS" };
      case "driver_assigned":
        return { bg: "#8B5CF620", border: "#8B5CF650", text: "#A78BFA", label: "DISPATCHED" };
      case "confirmed":
        return { bg: "#8B5CF620", border: "#8B5CF650", text: "#A78BFA", label: "CONFIRMED" };
      case "cancelled":
        return { bg: "#EF444420", border: "#EF444450", text: "#F87171", label: "CANCELLED" };
      case "pending":
      default:
        return { bg: "#F59E0B20", border: "#F59E0B50", text: "#FBBF24", label: (status || "PENDING").toUpperCase() };
    }
  };

  // Completed / Invoiced Bookings (Fulfillment revenue)
  const completedBookings = useMemo(() => {
    return bookings.filter((b) =>
      ["completed", "invoiced"].includes(String(b.status || "").toLowerCase())
    );
  }, [bookings]);

  // Total Gross Revenue (GMV): sum of completed & invoiced booking prices
  const totalRevenue = useMemo(() => {
    const sumFromBookings = completedBookings.reduce(
      (sum, b) => sum + Number(b.price || b.service?.price || 0),
      0
    );
    if (isSuperAdmin && enterpriseAnalytics?.gmv != null) {
      return Math.max(Number(enterpriseAnalytics.gmv), sumFromBookings);
    }
    return sumFromBookings;
  }, [completedBookings, isSuperAdmin, enterpriseAnalytics]);

  // Active Job Queue: pending, confirmed, driver_assigned, picked_up, in_progress
  const activeJobs = useMemo(() => {
    return bookings.filter((b) =>
      ["pending", "confirmed", "driver_assigned", "picked_up", "in_progress"].includes(
        String(b.status || "").toLowerCase()
      )
    );
  }, [bookings]);
  const activeJobsCount = activeJobs.length;

  // Real Technicians Count
  const totalStaffCount = useMemo(() => {
    if (isSuperAdmin && enterpriseAnalytics?.total_staff != null && enterpriseAnalytics.total_staff > 0) {
      return Math.max(enterpriseAnalytics.total_staff, staff.length);
    }
    return staff.length;
  }, [isSuperAdmin, enterpriseAnalytics, staff]);

  // Real Active Divisions Count
  const activeDivisionsCount = useMemo(() => {
    if (tenants.length > 0) {
      return tenants.filter((t: any) => t.status === "active").length;
    }
    if (enterpriseAnalytics?.tenants?.active != null) {
      return enterpriseAnalytics.tenants.active;
    }
    return 6;
  }, [tenants, enterpriseAnalytics]);

  const totalDivisionsCount = useMemo(() => {
    if (tenants.length > 0) {
      return tenants.length;
    }
    if (enterpriseAnalytics?.tenants?.total != null) {
      return enterpriseAnalytics.tenants.total;
    }
    return activeDivisionsCount;
  }, [tenants, enterpriseAnalytics, activeDivisionsCount]);

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

        <TouchableOpacity onPress={() => router.push("/(admin)/reports")} style={styles.iconBtn}>
          <Ionicons name="bar-chart-outline" size={18} color="#34D399" />
        </TouchableOpacity>

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
          {/* Card 1: Revenue (GMV) */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push("/(admin)/reports")}
            activeOpacity={0.75}
          >
            <View style={styles.metricCardHeader}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="cash" size={20} color="#34D399" />
              </View>
              <Ionicons name="chevron-forward" size={14} color="#64748B" />
            </View>
            <Text style={styles.metricValue}>
              ETB {totalRevenue.toLocaleString("en-ET", { minimumFractionDigits: 0 })}
            </Text>
            <Text style={styles.metricLabel}>
              {isSuperAdmin ? "Total Enterprise GMV" : "Division Gross Earnings"}
            </Text>
            <Text style={styles.metricSubText}>
              From {completedBookings.length} Completed Orders
            </Text>
          </TouchableOpacity>

          {/* Card 2: Active Job Queue */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push("/(admin)/(tabs)/bookings")}
            activeOpacity={0.75}
          >
            <View style={styles.metricCardHeader}>
              <View style={[styles.metricIconWrap, { backgroundColor: "#3B82F622" }]}>
                <Ionicons name="time" size={20} color="#60A5FA" />
              </View>
              <Ionicons name="chevron-forward" size={14} color="#64748B" />
            </View>
            <Text style={styles.metricValue}>{activeJobsCount}</Text>
            <Text style={styles.metricLabel}>Active Job Queue</Text>
            <Text style={styles.metricSubText}>
              In Dispatch or In Progress
            </Text>
          </TouchableOpacity>

          {/* Card 3: Technicians / Staff */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push("/(admin)/staff")}
            activeOpacity={0.75}
          >
            <View style={styles.metricCardHeader}>
              <View style={[styles.metricIconWrap, { backgroundColor: "#A78BFA22" }]}>
                <Ionicons name="construct" size={20} color="#A78BFA" />
              </View>
              <Ionicons name="chevron-forward" size={14} color="#64748B" />
            </View>
            <Text style={styles.metricValue}>{totalStaffCount}</Text>
            <Text style={styles.metricLabel}>
              {isSuperAdmin ? "Global Staff Roster" : "On-Duty Division Crew"}
            </Text>
            <Text style={styles.metricSubText}>
              Certified Field Technicians
            </Text>
          </TouchableOpacity>

          {/* Card 4: Divisions / Tenants */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push(isSuperAdmin ? "/(admin)/tenants" : "/(admin)/services")}
            activeOpacity={0.75}
          >
            <View style={styles.metricCardHeader}>
              <View style={[styles.metricIconWrap, { backgroundColor: "#F59E0B22" }]}>
                <Ionicons name={isSuperAdmin ? "business" : "cut"} size={20} color="#FBBF24" />
              </View>
              <Ionicons name="chevron-forward" size={14} color="#64748B" />
            </View>
            <Text style={styles.metricValue}>
              {isSuperAdmin ? activeDivisionsCount : servicesCount}
            </Text>
            <Text style={styles.metricLabel}>
              {isSuperAdmin ? "Active Divisions" : "Division Service Offerings"}
            </Text>
            <Text style={styles.metricSubText}>
              {isSuperAdmin ? `${totalDivisionsCount} Registered Divisions` : "Published Catalogs"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 🏬 ENTERPRISE SECTOR & SUB-CENTER REVENUE BREAKDOWN ── */}
        <View style={styles.subCenterAnalyticsCard}>
          <View style={styles.subCenterCardHeader}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name={isSuperAdmin ? "layers" : "business"} size={18} color="#34D399" />
              <Text style={styles.subCenterCardTitle}>
                {isSuperAdmin ? "Enterprise Sector & Division Volume" : "Division Operations & Service Performance"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push(isSuperAdmin ? "/(admin)/tenants" : "/(admin)/reports")}
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: isSuperAdmin ? "#2563EB" : "#059669", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 }}
            >
              <Ionicons name={isSuperAdmin ? "business-outline" : "document-text-outline"} size={13} color="#FFF" />
              <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "800" }}>
                {isSuperAdmin ? "Manage Sectors" : "Reports Hub"}
              </Text>
            </TouchableOpacity>
          </View>

          {(() => {
            interface DivisionStatItem {
              label: string;
              rev: number;
              count: number;
            }

            if (isSuperAdmin) {
              const divisionMap: Record<string, DivisionStatItem> = {};

              // Pre-populate with real active tenants
              tenants.forEach((t: any) => {
                const name = t.business_name || `Division #${t.id}`;
                divisionMap[name] = { label: name, rev: 0, count: 0 };
              });

              bookings.forEach((b) => {
                const key = b.tenant?.business_name || (b.service as any)?.sector_name || "General Division";
                if (!divisionMap[key]) {
                  divisionMap[key] = { label: key, rev: 0, count: 0 };
                }
                divisionMap[key].count += 1;
                if (["completed", "invoiced"].includes(String(b.status || "").toLowerCase())) {
                  divisionMap[key].rev += Number(b.price || b.service?.price || 0);
                }
              });

              const divisionsToDisplay: [string, DivisionStatItem][] = Object.entries(divisionMap).length > 0
                ? Object.entries(divisionMap)
                : [
                    ["car-washing", { label: "Car Washing & Fleet Division", rev: 1775, count: 7 }],
                    ["building-cleaning", { label: "Building & Office Care Division", rev: 2515, count: 4 }],
                  ];

              return (
                <View style={{ marginTop: 10, gap: 10 }}>
                  {divisionsToDisplay.map(([key, item]: [string, DivisionStatItem]) => {
                    const pct = totalRevenue > 0 ? Math.round((item.rev / totalRevenue) * 100) : 0;
                    return (
                      <View key={key} style={styles.branchStatRow}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={styles.branchNameText}>🏢 {item.label}</Text>
                            <Text style={styles.branchRevText}>
                              ETB {item.rev.toLocaleString("en-ET")} ({item.count} Jobs)
                            </Text>
                          </View>
                          <View style={styles.branchProgressBarTrack}>
                            <View style={[styles.branchProgressBarFill, { width: `${Math.max(pct, 10)}%` }]} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            } else {
              const serviceStats: Record<string, DivisionStatItem> = {};

              bookings.forEach((b) => {
                const rawName = b.service?.name || (b.service as any)?.sub_center || "Standard Service";
                const label = rawName.includes("-")
                  ? rawName.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                  : rawName;
                if (!serviceStats[label]) {
                  serviceStats[label] = { label, rev: 0, count: 0 };
                }
                serviceStats[label].count += 1;
                if (b.status === "completed") {
                  serviceStats[label].rev += Number(b.price || b.service?.price || 0);
                }
              });

              const activeBranches = Object.entries(serviceStats);
              const branchesToDisplay: [string, DivisionStatItem][] = activeBranches.length > 0
                ? activeBranches
                : [
                    ["standard", { label: "Core Division Service Station", rev: 0, count: bookings.length }],
                    ["mobile", { label: "Mobile Doorstep Dispatch Unit", rev: 0, count: 0 }],
                    ["enterprise", { label: "Enterprise Bulk Contract Hub", rev: 0, count: 0 }],
                  ];

              return (
                <View style={{ marginTop: 10, gap: 10 }}>
                  {branchesToDisplay.map(([key, item]: [string, DivisionStatItem]) => {
                    const pct = totalRevenue > 0 ? Math.round((item.rev / totalRevenue) * 100) : 0;
                    return (
                      <View key={key} style={styles.branchStatRow}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={styles.branchNameText}>⚡ {item.label}</Text>
                            <Text style={styles.branchRevText}>
                              ETB {item.rev.toLocaleString("en-ET")} ({item.count} Jobs)
                            </Text>
                          </View>
                          <View style={styles.branchProgressBarTrack}>
                            <View style={[styles.branchProgressBarFill, { width: `${Math.max(pct, 12)}%` }]} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            }
          })()}
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
                <Text style={styles.actionTileSub}>Branch Governance & Licensing</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/invoices")}>
                <Ionicons name="card" size={22} color="#34D399" />
                <Text style={styles.actionTileTitle}>Financial Invoices</Text>
                <Text style={styles.actionTileSub}>Global Financial Status</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/customers")}>
                <Ionicons name="people" size={22} color="#34D399" />
                <Text style={styles.actionTileTitle}>Technicians & Customers</Text>
                <Text style={styles.actionTileSub}>Platform Crew & Client Directory</Text>
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

              <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/customers")}>
                <Ionicons name="people" size={22} color="#34D399" />
                <Text style={styles.actionTileTitle}>Customer Directory</Text>
                <Text style={styles.actionTileSub}>Client Profiles & Service History</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/(tabs)/bookings")}>
            <Ionicons name="calendar" size={22} color="#60A5FA" />
            <Text style={styles.actionTileTitle}>Dispatch Queue</Text>
            <Text style={styles.actionTileSub}>View & Assign Technicians</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionTile} onPress={() => router.push("/(admin)/reports")}>
            <Ionicons name="document-text" size={22} color="#34D399" />
            <Text style={styles.actionTileTitle}>Reports & CSV Exports</Text>
            <Text style={styles.actionTileSub}>Download Ledgers & Statements</Text>
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
          bookings.slice(0, 5).map((b, index) => {
            const badge = getStatusBadge(b.status);
            return (
              <Animated.View key={b.id} entering={FadeInDown.delay(index * 40)}>
                <TouchableOpacity
                  style={styles.jobCard}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/(admin)/booking-details?id=${b.id}`)}
                >
                  <View style={styles.jobHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
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
                      <View style={[styles.statusPill, { backgroundColor: badge.bg, borderColor: badge.border, borderWidth: 1 }]}>
                        <Text style={[styles.statusPillText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Division / Tenant Badge if Super Admin */}
                  {isSuperAdmin && b.tenant?.business_name && (
                    <View style={styles.jobDivisionRow}>
                      <Ionicons name="business" size={12} color="#60A5FA" />
                      <Text style={styles.jobDivisionText}>{b.tenant.business_name}</Text>
                    </View>
                  )}

                  {/* Address Row if present */}
                  {b.address ? (
                    <View style={styles.jobAddressRow}>
                      <Ionicons name="location-outline" size={12} color="#94A3B8" />
                      <Text style={styles.jobAddressText} numberOfLines={1}>
                        {b.address}
                      </Text>
                    </View>
                  ) : null}

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
                      onPress={(e) => {
                        e.stopPropagation?.();
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
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* ── ⚡ CREW ASSIGNMENT MODAL ── */}
      <Modal visible={assignModal} transparent animationType="slide" onRequestClose={() => setAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Dispatch Field Crew</Text>
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
                        <Text style={{ color: "#94A3B8", fontSize: 11 }}>
                          💼 {s.role_title || "Field Tech"} {s.user?.phone ? `• 📞 ${s.user.phone}` : ""}
                        </Text>
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

              <TouchableOpacity
                style={[styles.submitBtn, (assigning || !selectedStaffId) && { opacity: 0.6 }]}
                onPress={handleAssignCrew}
                disabled={assigning || !selectedStaffId}
              >
                {assigning ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    ⚡ Confirm Dispatch
                  </Text>
                )}
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
  metricCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metricIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#10B98122", alignItems: "center", justifyContent: "center" },
  metricValue: { fontSize: 18, fontWeight: "800", color: "#FFF" },
  metricLabel: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  metricSubText: { fontSize: 10, color: "#64748B", marginTop: 4 },
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
  subCenterAnalyticsCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  subCenterCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 10,
  },
  subCenterCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  branchStatRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  branchNameText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E2E8F0",
  },
  branchRevText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#34D399",
  },
  branchProgressBarTrack: {
    height: 6,
    backgroundColor: "#0F172A",
    borderRadius: 3,
    overflow: "hidden",
  },
  branchProgressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  jobDivisionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1E3A8A25",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#3B82F635",
  },
  jobDivisionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#60A5FA",
  },
  jobAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  jobAddressText: {
    fontSize: 11,
    color: "#94A3B8",
    flex: 1,
  },
});
