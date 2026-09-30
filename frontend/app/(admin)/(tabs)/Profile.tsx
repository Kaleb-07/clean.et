import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
  Globe,
  Moon,
  Sun,
  Check,
  X,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import ActionModal from "../../../src/components/ActionModal";
import API from "../../../src/api/client";
import { useColors } from "../../../hooks/useColors";
import { useTheme } from "../../../contexts/ThemeContext";
import { useLanguage } from "../../../contexts/LanguageContext";

const LANGUAGES = ["English", "Amharic"];
const LANGUAGE_CODE_MAP: Record<string, string> = {
  English: "en",
  Amharic: "am",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const colors = useColors();
  const { isDark, toggleDark } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const isSuperAdmin = user?.role === "super_admin";
  const divisionTitle = user?.tenant?.business_name || "Sector Division";

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [langSuccessToast, setLangSuccessToast] = useState<{
    title: string;
    message: string;
  } | null>(null);

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

      const bookings =
        bRes.status === "fulfilled"
          ? Array.isArray(bRes.value.data)
            ? bRes.value.data
            : (bRes.value.data?.data ?? [])
          : [];
      const staff =
        stRes.status === "fulfilled"
          ? Array.isArray(stRes.value.data)
            ? stRes.value.data
            : (stRes.value.data?.data ?? [])
          : [];
      const services =
        srvRes.status === "fulfilled"
          ? Array.isArray(srvRes.value.data)
            ? srvRes.value.data
            : (srvRes.value.data?.data ?? [])
          : [];

      const completed = bookings.filter((b: any) => b.status === "completed");
      const gmv = completed.reduce(
        (sum: number, b: any) =>
          sum + Number(b.price || b.service?.price || 0),
        0,
      );

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

  const handleToggleDarkMode = async (val: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    await toggleDark(val);
  };

  const handleSelectLanguage = async (lang: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await setLanguage(lang as any);
      const code = LANGUAGE_CODE_MAP[lang] || "en";
      if (updateUser) {
        await updateUser({ language: code });
      }
      setLangModalVisible(false);
      setLangSuccessToast({
        title: "Language Updated",
        message: `App language set to ${lang} and synced to your profile.`,
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update language.");
    }
  };

  const superAdminMenuGroups = [
    {
      title: t("admin_governance_group"),
      items: [
        { icon: Building, label: t("admin_divisions_label"), color: "#60A5FA", route: "/(admin)/tenants" },
        { icon: TrendingUp, label: t("admin_invoices_label"), color: "#34D399", route: "/(admin)/invoices" },
      ],
    },
    {
      title: t("admin_settings_group"),
      items: [
        { icon: Bell, label: t("admin_notifications_label"), color: "#EC4899", route: "/(admin)/notifications" },
        { icon: Shield, label: t("admin_privacy_label"), color: "#8B5CF6", route: "/(admin)/privacy" },
        { icon: HelpCircle, label: t("admin_help_label"), color: "#06B6D4", route: "/(admin)/help" },
        { icon: Settings, label: t("admin_app_settings_label"), color: "#F59E0B", route: "/profile/settings" },
      ],
    },
  ];

  const sectorAdminMenuGroups = [
    {
      title: t("sector_ops_group"),
      items: [
        { icon: Briefcase, label: t("sector_staff_label"), color: "#A78BFA", route: "/(admin)/staff" },
        { icon: Scissors, label: t("sector_services_label"), color: "#FBBF24", route: "/(admin)/services" },
        { icon: Users, label: t("sector_customers_label"), color: "#34D399", route: "/(admin)/customers" },
        { icon: Calendar, label: t("sector_bookings_label"), color: "#60A5FA", route: "/(admin)/(tabs)/bookings" },
        { icon: FileText, label: t("sector_reports_label"), color: "#10B981", route: "/(admin)/reports" },
      ],
    },
    {
      title: t("sector_settings_group"),
      items: [
        { icon: Bell, label: t("sector_notifications_label"), color: "#EC4899", route: "/(admin)/notifications" },
        { icon: Shield, label: t("sector_privacy_label"), color: "#6366F1", route: "/(admin)/privacy" },
        { icon: HelpCircle, label: t("sector_help_label"), color: "#38BDF8", route: "/(admin)/help" },
        { icon: Settings, label: t("admin_app_settings_label"), color: "#F59E0B", route: "/profile/settings" },
      ],
    },
  ];

  const menuGroups = isSuperAdmin ? superAdminMenuGroups : sectorAdminMenuGroups;

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 50),
          paddingBottom: insets.bottom + 90,
        }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <LinearGradient
            colors={isSuperAdmin ? ["#4F46E5", "#10B981"] : ["#064E3B", "#047857"]}
            style={styles.avatarContainer}
          >
            <Text style={styles.avatarText}>
              {getInitials(isSuperAdmin ? user?.name || "Super Admin" : divisionTitle)}
            </Text>
          </LinearGradient>

          <View style={[styles.roleBadge, !isSuperAdmin && { backgroundColor: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.3)" }]}>
            <Text style={[styles.roleBadgeText, !isSuperAdmin && { color: "#34D399" }]}>
              {isSuperAdmin ? `👑 ${t("super_admin_executive").toUpperCase()}` : `🏢 ${divisionTitle.toUpperCase()}`}
            </Text>
          </View>

          <Text style={[styles.name, { color: colors.text }]}>
            {user?.name || (isSuperAdmin ? t("platform_governance_admin") : t("sector_division_admin"))}
          </Text>
          <Text style={[styles.email, { color: colors.subtext }]}>
            {user?.email || "admin@clean.et"} {"\u2022"} {isSuperAdmin ? t("global_master_account") : t("licensed_sector_admin")}
          </Text>

          <Pressable
            style={[styles.editButton, {
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              borderColor: isDark ? "rgba(255,255,255,0.15)" : colors.cardBorder,
            }]}
            onPress={() => router.push("/profile/personal-info")}
          >
            <Text style={[styles.editButtonText, { color: colors.text }]}>{t("edit_profile_info")}</Text>
          </Pressable>
        </View>

        {/* QUICK PREFERENCES: Language + Dark Mode */}
        <View style={[styles.quickPrefsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.quickPrefsTitle, { color: colors.subtext }]}>
            {t("admin_app_settings_label").toUpperCase()}
          </Text>

          <Pressable
            style={[styles.prefRow, { borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9", borderBottomWidth: 1 }]}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setLangModalVisible(true); }}
          >
            <View style={styles.prefRowLeft}>
              <View style={[styles.prefIconBox, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                <Globe size={18} color="#3B82F6" />
              </View>
              <View>
                <Text style={[styles.prefLabel, { color: colors.text }]}>{t("language")}</Text>
                <Text style={[styles.prefSubLabel, { color: colors.subtext }]}>{language || "English"}</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.subtext} />
          </Pressable>

          <View style={styles.prefRow}>
            <View style={styles.prefRowLeft}>
              <View style={[styles.prefIconBox, { backgroundColor: isDark ? "rgba(139,92,246,0.15)" : "rgba(245,158,11,0.15)" }]}>
                {isDark ? <Moon size={18} color="#8B5CF6" /> : <Sun size={18} color="#F59E0B" />}
              </View>
              <View>
                <Text style={[styles.prefLabel, { color: colors.text }]}>{t("dark_mode")}</Text>
                <Text style={[styles.prefSubLabel, { color: colors.subtext }]}>{isDark ? "Enabled" : "Disabled"}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: isDark ? "#334155" : "#CBD5E1", true: "#8B5CF6" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* SECTOR STATS (sector admin only) */}
        {!isSuperAdmin && (
          <View style={[styles.statsCardContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statsCardTitle, { color: colors.text }]}>📊 {t("sector_performance_summary")}</Text>
            <View style={styles.statsGrid}>
              {[
                { value: `ETB ${sectorStats.gmv.toLocaleString("en-ET")}`, label: t("division_revenue"), color: "#34D399" },
                { value: String(sectorStats.completedJobs), label: t("jobs_completed"), color: "#60A5FA" },
                { value: String(sectorStats.staffCount), label: t("on_duty_techs"), color: "#A78BFA" },
                { value: String(sectorStats.servicesCount), label: t("active_services"), color: "#FBBF24" },
              ].map((stat, i) => (
                <View key={i} style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.subtext }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* MENU GROUPS */}
        {menuGroups.map((group, gIndex) => (
          <View key={gIndex} style={styles.groupContainer}>
            <Text style={[styles.groupTitle, { color: colors.subtext }]}>{group.title}</Text>
            <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {group.items.map((item, index) => (
                <View key={index}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.menuItemPressable,
                      pressed && { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)" },
                    ]}
                    onPress={() => handleItemPress(item.route)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
                        <item.icon size={20} color={item.color} />
                      </View>
                      <Text style={[styles.menuItemLabel, { color: colors.text }]}>{item.label}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.subtext} />
                  </Pressable>
                  {index < group.items.length - 1 && (
                    <View style={[styles.menuDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* LOGOUT */}
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.8 }]}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t("log_out_of_portal")}</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.subtext }]}>
          {isSuperAdmin ? "Clean.et Executive Governance \u2022 v1.0.2" : `Clean.et ${divisionTitle} Portal \u2022 v1.0.2`}
        </Text>
      </ScrollView>

      {/* LOGOUT MODAL */}
      <ActionModal
        visible={logoutModalVisible}
        type="danger"
        title={t("logout_portal_confirm_title")}
        message={t("logout_portal_confirm_msg").replace("{division}", divisionTitle)}
        confirmText={t("log_out_of_portal")}
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />

      {/* LANGUAGE SUCCESS TOAST */}
      {langSuccessToast && (
        <ActionModal
          visible={!!langSuccessToast}
          type="success"
          title={langSuccessToast.title}
          message={langSuccessToast.message}
          confirmText="Great"
          onConfirm={() => setLangSuccessToast(null)}
        />
      )}

      {/* LANGUAGE MODAL */}
      <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>🌐 {t("language")}</Text>
              <Pressable
                onPress={() => setLangModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9" }]}
              >
                <X size={16} color={colors.subtext} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>
              Select your preferred language for the admin portal
            </Text>

            {LANGUAGES.map((lang, idx) => (
              <Pressable
                key={lang}
                style={[
                  styles.langOption,
                  {
                    backgroundColor: language === lang ? (isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)") : "transparent",
                    borderColor: language === lang ? (isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.25)") : (isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9"),
                  },
                  idx < LANGUAGES.length - 1 && { marginBottom: 8 },
                ]}
                onPress={() => handleSelectLanguage(lang)}
              >
                <Text style={[styles.langText, { color: language === lang ? "#6366F1" : colors.text, fontWeight: language === lang ? "700" : "500" }]}>
                  {lang === "English" ? "🇺🇸 English" : "🇪🇹 አማርኛ (Amharic)"}
                </Text>
                {language === lang && <Check size={18} color="#6366F1" strokeWidth={2.5} />}
              </Pressable>
            ))}

            <Pressable
              style={[styles.modalCancelBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F8FAFC", borderColor: isDark ? "#334155" : "#E2E8F0" }]}
              onPress={() => setLangModalVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.subtext }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", paddingHorizontal: 24, marginBottom: 20 },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center", marginBottom: 12, borderWidth: 3, borderColor: "rgba(255,255,255,0.15)" },
  avatarText: { fontSize: 32, fontWeight: "bold", color: "#FFFFFF" },
  roleBadge: { backgroundColor: "rgba(16,185,129,0.15)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(16,185,129,0.3)", marginBottom: 8 },
  roleBadgeText: { color: "#34D399", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  name: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  email: { fontSize: 13, marginBottom: 14 },
  editButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  editButtonText: { fontWeight: "700", fontSize: 12 },
  quickPrefsCard: { marginHorizontal: 16, marginBottom: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  quickPrefsTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  prefRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  prefRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  prefIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  prefLabel: { fontSize: 14, fontWeight: "600" },
  prefSubLabel: { fontSize: 11, marginTop: 1 },
  statsCardContainer: { marginHorizontal: 16, marginBottom: 20, padding: 16, borderRadius: 16, borderWidth: 1 },
  statsCardTitle: { fontSize: 13, fontWeight: "800", marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: { width: "48%", padding: 12, borderRadius: 12, borderWidth: 1 },
  statValue: { fontSize: 15, fontWeight: "800" },
  statLabel: { fontSize: 10, marginTop: 2, fontWeight: "700" },
  groupContainer: { marginBottom: 16, paddingHorizontal: 16 },
  groupTitle: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, marginLeft: 4 },
  menuContainer: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuItemPressable: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  menuDivider: { height: 1, marginLeft: 64 },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuItemLabel: { fontSize: 14, fontWeight: "600" },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8, padding: 14, marginHorizontal: 16, borderRadius: 16, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)" },
  logoutText: { color: "#EF4444", fontSize: 14, fontWeight: "800" },
  version: { textAlign: "center", fontSize: 11, marginTop: 20, marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalCloseBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  modalSubtitle: { fontSize: 12, marginBottom: 16 },
  langOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  langText: { fontSize: 15 },
  modalCancelBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  modalCancelText: { fontSize: 14, fontWeight: "600" },
});
