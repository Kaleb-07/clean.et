import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { router, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ChevronLeft,
  Pencil,
  User as UserIcon,
  FileText,
  Heart,
  MapPin,
  Settings as SettingsIcon,
  ArrowLeft,
  LogOut,
} from "lucide-react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

const STORAGE_KEY = "@user_privacy_settings";

interface PrivacySettings {
  twoFactor: boolean;
  biometricLogin: boolean;
  loginAlerts: boolean;
}

const DEFAULT_SETTINGS: PrivacySettings = {
  twoFactor: false,
  biometricLogin: true,
  loginAlerts: true,
};

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();

  // Redirect admin users to the executive administration screen
  if (user?.role === "super_admin" || user?.role === "tenant_admin") {
    return <Redirect href="/(admin)/privacy" />;
  }

  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
        }
      } catch (e) {
        console.error("Failed to load privacy settings", e);
      }
    })();
  }, []);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  const handleToggle = async (key: keyof PrivacySettings, val: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save privacy settings", e);
    }
  };

  const handleLogout = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleBack = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "AJ";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#0B0F19" : "#F8FAFC" },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
      >
        {/* ── TOP RED BANNER (Matches Screenshot) ── */}
        <LinearGradient
          colors={["#EF4444", "#DC2626"]}
          style={[
            styles.headerBanner,
            { paddingTop: Math.max(insets.top + 8, 28) },
          ]}
        >
          {/* Top Bar: Back, Title, Edit */}
          <View style={styles.topBar}>
            <Pressable onPress={handleBack} style={styles.headerIconButton}>
              <ChevronLeft size={22} color="#ffffff" strokeWidth={2.5} />
            </Pressable>

            <Text style={styles.topBarTitle}>My Profile</Text>

            <Pressable
              onPress={() => router.replace("/(tabs)/profile")}
              style={styles.headerIconButton}
            >
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
                {user?.phone || "+1 555-0199"} • Male, 32 yrs
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── 5 PILL TABS (Info, History, Saved, Address, Settings) ── */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[
              styles.tabPill,
              styles.tabPillInactive,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
            ]}
          >
            <UserIcon
              size={18}
              color={isDark ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Info
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/booking")}
            style={[
              styles.tabPill,
              styles.tabPillInactive,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
            ]}
          >
            <FileText
              size={18}
              color={isDark ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              History
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/vehicles")}
            style={[
              styles.tabPill,
              styles.tabPillInactive,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
            ]}
          >
            <Heart
              size={18}
              color={isDark ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Saved
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[
              styles.tabPill,
              styles.tabPillInactive,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
            ]}
          >
            <MapPin
              size={18}
              color={isDark ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Address
            </Text>
          </Pressable>

          {/* Active Settings Tab */}
          <Pressable style={[styles.tabPill, styles.tabPillActive]}>
            <SettingsIcon size={18} color="#ffffff" strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: "#ffffff" }]}>
              Settings
            </Text>
          </Pressable>
        </View>

        {/* ── SUBPAGE CONTENT (Matches Screenshot) ── */}
        <View style={styles.bodyContent}>
          {/* Header row: Back button & Title */}
          <View style={styles.subPageHeaderRow}>
            <Pressable
              onPress={handleBack}
              style={[
                styles.subPageBackBtn,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              <ArrowLeft
                size={18}
                color={isDark ? "#FFFFFF" : "#0F172A"}
                strokeWidth={2.4}
              />
            </Pressable>
            <Text
              style={[
                styles.subPageTitleText,
                { color: isDark ? "#FFFFFF" : "#0F172A" },
              ]}
            >
              Privacy & Security
            </Text>
          </View>

          {/* Security Toggles Card (Matches Screenshot) */}
          <View
            style={[
              styles.settingsCardBox,
              {
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderColor: isDark ? "#334155" : "#E2E8F0",
              },
            ]}
          >
            {/* 1. Two-Factor Authentication */}
            <View style={styles.settingsRowItem}>
              <View style={styles.settingsTextCol}>
                <Text
                  style={[
                    styles.settingsItemLabel,
                    { color: isDark ? "#FFFFFF" : "#0F172A" },
                  ]}
                >
                  Two-Factor Authentication
                </Text>
                <Text
                  style={[
                    styles.settingsItemSubtitle,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  Add an extra layer of security
                </Text>
              </View>
              <Switch
                value={settings.twoFactor}
                onValueChange={(val) => handleToggle("twoFactor", val)}
                trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View
              style={[
                styles.settingsDivider,
                { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
              ]}
            />

            {/* 2. Biometric Login */}
            <View style={styles.settingsRowItem}>
              <View style={styles.settingsTextCol}>
                <Text
                  style={[
                    styles.settingsItemLabel,
                    { color: isDark ? "#FFFFFF" : "#0F172A" },
                  ]}
                >
                  Biometric Login
                </Text>
                <Text
                  style={[
                    styles.settingsItemSubtitle,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  Use fingerprint or face recognition
                </Text>
              </View>
              <Switch
                value={settings.biometricLogin}
                onValueChange={(val) => handleToggle("biometricLogin", val)}
                trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View
              style={[
                styles.settingsDivider,
                { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
              ]}
            />

            {/* 3. Login Alerts */}
            <View style={styles.settingsRowItem}>
              <View style={styles.settingsTextCol}>
                <Text
                  style={[
                    styles.settingsItemLabel,
                    { color: isDark ? "#FFFFFF" : "#0F172A" },
                  ]}
                >
                  Login Alerts
                </Text>
                <Text
                  style={[
                    styles.settingsItemSubtitle,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  Get notified on new logins
                </Text>
              </View>
              <Switch
                value={settings.loginAlerts}
                onValueChange={(val) => handleToggle("loginAlerts", val)}
                trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* LOG OUT BUTTON (Matches Screenshot) */}
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.screenshotLogoutBtn,
              pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
            ]}
          >
            <LogOut
              size={18}
              color="#EF4444"
              strokeWidth={2.2}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.screenshotLogoutText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 4,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#EF4444",
  },
  profileInfoTextCol: {
    flex: 1,
  },
  profileName: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  profileEmail: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  profileMeta: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "500",
  },

  // ── Tabs Row ──
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 16,
    gap: 8,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabPillActive: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabPillInactive: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Body & Subpage ──
  bodyContent: {
    paddingHorizontal: 16,
  },
  subPageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  subPageBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  subPageTitleText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  // ── Settings Card Box ──
  settingsCardBox: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  settingsRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  settingsTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  settingsItemLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  settingsItemSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  settingsDivider: {
    height: 1,
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
});
