import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { Settings, User, Bell, CreditCard, ChevronRight, LogOut, Shield, HelpCircle } from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";
import { Modal, TextInput } from "react-native";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  
  // Edit Profile State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [showSuccess, setShowSuccess] = useState(false);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style).catch(() => {});
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

  const handleUpdateProfile = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    // Simulating API call
    console.log("Updating profile:", { editName, editEmail });
    setEditModalVisible(false);
    setShowSuccess(true);
  };

  const handleItemPress = (id: string, label: string) => {
    console.log(`Menu item clicked: ${id}`);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    
    if (id === "edit-profile") {
      setEditName(user?.name || "");
      setEditEmail(user?.email || "");
      setEditModalVisible(true);
    } else if (id === "personal-info") {
      router.push("/profile/personal-info");
    } else if (id === "payments") {
      router.push("/profile/payments");
    } else if (id === "notifications") {
      router.push("/profile/notifications");
    } else if (id === "settings") {
      router.push("/profile/settings");
    } else if (id === "privacy") {
      router.push("/profile/privacy");
    } else if (id === "help") {
      router.push("/profile/help");
    } else {
      const message = `${label} settings will be available in the next update.`;
      if (Platform.OS === 'web') {
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
      title: t("account"),
      items: [
        { id: "personal-info", icon: User, label: t("personal_info"), color: "#3b82f6" },
        { id: "payments", icon: CreditCard, label: t("payment_methods"), color: "#10b981" },
        { id: "notifications", icon: Bell, label: t("notifications"), color: "#f59e0b" },
      ]
    },
    {
      title: t("settings_support"),
      items: [
        { id: "settings", icon: Settings, label: t("app_settings"), color: "#8b5cf6" },
        { id: "privacy", icon: Shield, label: t("privacy_security"), color: "#6366f1" },
        { id: "help", icon: HelpCircle, label: t("help_center"), color: "#ec4899" },
      ]
    }
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
          <Text style={styles.email}>{user?.email || "No email provided"}</Text>
          <Pressable 
            style={styles.editButton}
            onPress={() => handleItemPress("edit-profile", t("edit_profile"))}
          >
            <Text style={styles.editButtonText}>{t("edit_profile")}</Text>
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
                    onPress={() => handleItemPress(item.id, item.label)}
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

        <Text style={styles.version}>Version 1.0.2 (Build 45)</Text>
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
                  onChangeText={setEditName}
                  placeholder="Your Name"
                  placeholderTextColor="#475569"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Your Email"
                  placeholderTextColor="#475569"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable 
                  style={styles.cancelActionBtn} 
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelActionText}>Cancel</Text>
                </Pressable>
                
                <Pressable 
                  style={styles.updateActionBtn} 
                  onPress={handleUpdateProfile}
                >
                  <Text style={styles.updateActionText}>Update</Text>
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
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 20,
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
