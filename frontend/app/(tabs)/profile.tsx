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
  Modal,
  TextInput,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  Pencil,
  User as UserIcon,
  FileText,
  Heart,
  MapPin,
  Settings as SettingsIcon,
  Activity,
  CalendarDays,
  Receipt,
  LogOut,
  Car,
  Building,
  CreditCard,
  Bell,
  Briefcase,
  Shield,
  HelpCircle,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  CheckCircle2,
} from "lucide-react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useColors } from "../../hooks/useColors";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import ActionModal from "../../src/components/ActionModal";

type ProfileTab = "info" | "history" | "saved" | "address" | "settings";

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
  const colors = useColors();
  const { isDark, toggleDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { user, logout, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>("info");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Edit Profile State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  const handleTabPress = (tab: ProfileTab) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (tab === "history") {
      router.push("/(tabs)/booking");
      return;
    }
    if (tab === "saved") {
      router.push("/vehicles");
      return;
    }
    if (tab === "address") {
      router.push("/building-profiles");
      return;
    }
    setActiveTab(tab);
  };

  const handleOpenEdit = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setEditPhone(user?.phone || "");
    setEditError("");
    setEditModalVisible(true);
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
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e instanceof Error ? e.message : "Failed to update profile.");
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const menuGroups = [
    {
      title: "Account & Assets",
      items: [
        { icon: UserIcon, label: "Personal Information", route: "/profile/personal-info", color: "#3B82F6" },
        { icon: Car, label: "My Vehicles", route: "/vehicles", color: "#6366F1" },
        { icon: Building, label: "My Building Profiles", route: "/building-profiles", color: "#EC4899" },
        { icon: CreditCard, label: "My Subscription", route: "/profile/subscription", color: "#8B5CF6" },
        { icon: Receipt, label: "My Invoices", route: "/invoices", color: "#10B981" },
        { icon: Bell, label: "Notifications", route: "/profile/notifications", color: "#F59E0B" },
        { icon: Briefcase, label: "Fleet Accounts", route: "/profile/fleet", color: "#A78BFA" },
      ],
    },
    {
      title: "Settings & Support",
      items: [
        { icon: SettingsIcon, label: "App & System Settings", route: "/profile/settings", color: "#8B5CF6" },
        { icon: Shield, label: "Privacy & Security", route: "/profile/privacy", color: "#06B6D4" },
        { icon: HelpCircle, label: "Help Center", route: "/profile/help", color: "#14B8A6" },
      ],
    },
  ];

  const getInitials = (name?: string) => {
    if (!name) return "AJ";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "June 15, 2024";

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0B0F19" : "#F8FAFC" }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 90,
        }}
      >
        {/* ── TOP RED BANNER (As shown in screenshot) ── */}
        <LinearGradient
          colors={["#EF4444", "#DC2626"]}
          style={[styles.headerBanner, { paddingTop: Math.max(insets.top + 8, 28) }]}
        >
          {/* Top Bar: Back, Title, Edit */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home"))}
              style={styles.headerIconButton}
            >
              <ChevronLeft size={22} color="#ffffff" strokeWidth={2.5} />
            </Pressable>

            <Text style={styles.topBarTitle}>My Profile</Text>

            <Pressable onPress={handleOpenEdit} style={styles.headerIconButton}>
              <Pencil size={18} color="#ffffff" strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* User Profile Card within Banner */}
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              </View>
            </View>

            <View style={styles.profileInfoTextCol}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.name || "Alex Johnson"}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email || "alex.johnson@email.com"}
              </Text>
              <Text style={styles.profileMeta} numberOfLines={1}>
                {user?.phone || "+1 555-0199"} • Customer, Active
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── 5 PILL TABS (Info, History, Saved, Address, Settings) ── */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => handleTabPress("info")}
            style={[
              styles.tabPill,
              activeTab === "info"
                ? styles.tabPillActive
                : [styles.tabPillInactive, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }],
            ]}
          >
            <UserIcon
              size={18}
              color={activeTab === "info" ? "#ffffff" : isDark ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === "info" ? "#ffffff" : isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Info
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabPress("history")}
            style={[
              styles.tabPill,
              styles.tabPillInactive,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
            ]}
          >
            <FileText size={18} color={isDark ? "#94A3B8" : "#64748B"} strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              History
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabPress("saved")}
            style={[
              styles.tabPill,
              styles.tabPillInactive,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
            ]}
          >
            <Heart size={18} color={isDark ? "#94A3B8" : "#64748B"} strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Saved
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabPress("address")}
            style={[
              styles.tabPill,
              styles.tabPillInactive,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
            ]}
          >
            <MapPin size={18} color={isDark ? "#94A3B8" : "#64748B"} strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Address
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabPress("settings")}
            style={[
              styles.tabPill,
              activeTab === "settings"
                ? styles.tabPillActive
                : [styles.tabPillInactive, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }],
            ]}
          >
            <SettingsIcon
              size={18}
              color={activeTab === "settings" ? "#ffffff" : isDark ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === "settings" ? "#ffffff" : isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Settings
            </Text>
          </Pressable>
        </View>

        {/* ── TAB CONTENT: INFO VIEW (Matches user's screenshot) ── */}
        {activeTab === "info" && (
          <View style={styles.bodyContent}>
            {/* PREMIUM FEATURES SECTION */}
            <Text style={[styles.sectionHeading, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              PREMIUM FEATURES
            </Text>

            <View style={styles.featuresRow}>
              {/* Feature 1: Live Tracker */}
              <Pressable
                onPress={() => router.push("/(tabs)/booking")}
                style={({ pressed }) => [
                  styles.featureCard,
                  { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.featureIconBadge}>
                  <Activity size={20} color="#EF4444" strokeWidth={2.4} />
                </View>
                <Text style={[styles.featureCardTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Live Tracker
                </Text>
              </Pressable>

              {/* Feature 2: Availability */}
              <Pressable
                onPress={() => router.push("/(tabs)/home")}
                style={({ pressed }) => [
                  styles.featureCard,
                  { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.featureIconBadge}>
                  <CalendarDays size={20} color="#EF4444" strokeWidth={2.4} />
                </View>
                <Text style={[styles.featureCardTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Availability
                </Text>
              </Pressable>

              {/* Feature 3: Records */}
              <Pressable
                onPress={() => router.push("/invoices")}
                style={({ pressed }) => [
                  styles.featureCard,
                  { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.featureIconBadge}>
                  <Receipt size={20} color="#EF4444" strokeWidth={2.4} />
                </View>
                <Text style={[styles.featureCardTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Records
                </Text>
              </Pressable>
            </View>

            {/* DETAILS TABLE CARD */}
            <View
              style={[
                styles.detailsCard,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              {/* Row: Full Name */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Full Name
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  {user?.name || "Alex Johnson"}
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Email */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Email
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  {user?.email || "alex.johnson@email.com"}
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Phone */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Phone
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  {user?.phone || "+1 555-0199"}
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Member Since */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Member Since
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  {memberSince}
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Account Type */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Account Type
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Customer (Verified)
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Service Location */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  City / Location
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Addis Ababa, Ethiopia
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Preferred Language */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Language
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  {language ? language.toUpperCase() : "English"}
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Security Status */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Account Security
                </Text>
                <View style={styles.statusBadgeRow}>
                  <View style={styles.statusDotGreen} />
                  <Text style={[styles.detailTableValue, { color: "#10B981" }]}>
                    Active & Secure
                  </Text>
                </View>
              </View>
            </View>

            {/* LOG OUT BUTTON (Matches screenshot) */}
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.screenshotLogoutBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
              ]}
            >
              <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
              <Text style={styles.screenshotLogoutText}>Log Out</Text>
            </Pressable>
          </View>
        )}

        {/* ── TAB CONTENT: SETTINGS VIEW (Current Profile page set here) ── */}
        {activeTab === "settings" && (
          <View style={styles.bodyContent}>
            {/* Quick Preferences: Dark Mode & Language */}
            <View
              style={[
                styles.settingsCardBox,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              <View style={styles.settingsRowItem}>
                <View style={styles.settingsRowLeft}>
                  <View style={[styles.settingsIconPill, { backgroundColor: "rgba(139,92,246,0.15)" }]}>
                    {isDark ? <Moon size={18} color="#8B5CF6" /> : <Sun size={18} color="#F59E0B" />}
                  </View>
                  <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Dark Mode Theme
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={(val) => toggleDark(val)}
                  trackColor={{ false: "#CBD5E1", true: "#8B5CF6" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              <Pressable
                onPress={() => router.push("/profile/settings")}
                style={styles.settingsRowItem}
              >
                <View style={styles.settingsRowLeft}>
                  <View style={[styles.settingsIconPill, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                    <Globe size={18} color="#10B981" />
                  </View>
                  <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    App Language & Preferences
                  </Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Menu Groups from Current Profile Page */}
            {menuGroups.map((group, gIndex) => (
              <View key={gIndex} style={styles.settingsGroupBlock}>
                <Text style={[styles.groupTitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  {group.title}
                </Text>
                <View
                  style={[
                    styles.settingsCardBox,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  {group.items.map((item, index) => (
                    <React.Fragment key={index}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.settingsRowItem,
                          pressed && { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)" },
                        ]}
                        onPress={() => {
                          triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                          router.push(item.route as any);
                        }}
                      >
                        <View style={styles.settingsRowLeft}>
                          <View style={[styles.settingsIconPill, { backgroundColor: `${item.color}15` }]}>
                            <item.icon size={18} color={item.color} />
                          </View>
                          <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                            {item.label}
                          </Text>
                        </View>
                        <ChevronRight size={18} color="#94A3B8" />
                      </Pressable>
                      {index < group.items.length - 1 && (
                        <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            ))}

            {/* LOG OUT BUTTON */}
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.screenshotLogoutBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
              ]}
            >
              <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
              <Text style={styles.screenshotLogoutText}>Log Out</Text>
            </Pressable>

            <Text style={[styles.versionText, { color: isDark ? "#64748B" : "#94A3B8" }]}>
              Clean.et App Version 1.0.4 (Build 48)
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Logout ActionModal ── */}
      <ActionModal
        visible={logoutModalVisible}
        type="danger"
        title="Log Out?"
        message="Are you sure you want to log out of your account? You will need to sign in again to view your bookings."
        confirmText="Log Out"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />

      {/* ── Edit Profile Modal ── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !editLoading && setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.editModalContainer}>
            <View
              style={[
                styles.editModalContent,
                { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" },
              ]}
            >
              <Text style={[styles.editModalTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                Edit Profile
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>Full Name</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                  value={editName}
                  onChangeText={(t) => {
                    setEditName(t);
                    setEditError("");
                  }}
                  placeholder="Your Name"
                  placeholderTextColor="#64748B"
                  editable={!editLoading}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>Phone Number</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                  value={editPhone}
                  onChangeText={(t) => {
                    setEditPhone(t);
                    setEditError("");
                  }}
                  placeholder="0911000000"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  editable={!editLoading}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>Email Address</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                  value={editEmail}
                  onChangeText={(t) => {
                    setEditEmail(t);
                    setEditError("");
                  }}
                  placeholder="name@email.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!editLoading}
                />
              </View>

              {editError ? <Text style={styles.editErrorText}>{editError}</Text> : null}

              <View style={styles.modalActionsRow}>
                <Pressable
                  style={[styles.modalCancelBtn, editLoading && { opacity: 0.5 }]}
                  onPress={() => !editLoading && setEditModalVisible(false)}
                >
                  <Text style={[styles.modalCancelBtnText, { color: isDark ? "#94A3B8" : "#64748B" }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalSaveBtn, editLoading && { opacity: 0.7 }]}
                  onPress={handleUpdateProfile}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Toast Feedback ── */}
      {showSuccessToast && (
        <View style={styles.successToast}>
          <CheckCircle2 size={18} color="#10B981" />
          <Text style={styles.successToastText}>Profile updated successfully!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Top Red Banner ──
  headerBanner: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 4,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  avatarInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  profileInfoTextCol: {
    flex: 1,
  },
  profileName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  profileEmail: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  profileMeta: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 12,
    fontWeight: "500",
  },

  // ── 5 Navigation Pill Tabs ──
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    gap: 8,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  tabPillInactive: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Body Content Container ──
  bodyContent: {
    paddingHorizontal: 16,
  },

  // ── Section Heading ──
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 4,
  },

  // ── Premium Features Row ──
  featuresRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  featureIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  featureCardTitle: {
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Details Table Card ──
  detailsCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  detailTableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  detailTableLabel: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  detailTableValue: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  detailTableDivider: {
    height: 1,
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },

  // ── Log Out Button ──
  screenshotLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  screenshotLogoutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Settings View Styles ──
  settingsCardBox: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 18,
    overflow: "hidden",
  },
  settingsRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingsIconPill: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsItemLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  settingsGroupBlock: {
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 16,
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  editModalContainer: {
    width: "100%",
    maxWidth: 420,
  },
  editModalContent: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  editErrorText: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 14,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  modalSaveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Toast ──
  successToast: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.95)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  successToastText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
