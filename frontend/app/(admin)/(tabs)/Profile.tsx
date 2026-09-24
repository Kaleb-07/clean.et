import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "../../../contexts/AuthContext";
import {
  Settings,
  Bell,
  ChevronRight,
  LogOut,
  Shield,
  HelpCircle,
  Briefcase,
  Scissors,
  Users,
  Calendar,
  FileText,
  Building,
  TrendingUp,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import ActionModal from "../../../src/components/ActionModal";
import API from "../../../src/api/client";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  const divisionTitle = user?.tenant?.business_name || "Sector Division";

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const [sectorStats, setSectorStats] = useState({
    gmv: 0,
    completedJobs: 0,
    staffCount: 0,
    servicesCount: 0,
  });

  useEffect(() => {
    loadSectorStats();
  }, [user]);

  const loadSectorStats = async () => {
    try {
      const [bRes, stRes, srvRes] = await Promise.allSettled([
        API.get("/bookings"),
        API.get("/staff"),
        API.get("/services"),
      ]);

      const bookings = bRes.status === "fulfilled"
        ? (Array.isArray(bRes.value.data) ? bRes.value.data : (bRes.value.data?.data ?? []))
        : [];
      const staff = stRes.status === "fulfilled"
        ? (Array.isArray(stRes.value.data) ? stRes.value.data : (stRes.value.data?.data ?? []))
        : [];
      const services = srvRes.status === "fulfilled"
        ? (Array.isArray(srvRes.value.data) ? srvRes.value.data : (srvRes.value.data?.data ?? []))
        : [];

      const completed = bookings.filter((b: any) => b.status === "completed");
      const gmv = completed.reduce((sum: number, b: any) => sum + Number(b.price || b.service?.price || 0), 0);

      setSectorStats({
        gmv,
        completedJobs: completed.length,
        staffCount: staff.length,
        servicesCount: services.length,
      });
    } catch (e) {
      console.log("Error loading sector profile stats:", e);
    }
  };

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => { });
    }
  };

  const handleLogout = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleItemPress = (route: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (route) {
      router.push(route as any);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "SD";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const superAdminMenuGroups = [
    {
      title: "ENTERPRISE GOVERNANCE",
      items: [
        { icon: Building, label: "Divisions & Sectors Governance", color: "#60A5FA", route: "/(admin)/tenants" },
        { icon: TrendingUp, label: "Platform Financial Invoices", color: "#34D399", route: "/(admin)/invoices" },
      ],
    },
    {
      title: "SETTINGS & PREFERENCES",
      items: [
        { icon: Bell, label: "Notification Alert Center", color: "#EC4899", route: "/(admin)/notifications" },
        { icon: Shield, label: "Privacy & Security Settings", color: "#8B5CF6", route: "/(admin)/privacy" },
        { icon: HelpCircle, label: "Enterprise Support & Documentation", color: "#06B6D4", route: "/(admin)/help" },
      ],
    },
  ];

  const sectorAdminMenuGroups = [
    {
      title: "DIVISION OPERATIONS HUB",
      items: [
        { icon: Briefcase, label: "Manage Division Crew Roster", color: "#A78BFA", route: "/(admin)/staff" },
        { icon: Scissors, label: "Post Division Services & Rates", color: "#FBBF24", route: "/(admin)/services" },
        { icon: Users, label: "Customer & Client Directory", color: "#34D399", route: "/(admin)/customers" },
        { icon: Calendar, label: "Incoming Dispatch Queue", color: "#60A5FA", route: "/(admin)/(tabs)/bookings" },
        { icon: FileText, label: "Reports & CSV Statements", color: "#10B981", route: "/(admin)/reports" },
      ],
    },
    {
      title: "SECTOR SETTINGS & ALERTS",
      items: [
        { icon: Bell, label: "Division Notifications & Alerts", color: "#EC4899", route: "/(admin)/notifications" },
        { icon: Shield, label: "Account Privacy & Security", color: "#6366F1", route: "/(admin)/privacy" },
        { icon: HelpCircle, label: "Sector Help & Operational Docs", color: "#38BDF8", route: "/(admin)/help" },
      ],
    },
  ];

  const menuGroups = isSuperAdmin ? superAdminMenuGroups : sectorAdminMenuGroups;

  return (
    <LinearGradient colors={["#0B0F19", "#111827", "#1E1B4B"]} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 50),
          paddingBottom: insets.bottom + 90,
        }}
      >
        {/* ── SECTOR PROFILE HEADER BANNER ── */}
        <View style={styles.header}>
          <LinearGradient
            colors={isSuperAdmin ? ["#4F46E5", "#10B981"] : ["#064E3B", "#047857"]}
            style={styles.avatarContainer}
          >
            <Text style={styles.avatarText}>
              {getInitials(isSuperAdmin ? user?.name || "Super Admin" : divisionTitle)}
            </Text>
          </LinearGradient>

          <View style={styles.roleBadge}>
            <Text style={[styles.roleBadgeText, !isSuperAdmin && { color: "#34D399" }]}>
              {isSuperAdmin ? "👑 SUPER ADMIN EXECUTIVE" : `🏢 ${divisionTitle.toUpperCase()}`}
            </Text>
          </View>

          <Text style={styles.name}>
            {user?.name || (isSuperAdmin ? "Platform Governance Admin" : "Sector Division Admin")}
          </Text>
          <Text style={styles.email}>
            {user?.email || "admin@clean.et"} &bull; {isSuperAdmin ? "Global Master Account" : "Licensed Sector Admin"}
          </Text>

          <Pressable
            style={styles.editButton}
            onPress={() => router.push("/profile/personal-info")}
          >
            <Text style={styles.editButtonText}>Edit Profile Info</Text>
          </Pressable>
        </View>

        {/* ── SECTOR OPERATIONAL METRICS CARDS (FOR SECTOR ADMIN) ── */}
        {!isSuperAdmin && (
          <View style={styles.statsCardContainer}>
            <Text style={styles.statsCardTitle}>📊 Sector Division Performance Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  ETB {sectorStats.gmv.toLocaleString("en-ET", { minimumFractionDigits: 0 })}
                </Text>
                <Text style={styles.statLabel}>Division Revenue</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: "#60A5FA" }]}>
                  {sectorStats.completedJobs}
                </Text>
                <Text style={styles.statLabel}>Jobs Completed</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: "#A78BFA" }]}>
                  {sectorStats.staffCount}
                </Text>
                <Text style={styles.statLabel}>On-Duty Techs</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: "#FBBF24" }]}>
                  {sectorStats.servicesCount}
                </Text>
                <Text style={styles.statLabel}>Active Services</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── MENU GROUPS ── */}
        {menuGroups.map((group, gIndex) => (
          <View key={gIndex} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.menuContainer}>
              {group.items.map((item, index) => (
                <BlurView key={index} intensity={20} tint="dark" style={styles.menuItem}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.menuItemPressable,
                      pressed && { backgroundColor: "rgba(255,255,255,0.06)" },
                    ]}
                    onPress={() => handleItemPress(item.route)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
                        <item.icon size={20} color={item.color} />
                      </View>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                    </View>
                    <ChevronRight size={18} color="#4B5563" />
                  </Pressable>
                </BlurView>
              ))}
            </View>
          </View>
        ))}

        {/* ── LOGOUT BUTTON ── */}
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.8 }]}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out of Portal</Text>
        </Pressable>

        <Text style={styles.version}>
          {isSuperAdmin
            ? "Clean.et Executive Governance &bull; v1.0.2"
            : `Clean.et ${divisionTitle} Portal &bull; v1.0.2`}
        </Text>
      </ScrollView>

      {/* ── LOGOUT CONFIRMATION MODAL ── */}
      <ActionModal
        visible={logoutModalVisible}
        type="danger"
        title="Log Out of Portal?"
        message={`Are you sure you want to log out of ${divisionTitle}? You will need to sign in again to access the portal.`}
        confirmText="Log Out"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  roleBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    marginBottom: 8,
  },
  roleBadgeText: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 14,
  },
  editButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  editButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  statsCardContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statsCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#34D399",
  },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "700",
  },
  groupContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 6,
  },
  menuContainer: {
    gap: 8,
  },
  menuItem: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  menuItemPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
    padding: 14,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "800",
  },
  version: {
    textAlign: "center",
    color: "#475569",
    fontSize: 11,
    marginTop: 20,
    marginBottom: 10,
  },
});
