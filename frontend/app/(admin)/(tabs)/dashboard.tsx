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

import API from "../../../src/api/client";
import { useAuth } from "../../../contexts/AuthContext";
import ActionModal from "../../../src/components/ActionModal";

/* ─── TYPES ─────────────────────────────────────────────────────────────── */
interface Booking {
  id: number;
  status: string;
  price: number;
}

interface Stat {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}

interface ActionItem {
  title: string;
  subtitle: string;
  icon: string;
  colors: [string, string];
  route: string;
}

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, color, sub }: Stat) {
  return (
    <Animated.View entering={FadeInDown.delay(100)} style={{ width: "48%" }}>
      <BlurView intensity={30} tint="dark" style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </BlurView>
    </Animated.View>
  );
}

/* ─── ACTION CARD ────────────────────────────────────────────────────────── */
function ActionCard({ title, subtitle, icon, colors, route }: ActionItem) {
  return (
    <Pressable onPress={() => router.push(route as any)} style={{ flex: 1 }}>
      {({ pressed }) => (
        <LinearGradient
          colors={colors}
          style={[styles.actionCard, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.actionIcon}>
            <Ionicons name={icon as any} size={22} color="#fff" />
          </View>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color="rgba(255,255,255,0.6)"
            style={{ marginTop: 12 }}
          />
        </LinearGradient>
      )}
    </Pressable>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bRes, cRes, catRes, stRes] = await Promise.allSettled([
        API.get("/bookings"),
        API.get("/customers"),
        API.get("/categories"),
        API.get("/staff"),
      ]);

      if (bRes.status === "fulfilled") {
        const d = bRes.value.data;
        setBookings(Array.isArray(d) ? d : d.data ?? []);
      }
      if (cRes.status === "fulfilled") {
        const d = cRes.value.data;
        setCustomers(Array.isArray(d) ? d : d.data ?? []);
      }
      if (catRes.status === "fulfilled") {
        const d = catRes.value.data;
        const cats = Array.isArray(d) ? d : d.data ?? [];
        const allSectors = cats.flatMap((c: any) => c.sectors ?? []);
        setSectors(allSectors);
      }
      if (stRes.status === "fulfilled") {
        const d = stRes.value.data;
        setStaff(Array.isArray(d) ? d : d.data ?? []);
      }
    } catch (e) {
      console.log("Dashboard load error:", e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const revenue = bookings
      .filter((b) => b.status === "completed" || b.status === "invoiced")
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0);
    return {
      bookings: bookings.length,
      customers: customers.length,
      sectors: sectors.length,
      staff: staff.length,
      revenue: revenue.toLocaleString("en-ET"),
      pending: bookings.filter((b) => b.status === "pending").length,
      active: bookings.filter((b) =>
        ["confirmed", "driver_assigned", "picked_up", "in_progress"].includes(b.status)
      ).length,
      completed: bookings.filter((b) => b.status === "completed").length,
      invoiced: bookings.filter((b) => b.status === "invoiced").length,
    };
  }, [bookings, customers, sectors, staff]);

  const confirmLogout = async () => {
    await logout();
    router.replace("/");
  };

  const tenantLabel = user?.role === "super_admin" ? "Super Admin" : "Tenant Admin";
  const greeting = user?.name ? `Hello, ${user.name.split(" ")[0]}` : "Dashboard";

  return (
    <LinearGradient colors={["#07070f", "#0f1028", "#1a1445"]} style={{ flex: 1 }}>
      {/* ── FIXED HEADER ── */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Animated.View entering={FadeInDown.delay(50)} style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <View style={styles.rolePill}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>{tenantLabel} · Clean.et</Text>
            </View>
          </View>
          <Pressable onPress={() => setLogoutModal(true)} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          </Pressable>
        </Animated.View>

        {/* ── REVENUE HERO ── */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={["#7c3aed", "#4c1d95"]}
            style={styles.revenueCard}
          >
            <View>
              <Text style={styles.revenueLabel}>Total Revenue (ETB)</Text>
              <Text style={styles.revenueValue}>ETB {stats.revenue}</Text>
              <Text style={styles.revenueSub}>
                {stats.bookings} total · {stats.completed} completed
              </Text>
            </View>
            <View style={styles.revenueIcon}>
              <Ionicons name="analytics-outline" size={32} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── STATS GRID ── */}
        <View style={styles.grid}>
          <StatCard
            icon="calendar-outline"
            label="Bookings"
            value={stats.bookings}
            color="#3b82f6"
            sub={`${stats.pending} pending`}
          />
          <StatCard
            icon="people-outline"
            label="Customers"
            value={stats.customers}
            color="#10b981"
          />
          <StatCard
            icon="layers-outline"
            label="Sectors"
            value={stats.sectors}
            color="#f59e0b"
          />
          <StatCard
            icon="person-outline"
            label="Staff"
            value={stats.staff}
            color="#8b5cf6"
          />
        </View>

        {/* ── BOOKING STATUS ROW ── */}
        <Animated.View entering={FadeInRight.delay(150)} style={styles.statusRow}>
          {[
            { label: "Pending", value: stats.pending, color: "#f59e0b" },
            { label: "Active", value: stats.active, color: "#3b82f6" },
            { label: "Completed", value: stats.completed, color: "#10b981" },
            { label: "Invoiced", value: stats.invoiced, color: "#a855f7" },
          ].map((s) => (
            <View key={s.label} style={styles.statusItem}>
              <Text style={[styles.statusValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statusLabel}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* ── SCROLLABLE SECTION ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
          />
        }
      >
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionRow}>
          <ActionCard
            title="Bookings"
            subtitle="Track & manage all bookings"
            icon="calendar-outline"
            colors={["#2563eb", "#1e3a8a"]}
            route="/(admin)/(tabs)/bookings"
          />
          <ActionCard
            title="Customers"
            subtitle="View customer profiles"
            icon="people-outline"
            colors={["#059669", "#064e3b"]}
            route="/(admin)/customers"
          />
        </View>

        <View style={styles.actionRow}>
          <ActionCard
            title="Staff"
            subtitle="Manage your team"
            icon="person-add-outline"
            colors={["#7c3aed", "#4c1d95"]}
            route="/(admin)/staff"
          />
          <ActionCard
            title="Invoices"
            subtitle="Billing & payments"
            icon="receipt-outline"
            colors={["#d97706", "#92400e"]}
            route="/(admin)/invoices"
          />
        </View>

        <View style={styles.actionRow}>
          <ActionCard
            title="Services"
            subtitle="Legacy service catalog"
            icon="construct-outline"
            colors={["#475569", "#1e293b"]}
            route="/(admin)/services"
          />
        </View>
      </ScrollView>

      {/* LOGOUT MODAL */}
      <ActionModal
        visible={logoutModal}
        type="danger"
        title="Logout?"
        message="Are you sure you want to logout of Clean.et?"
        confirmText="Logout"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModal(false)}
      />
    </LinearGradient>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  greeting: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },

  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  roleText: {
    color: "#94a3b8",
    fontSize: 12,
  },

  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  revenueCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  revenueLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 4,
  },
  revenueValue: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
  },
  revenueSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 4,
  },
  revenueIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },

  card: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  value: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  label: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  sub: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },

  statusRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  statusItem: {
    flex: 1,
    alignItems: "center",
  },
  statusValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statusLabel: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 14,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  actionCard: {
    borderRadius: 20,
    padding: 18,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  actionSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    marginTop: 3,
  },
});
