import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import API from "../../src/api/client";
import { useAuth } from "../../contexts/AuthContext";
import ActionModal from "../../src/components/ActionModal";

export default function StaffProfile() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [stats, setStats] = useState({ assigned: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [logoutModal, setLogoutModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [stRes, bRes] = await Promise.allSettled([
        API.get("/staff"),
        API.get("/bookings"),
      ]);

      if (stRes.status === "fulfilled") {
        const list: any[] = stRes.value.data?.data ?? stRes.value.data ?? [];
        const mine = list.find(
          (s: any) => s.user?.id === user?.id || s.user_id === user?.id
        );
        setStaffProfile(mine ?? null);
      }

      if (bRes.status === "fulfilled") {
        const bookings: any[] = bRes.value.data?.data ?? bRes.value.data ?? [];
        const myBookings = bookings.filter(
          (b: any) =>
            b.staff?.user?.id === user?.id ||
            (b as any).staff_id === staffProfile?.id
        );
        setStats({
          assigned:   myBookings.length,
          inProgress: myBookings.filter((b: any) => b.status === "in_progress" || b.status === "driver_assigned").length,
          completed:  myBookings.filter((b: any) => b.status === "completed" || b.status === "invoiced").length,
        });
      }
    } catch (e) {
      console.log("Error loading staff profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  const getInitials = (name: string) =>
    (name || "T")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <LinearGradient colors={["#0B0F19", "#111827", "#1E1B4B"]} style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 50),
          paddingBottom: insets.bottom + 90,
        }}
      >
        {/* ── AVATAR & IDENTITY ── */}
        <View style={styles.header}>
          <LinearGradient
            colors={["#5B21B6", "#7C3AED"]}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarText}>
              {getInitials(user?.name || "Tech")}
            </Text>
          </LinearGradient>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>👷 FIELD TECHNICIAN</Text>
          </View>

          <Text style={styles.name}>{user?.name || "Technician"}</Text>
          <Text style={styles.email}>
            {user?.email || user?.phone || "—"}
          </Text>

          {loading ? (
            <ActivityIndicator color="#A78BFA" style={{ marginTop: 12 }} />
          ) : staffProfile ? (
            <View style={styles.roleTitleBadge}>
              <Ionicons name="briefcase-outline" size={13} color="#A78BFA" />
              <Text style={styles.roleTitleText}>
                {staffProfile.role_title || "Field Tech"}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── PERFORMANCE STATS ── */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Performance Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#A78BFA" }]}>{stats.assigned}</Text>
              <Text style={styles.statLabel}>Total Assigned</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#60A5FA" }]}>{stats.inProgress}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#34D399" }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* ── CERTIFICATIONS ── */}
        {staffProfile?.sector_qualifications?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏅 Sector Certifications</Text>
            <View style={styles.qualRow}>
              {staffProfile.sector_qualifications.map((q: string) => (
                <View key={q} style={styles.qualTag}>
                  <Text style={styles.qualTagText}>
                    {q.replace(/-/g, " ").toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── ACCOUNT INFO ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.infoCard}>
            {[
              { icon: "person-outline", label: "Full Name", value: user?.name || "—" },
              { icon: "mail-outline",   label: "Email",     value: user?.email || "—" },
              { icon: "call-outline",   label: "Phone",     value: user?.phone || "—" },
              { icon: "shield-outline", label: "Role",      value: "Field Technician" },
            ].map((row) => (
              <View key={row.label} style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Ionicons name={row.icon as any} size={16} color="#A78BFA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── LOGOUT ── */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.version}>Clean.et Field Technician Portal · v1.0.2</Text>
      </ScrollView>

      <ActionModal
        visible={logoutModal}
        type="danger"
        title="Log Out?"
        message="Are you sure you want to log out of the technician portal?"
        confirmText="Log Out"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "rgba(167,139,250,0.3)",
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#FFF" },
  roleBadge: {
    backgroundColor: "rgba(167,139,250,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
    marginBottom: 10,
  },
  roleBadgeText: { color: "#C4B5FD", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  name: { fontSize: 22, fontWeight: "800", color: "#FFF", marginBottom: 4 },
  email: { fontSize: 13, color: "#94A3B8" },
  roleTitleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "rgba(167,139,250,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.25)",
  },
  roleTitleText: { color: "#A78BFA", fontWeight: "700", fontSize: 13 },

  statsCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statsTitle: { color: "#F8FAFC", fontWeight: "800", fontSize: 13, marginBottom: 14 },
  statsGrid: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, color: "#64748B", marginTop: 3, fontWeight: "700", textAlign: "center" },

  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  qualRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  qualTag: {
    backgroundColor: "rgba(167,139,250,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
  },
  qualTagText: { color: "#C4B5FD", fontSize: 11, fontWeight: "700" },

  infoCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#334155",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(167,139,250,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 10, color: "#64748B", fontWeight: "700", textTransform: "uppercase" },
  infoValue: { fontSize: 14, color: "#F8FAFC", fontWeight: "600", marginTop: 1 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },
  logoutText: { color: "#EF4444", fontSize: 14, fontWeight: "800" },
  version: {
    textAlign: "center",
    color: "#475569",
    fontSize: 11,
    marginTop: 20,
    marginBottom: 10,
  },
});
