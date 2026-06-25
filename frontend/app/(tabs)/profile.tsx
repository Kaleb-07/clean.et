import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "../../contexts/AuthContext";
import {
  Settings,
  User,
  Bell,
  CreditCard,
  ChevronRight,
  LogOut,
  Shield,
  HelpCircle,
  Pencil,
  Car,
  Building,
  Receipt,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";
import { Modal, TextInput } from "react-native";

// ─── Ethiopian Phone Formatter ────────────────────────────────────────────────
function formatEthiopianPhone(input: string): string {
  let cleaned = input.trim().replace(/\s+/g, "");
  if (cleaned.startsWith("+251")) {
    return cleaned;
  }
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith("251")) {
    return "+" + cleaned;
  }
  return "+251" + cleaned;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  // Edit Profile State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => { });
    }
  };

  const handleLogout = () => {
    console.log("Logout button clicked");
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      console.log("Logging out user...");
      await logout();
      router.replace("/(auth)/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      setEditError("Name and phone number are required.");
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setEditLoading(true);
    setEditError("");
    try {
      const formattedPhone = formatEthiopianPhone(editPhone);
      await updateUser({
        name: editName.trim(),
        email: editEmail.trim() || null,
        phone: formattedPhone,
      });
      setEditModalVisible(false);
      setShowSuccess(true);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e instanceof Error ? e.message : "Failed to update profile.");
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleItemPress = (label: string) => {
    console.log(`Menu item clicked: ${label}`);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    if (label === "Edit Profile") {
      setEditName(user?.name || "");
      setEditEmail(user?.email || "");
      setEditPhone(user?.phone || "");
      setEditModalVisible(true);
    } else if (label === "Personal Information") {
      router.push("/profile/personal-info");
    } else if (label === "Payment Methods") {
      router.push("/profile/payments");
    } else if (label === "My Vehicles") {
      router.push("/vehicles");
    } else if (label === "My Building Profiles") {
      router.push("/building-profiles");
    } else if (label === "My Invoices") {
      router.push("/invoices");
    } else if (label === "Notifications") {
      router.push("/profile/notifications");
    } else if (label === "App Settings") {
      router.push("/profile/settings");
    } else if (label === "Privacy & Security") {
      router.push("/profile/privacy");
    } else if (label === "Help Center") {
      router.push("/profile/help");
    } else {
      const message = `${label} settings will be available in the next update.`;
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert(label, message);
      }
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "GU";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const menuGroups = [
    {
      title: "Account & Assets",
      items: [
        { icon: User, label: "Personal Information", color: "#3b82f6" },
        { icon: Car, label: "My Vehicles", color: "#6366f1" },
        { icon: Building, label: "My Building Profiles", color: "#ec4899" },
        { icon: Receipt, label: "My Invoices", color: "#10b981" },
        { icon: Bell, label: "Notifications", color: "#f59e0b" },
      ],
    },
    {
      title: "Settings & Support",
      items: [
        { icon: Settings, label: "App Settings", color: "#8b5cf6" },
        { icon: Shield, label: "Privacy & Security", color: "#06b6d4" },
        { icon: HelpCircle, label: "Help Center", color: "#14b8a6" },
      ],
    },
  ];

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 60),
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <LinearGradient
            colors={["#6d28d9", "#3b82f6"]}
            style={styles.avatarContainer}
          >
            <Text style={styles.avatarText}>{getInitials(user?.name || "Guest")}</Text>
          </LinearGradient>
          <Text style={styles.name}>{user?.name || "Guest User"}</Text>
          <Text style={styles.email}>
            {user?.phone ? `${user.phone}` : ""}
            {user?.email && user?.phone ? "  ·  " : ""}
            {user?.email ?? ""}
          </Text>
          <Pressable
            style={styles.editButton}
            onPress={() => handleItemPress("Edit Profile")}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* MENU GROUPS */}
        {menuGroups.map((group, gIndex) => (
          <View key={gIndex} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.menuContainer}>
              {group.items.map((item, index) => (
                <BlurView key={index} intensity={15} tint="dark" style={styles.menuItem}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.menuItemPressable,
                      pressed && { backgroundColor: "rgba(255,255,255,0.05)" },
                    ]}
                    onPress={() => handleItemPress(item.label)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                        <item.icon size={20} color={item.color} />
                      </View>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                    </View>
                    <ChevronRight size={18} color="#4b5563" />
                  </Pressable>
                </BlurView>
              ))}
            </View>
          </View>
        ))}

        {/* LOGOUT */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.version}>Version 1.0.3 (Build 46)</Text>
      </ScrollView>

      {/* Logout Modal */}
      <ActionModal
        visible={modalVisible}
        type="danger"
        title="Log Out?"
        message="Are you sure you want to log out of your account? You will need to sign in again to book a wash."
        confirmText="Log Out"
        onConfirm={confirmLogout}
        onCancel={() => setModalVisible(false)}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !editLoading && setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.editModalContainer}>
            <BlurView intensity={90} tint="dark" style={styles.editModalContent}>
              <Text style={styles.editModalTitle}>Edit Profile</Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={(t) => { setEditName(t); setEditError(""); }}
                  placeholder="Your Name"
                  placeholderTextColor="#475569"
                  editable={!editLoading}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={editPhone}
                  onChangeText={(t) => { setEditPhone(t); setEditError(""); }}
                  placeholder="9XX XXX XXXX"
                  placeholderTextColor="#475569"
                  keyboardType="phone-pad"
                  editable={!editLoading}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={editEmail}
                  onChangeText={(t) => { setEditEmail(t); setEditError(""); }}
                  placeholder="Your Email"
                  placeholderTextColor="#475569"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!editLoading}
                />
              </View>

              {editError ? (
                <Text style={styles.editError}>{editError}</Text>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.cancelActionBtn, editLoading && { opacity: 0.5 }]}
                  onPress={() => { if (!editLoading) setEditModalVisible(false); }}
                >
                  <Text style={styles.cancelActionText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.updateActionBtn, editLoading && { opacity: 0.7 }]}
                  onPress={handleUpdateProfile}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.updateActionText}>Update</Text>
                  )}
                </Pressable>
              </View>
            </BlurView>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <ActionModal
        visible={showSuccess}
        type="success"
        title="Profile Updated"
        message="Your personal information has been successfully updated. These changes are now live!"
        confirmText="Perfect"
        onConfirm={() => setShowSuccess(false)}
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
    marginBottom: 32,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.1)",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#ffffff",
  },
  name: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 20,
    textAlign: "center",
  },
  editButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  editButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  groupContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 8,
  },
  menuContainer: {
    gap: 8,
  },
  menuItem: {
    borderRadius: 20,
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
    gap: 16,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f8fafc",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    padding: 18,
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "700",
  },
  version: {
    textAlign: "center",
    color: "#475569",
    fontSize: 12,
    marginTop: 32,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  editModalContainer: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  editModalContent: {
    padding: 32,
    paddingBottom: 50,
  },
  editModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 32,
    textAlign: "center",
  },
  inputWrapper: {
    marginBottom: 24,
  },
  inputLabel: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    color: "#ffffff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  editError: {
    color: "#f87171",
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: "500",
  },
  cancelActionBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  cancelActionText: {
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: 16,
  },
  updateActionBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#6d28d9",
  },
  updateActionText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
