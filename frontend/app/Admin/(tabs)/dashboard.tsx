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

import API from "../../../src/api/client";
import { useAuth } from "../../../contexts/AuthContext";
import ActionModal from "../../../src/components/ActionModal";

/* ---------- STAT CARD ---------- */
function StatCard({ icon, label, value, color }: any) {
  return (
    <BlurView intensity={30} tint="dark" style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </BlurView>
  );
}

/* ---------- ACTION CARD ---------- */
function ActionCard({ title, subtitle, icon, colors, route }: any) {
  return (
    <Pressable onPress={() => router.push(route)}>
      <LinearGradient colors={colors} style={styles.actionCard}>
        <View style={styles.actionIcon}>
          <Ionicons name={icon} size={22} color="#fff" />
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, b, c] = await Promise.all([
        API.get("/services"),
        API.get("/bookings"),
        API.get("/customers"),
      ]);

      setServices(s.data.data);
      setBookings(b.data.data);
      setCustomers(c.data.data);
    } catch (e) {
      console.log(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const revenue = bookings.reduce(
      (sum: number, b: any) => sum + (b.service?.price || 0),
      0,
    );

    return {
      services: services.length,
      bookings: bookings.length,
      customers: customers.length,
      revenue,
      pending: bookings.filter((b: any) => b.status === "pending").length,
      completed: bookings.filter((b: any) => b.status === "completed").length,
    };
  }, [services, bookings, customers]);

  const confirmLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <LinearGradient colors={["#0a0a18", "#1f1f3d"]} style={{ flex: 1 }}>
      {/* 🔒 FIXED TOP SECTION */}
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
        }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Manage your system</Text>
          </View>

          <Pressable onPress={() => setLogoutModal(true)}>
            <Ionicons name="log-out-outline" size={24} color="#f70505" />
          </Pressable>
        </View>

        {/* STATS */}
        <View style={styles.grid}>
          <StatCard
            icon="construct-outline"
            label="Services"
            value={stats.services}
            color="#8b5cf6"
          />
          <StatCard
            icon="calendar-outline"
            label="Bookings"
            value={stats.bookings}
            color="#3b82f6"
          />
          <StatCard
            icon="people-outline"
            label="Customers"
            value={stats.customers}
            color="#10b981"
          />
          <StatCard
            icon="cash-outline"
            label="Revenue"
            value={`$${stats.revenue}`}
            color="#f59e0b"
          />
        </View>

        <View style={styles.grid}>
          <StatCard
            icon="time-outline"
            label="Pending"
            value={stats.pending}
            color="#f59e0b"
          />
          <StatCard
            icon="checkmark-done-outline"
            label="Completed"
            value={stats.completed}
            color="#22c55e"
          />
        </View>
      </View>

      {/* 🔥 SCROLLABLE BOTTOM */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.section}>Manage</Text>

        <View style={styles.actionGrid}>
          <ActionCard
            title="Services"
            subtitle="Add & manage services"
            icon="construct-outline"
            colors={["#7c3aed", "#4c1d95"]}
            route="/Admin/services"
          />

          <ActionCard
            title="Bookings"
            subtitle="Track all bookings"
            icon="calendar-outline"
            colors={["#2563eb", "#1e3a8a"]}
            route="/Admin/bookings"
          />

          <ActionCard
            title="Customers"
            subtitle="View customers"
            icon="people-outline"
            colors={["#059669", "#064e3b"]}
            route="/Admin/customers"
          />
        </View>
      </ScrollView>

      {/* LOGOUT MODAL */}
      <ActionModal
        visible={logoutModal}
        type="danger"
        title="Logout?"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },

  card: {
    width: "48%",
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  iconWrap: {
    width: 38,
    height: 25,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  value: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  label: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },

  section: {
    color: "#fff",
    fontSize: 18,
    marginTop: 20,
    marginBottom: 12,
  },

  actionGrid: {
    gap: 14,
  },

  actionCard: {
    borderRadius: 20,
    padding: 18,
  },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  actionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  actionSubtitle: {
    color: "#e2e8f0",
    fontSize: 12,
    marginTop: 4,
  },
});
