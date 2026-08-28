import React, { useState } from "react";
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
  User,
  Bell,
  CreditCard,
  ChevronRight,
  LogOut,
  Shield,
  HelpCircle,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import ActionModal from "../../../src/components/ActionModal";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => {});
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

  const handleItemPress = (label: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    if (label === "Edit Profile" || label === "Personal Information") {
      router.push("/profile/personal-info");
    } else if (label === "Payment Methods") {
      router.push("/profile/payments");
    } else if (label === "Notifications") {
      router.push("/profile/notifications");
    } else if (label === "App Settings") {
      router.push("/profile/settings");
    } else if (label === "Privacy & Security") {
      router.push("/profile/privacy");
    } else if (label === "Help Center") {
      router.push("/profile/help");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "SA";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const menuGroups = [
    {
      title: "ACCOUNT",
      items: [
        { icon: User, label: "Personal Information", color: "#3b82f6" },
        { icon: CreditCard, label: "Payment Methods", color: "#10b981" },
        { icon: Bell, label: "Notifications", color: "#f59e0b" },
      ],
    },
    {
      title: "SETTINGS & SUPPORT",
      items: [
        { icon: Settings, label: "App Settings", color: "#8b5cf6" },
        { icon: Shield, label: "Privacy & Security", color: "#6366f1" },
        { icon: HelpCircle, label: "Help Center", color: "#ec4899" },
      ],
    },
  ];

  return (
    <LinearGradient colors={["#0B0F19", "#111827", "#1E1B4B"]} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 50),
          paddingBottom: insets.bottom + 90,
        }}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <LinearGradient colors={["#4F46E5", "#10B981"]} style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials(user?.name || "Super Admin")}</Text>
          </LinearGradient>

          <Text style={styles.name}>{user?.name || "Platform Super Admin"}</Text>
          <Text style={styles.email}>{user?.email || "superadmin@clean.et"}</Text>

          <Pressable style={styles.editButton} onPress={() => handleItemPress("Edit Profile")}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
        </View>

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
                    onPress={() => handleItemPress(item.label)}
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
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.version}>Clean.et Enterprise Governance &bull; v1.0.2</Text>
      </ScrollView>

      {/* ── LOGOUT CONFIRMATION MODAL ── */}
      <ActionModal
        visible={logoutModalVisible}
        type="danger"
        title="Log Out?"
        message="Are you sure you want to log out of your account? You will need to sign in again to access the portal."
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
    marginBottom: 28,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  editButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  groupContainer: {
    marginBottom: 22,
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
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  menuItemPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "800",
  },
  version: {
    textAlign: "center",
    color: "#475569",
    fontSize: 11,
    marginTop: 24,
    marginBottom: 16,
  },
});
