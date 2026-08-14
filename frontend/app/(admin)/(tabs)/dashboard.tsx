import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import API, { apiFetch } from "../../../src/api/client";
import { useAuth } from "../../../contexts/AuthContext";
import ActionModal from "../../../src/components/ActionModal";

/* ─── TYPES ─────────────────────────────────────────────────────────────── */
interface Booking {
  id: number;
  status: string;
  price: number;
  currency?: string;
  sector?: { name: string; category?: { name: string } };
  customer?: { user?: { name: string } };
  booking_date?: string;
}

interface StatProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}

interface ActionItemProps {
  title: string;
  subtitle: string;
  icon: string;
  colors: [string, string];
  route: string;
}

/* ─── EXECUTIVE STAT CARD ────────────────────────────────────────────────── */
function ExecutiveStatCard({ icon, label, value, color, sub }: StatProps) {
  return (
    <Animated.View entering={FadeInDown.delay(100)} style={{ width: "48%" }}>
      <BlurView intensity={25} tint="dark" style={styles.statCard}>
        <View style={styles.statCardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
            <Ionicons name={icon as any} size={20} color={color} />
          </View>
          {sub && (
            <View style={styles.subPill}>
              <Text style={[styles.subPillText, { color }]}>{sub}</Text>
            </View>
          )}
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </BlurView>
    </Animated.View>
  );
}

/* ─── EXECUTIVE ACTION TILE ──────────────────────────────────────────────── */
function ExecutiveActionTile({ title, subtitle, icon, colors, route }: ActionItemProps) {
  return (
    <Pressable onPress={() => router.push(route as any)} style={{ flex: 1 }}>
      {({ pressed }) => (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.actionCard, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
        >
          <View style={styles.actionCardHeader}>
            <View style={styles.actionIconWrap}>
              <Ionicons name={icon as any} size={22} color="#FFF" />
            </View>
            <Ionicons name="arrow-forward-circle" size={22} color="rgba(255,255,255,0.7)" />
          </View>
          <View>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionSubtitle}>{subtitle}</Text>
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );
}

/* ─── MAIN ENTERPRISE DASHBOARD ──────────────────────────────────────────── */
export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [superAdminStats, setSuperAdminStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    loadData();
  }, [user?.role]);

  const loadData = async () => {
    try {
      const [bRes, cRes, catRes, stRes, saRes] = await Promise.allSettled([
        apiFetch<any>("/bookings"),
        apiFetch<any>("/customers"),
        apiFetch<any>("/categories"),
        apiFetch<any>("/staff"),
        isSuperAdmin ? apiFetch<any>("/super-admin/analytics") : Promise.resolve(null),
      ]);

      if (bRes.status === "fulfilled") {
        const data = bRes.value;
        setBookings(Array.isArray(data) ? data : data?.data ?? []);
      }
      if (cRes.status === "fulfilled") {
        const data = cRes.value;
        setCustomers(Array.isArray(data) ? data : data?.data ?? []);
      }
      if (catRes.status === "fulfilled") {
        const data = catRes.value;
        const cats = Array.isArray(data) ? data : data?.data ?? [];
        const allSectors = cats.flatMap((c: any) => c.sectors ?? []);
        setSectors(allSectors);
      }
      if (stRes.status === "fulfilled") {
        const data = stRes.value;
        setStaff(Array.isArray(data) ? data : data?.data ?? []);
      }
      if (saRes.status === "fulfilled" && saRes.value) {
        const data = saRes.value;
        const saObj = data?.gmv !== undefined ? data : data?.data ?? data;
        setSuperAdminStats(saObj);
      }
    } catch (e) {
      console.log("Clean.et Dashboard load error:", e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    if (isSuperAdmin && superAdminStats) {
      const b = superAdminStats.bookings?.breakdown || {};
      const totalGmv = Number(superAdminStats.gmv) || 0;
      const commissionRate = superAdminStats.platform_commission_rate || 10;
      const estimatedCommission = (totalGmv * (commissionRate / 100)).toLocaleString("en-ET", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return {
        bookings: superAdminStats.bookings?.total ?? bookings.length,
        customers: superAdminStats.total_customers ?? customers.length,
        sectors: sectors.length || 6,
        staff: superAdminStats.total_staff ?? staff.length,
        tenants: superAdminStats.tenants?.total ?? 1,
        activeTenants: superAdminStats.tenants?.active ?? 1,
        gmv: totalGmv.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        commission: estimatedCommission,
        pending: b.pending ?? 0,
        active: (b.confirmed ?? 0) + (b.in_progress ?? 0),
        completed: b.completed ?? 0,
        invoiced: b.invoiced ?? 0,
      };
    }

    const totalRevenue = bookings
      .filter((b) => b.status === "completed" || b.status === "invoiced")
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    return {
      bookings: bookings.length,
      customers: customers.length,
      sectors: sectors.length,
      staff: staff.length,
      tenants: 1,
      activeTenants: 1,
      gmv: totalRevenue.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      commission: (totalRevenue * 0.1).toLocaleString("en-ET", { minimumFractionDigits: 2 }),
      pending: bookings.filter((b) => b.status === "pending").length,
      active: bookings.filter((b) =>
        ["confirmed", "driver_assigned", "picked_up", "in_progress"].includes(b.status)
      ).length,
      completed: bookings.filter((b) => b.status === "completed").length,
      invoiced: bookings.filter((b) => b.status === "invoiced").length,
    };
  }, [bookings, customers, sectors, staff, isSuperAdmin, superAdminStats]);

  const confirmLogout = async () => {
    await logout();
    router.replace("/");
  };

  const roleTitle = isSuperAdmin ? "Super Admin" : "Tenant Admin";
  const greeting = user?.name ? user.name : "Platform Administrator";

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={["#0B0F17", "#111827", "#070A11"]} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 140,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
        >
          {/* ── EXECUTIVE TOP HEADER BAR ── */}
          <Animated.View entering={FadeInDown.delay(50)} style={styles.executiveHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.systemStatusPill}>
                <View style={styles.pulseDot} />
                <Text style={styles.systemStatusText}>Live Platform Systems Normal</Text>
              </View>
              <Text style={styles.greetingTitle}>{greeting}</Text>
              <Text style={styles.roleSubtitle}>
                {roleTitle} · Clean.et E-Services Core Engine
              </Text>
            </View>
            <Pressable onPress={() => setLogoutModal(true)} style={styles.logoutIconButton}>
              <Ionicons name="power-outline" size={20} color="#F87171" />
            </Pressable>
          </Animated.View>

          {/* ── HERO FINANCIAL GMV & COMMISSION CARD ── */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <LinearGradient
              colors={isSuperAdmin ? ["#1E1B4B", "#312E81", "#1E3A8A"] : ["#1E293B", "#0F172A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroFinancialCard}
            >
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroMetaLabel}>
                    {isSuperAdmin ? "Gross Merchandise Value (GMV)" : "Gross Revenue"}
                  </Text>
                  <Text style={styles.heroGmvValue}>ETB {stats.gmv}</Text>
                </View>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>ETB</Text>
                </View>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroBottomRow}>
                <View style={styles.heroSubStat}>
                  <Ionicons name="cash-outline" size={16} color="#34D399" />
                  <View style={{ marginLeft: 6 }}>
                    <Text style={styles.heroSubLabel}>Platform Commission (10%)</Text>
                    <Text style={styles.heroSubValue}>ETB {stats.commission}</Text>
                  </View>
                </View>

                <View style={styles.heroSubStat}>
                  <Ionicons name="checkmark-done-circle-outline" size={16} color="#60A5FA" />
                  <View style={{ marginLeft: 6 }}>
                    <Text style={styles.heroSubLabel}>Completed Jobs</Text>
                    <Text style={styles.heroSubValue}>{stats.completed} Bookings</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── SUPER ADMIN PORTAL BANNER ── */}
          {isSuperAdmin && (
            <Animated.View entering={FadeInDown.delay(120)} style={{ marginTop: 14 }}>
              <Pressable onPress={() => router.push("/(admin)/tenants")}>
                <LinearGradient
                  colors={["#0F766E", "#0D9488", "#0284C7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.governanceBanner}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="shield-checkmark-sharp" size={18} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.bannerTitle}>Tenant & Governance Center</Text>
                    </View>
                    <Text style={styles.bannerSubtitle}>
                      Onboard new tenants, create admin users & manage subscription tiers
                    </Text>
                  </View>
                  <View style={styles.bannerCtaButton}>
                    <Text style={styles.bannerCtaText}>Manage →</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}

          {/* ── EXECUTIVE KPI GRID ── */}
          <View style={styles.kpiGrid}>
            {isSuperAdmin ? (
              <ExecutiveStatCard
                icon="business-outline"
                label="Tenants Onboarded"
                value={stats.tenants}
                color="#60A5FA"
                sub={`${stats.activeTenants} Active`}
              />
            ) : (
              <ExecutiveStatCard
                icon="calendar-outline"
                label="Total Bookings"
                value={stats.bookings}
                color="#3B82F6"
                sub={`${stats.pending} Pending`}
              />
            )}

            <ExecutiveStatCard
              icon="people-outline"
              label="Registered Clients"
              value={stats.customers}
              color="#34D399"
              sub="Car & Building"
            />

            <ExecutiveStatCard
              icon="layers-outline"
              label="Service Sectors"
              value={stats.sectors}
              color="#F59E0B"
              sub="Multi-Tenant"
            />

            <ExecutiveStatCard
              icon="construct-outline"
              label="Field Staff Crew"
              value={stats.staff}
              color="#A78BFA"
              sub="Certified"
            />
          </View>

          {/* ── REAL-TIME BOOKING STATUS STEPPER ── */}
          <Animated.View entering={FadeInRight.delay(150)} style={styles.statusStepperContainer}>
            <Text style={styles.stepperSectionTitle}>Global Order Pipeline</Text>
            <View style={styles.stepperRow}>
              <View style={styles.stepperItem}>
                <Text style={[styles.stepperNum, { color: "#F59E0B" }]}>{stats.pending}</Text>
                <Text style={styles.stepperText}>Pending</Text>
              </View>
              <View style={styles.stepperDivider} />

              <View style={styles.stepperItem}>
                <Text style={[styles.stepperNum, { color: "#3B82F6" }]}>{stats.active}</Text>
                <Text style={styles.stepperText}>In Progress</Text>
              </View>
              <View style={styles.stepperDivider} />

              <View style={styles.stepperItem}>
                <Text style={[styles.stepperNum, { color: "#10B981" }]}>{stats.completed}</Text>
                <Text style={styles.stepperText}>Completed</Text>
              </View>
              <View style={styles.stepperDivider} />

              <View style={styles.stepperItem}>
                <Text style={[styles.stepperNum, { color: "#8B5CF6" }]}>{stats.invoiced}</Text>
                <Text style={styles.stepperText}>Invoiced</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── ENTERPRISE MANAGEMENT TILES ── */}
          <Text style={styles.sectionHeaderTitle}>Platform Operations Command Hub</Text>

          {isSuperAdmin && (
            <View style={styles.actionRowGrid}>
              <ExecutiveActionTile
                title="Tenants & Admins"
                subtitle="Onboard companies & tenant admins"
                icon="business-outline"
                colors={["#0369A1", "#0284C7"]}
                route="/(admin)/tenants"
              />
              <ExecutiveActionTile
                title="Platform Invoices"
                subtitle="Financial ledger & tax reports"
                icon="receipt-outline"
                colors={["#B45309", "#D97706"]}
                route="/(admin)/invoices"
              />
            </View>
          )}

          <View style={styles.actionRowGrid}>
            <ExecutiveActionTile
              title="Bookings & Dispatch"
              subtitle="View all service jobs & dispatch"
              icon="calendar-outline"
              colors={["#1D4ED8", "#2563EB"]}
              route="/(admin)/(tabs)/bookings"
            />
            <ExecutiveActionTile
              title="Customer Directory"
              subtitle="Vehicle fleet & property owners"
              icon="people-outline"
              colors={["#047857", "#059669"]}
              route="/(admin)/customers"
            />
          </View>

          <View style={styles.actionRowGrid}>
            <ExecutiveActionTile
              title="Field Staff Roster"
              subtitle="Technicians & rope access staff"
              icon="person-add-outline"
              colors={["#6D28D9", "#7C3AED"]}
              route="/(admin)/staff"
            />
            <ExecutiveActionTile
              title="Services Catalog"
              subtitle="Sector schemas & dynamic rates"
              icon="options-outline"
              colors={["#334155", "#475569"]}
              route="/(admin)/services"
            />
          </View>
        </ScrollView>

        {/* LOGOUT CONFIRMATION MODAL */}
        <ActionModal
          visible={logoutModal}
          type="danger"
          title="Exit Command Center?"
          message="Are you sure you want to log out of your Super Admin session?"
          confirmText="Log Out"
          onConfirm={confirmLogout}
          onCancel={() => setLogoutModal(false)}
        />
      </LinearGradient>
    </View>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#0B0F17",
  },
  executiveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  systemStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  systemStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#34D399",
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F9FAFB",
    letterSpacing: -0.5,
  },
  roleSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "500",
  },
  logoutIconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.25)",
  },
  heroFinancialCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroMetaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#93C5FD",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroGmvValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  currencyBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currencyBadgeText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 14,
  },
  heroBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroSubStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroSubLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  heroSubValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F3F4F6",
    marginTop: 1,
  },
  governanceBanner: {
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  bannerTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  bannerSubtitle: {
    color: "#E0F2FE",
    fontSize: 12,
    marginTop: 2,
  },
  bannerCtaButton: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerCtaText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    overflow: "hidden",
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  subPill: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "500",
  },
  statusStepperContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },
  stepperSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperItem: {
    alignItems: "center",
    flex: 1,
  },
  stepperNum: {
    fontSize: 18,
    fontWeight: "800",
  },
  stepperText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  stepperDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#F9FAFB",
    marginTop: 24,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  actionRowGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  actionCard: {
    padding: 16,
    borderRadius: 16,
    justifyContent: "space-between",
    minHeight: 115,
  },
  actionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFF",
    marginTop: 10,
  },
  actionSubtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
});
