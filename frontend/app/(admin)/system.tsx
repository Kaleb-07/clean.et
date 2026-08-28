import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight, FadeOutUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useSuperAdmin,
  AuditLogItem,
  SystemSettings,
} from "../../hooks/useSuperAdmin";

type SystemTab = "health" | "audit" | "settings";

export default function SuperAdminSystem() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    health,
    auditLogs,
    settings,
    isLoading,
    onRefresh,
    updateSystemSettings,
  } = useSuperAdmin();

  const [activeTab, setActiveTab] = useState<SystemTab>("health");
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  /* ─── AUDIT LOG SEARCH & EXPAND ─── */
  const [auditQuery, setAuditQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    const q = auditQuery.toLowerCase();
    const matchesAction = (log.action || "").toLowerCase().includes(q);
    const matchesDesc = (log.description || "").toLowerCase().includes(q);
    const matchesUser = (log.user?.name || "").toLowerCase().includes(q) || (log.user?.email || "").toLowerCase().includes(q);
    return matchesAction || matchesDesc || matchesUser;
  });

  /* ─── SYSTEM SETTINGS STATE ─── */
  const [settingsForm, setSettingsForm] = useState<Partial<SystemSettings>>({
    platform_commission_rate: 10,
    default_currency: "ETB",
    support_email: "support@clean.et",
    maintenance_mode: false,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        platform_commission_rate: settings.platform_commission_rate ?? 10,
        default_currency: settings.default_currency || "ETB",
        support_email: settings.support_email || "support@clean.et",
        maintenance_mode: !!settings.maintenance_mode,
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateSystemSettings(settingsForm);
      showToast("success", "System settings updated successfully.");
    } catch (e: any) {
      showToast("error", e?.message || "Failed to save settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          exiting={FadeOutUp.duration(300)}
          style={[
            styles.toastContainer,
            toast.type === "success" && { backgroundColor: "#064E3B", borderColor: "#10B981" },
            toast.type === "error" && { backgroundColor: "#7F1D1D", borderColor: "#EF4444" },
            toast.type === "info" && { backgroundColor: "#1E3A8A", borderColor: "#3B82F6" },
          ]}
        >
          <Ionicons
            name={
              toast.type === "success"
                ? "checkmark-circle"
                : toast.type === "error"
                ? "alert-circle"
                : "information-circle"
            }
            size={18}
            color="#FFF"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
          <TouchableOpacity onPress={() => setToast(null)} style={{ padding: 2 }}>
            <Ionicons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── HEADER BAR ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(admin)/(tabs)/dashboard");
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>⚙️ System Operations & Infrastructure</Text>
          <Text style={styles.headerSubtitle}>
            Platform Health, Security Audit Logs & Global Settings
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => router.push("/(admin)/notifications")}>
          <Ionicons name="notifications-outline" size={18} color="#F472B6" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => router.push("/(admin)/broadcast")}>
          <Ionicons name="megaphone-outline" size={18} color="#F59E0B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      {/* ── TOP NAV TABS ── */}
      <View style={styles.tabBarOuterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContentContainer}
        >
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "health" && styles.tabItemActive]}
            onPress={() => setActiveTab("health")}
          >
            <Ionicons name="pulse" size={16} color={activeTab === "health" ? "#34D399" : "#94A3B8"} />
            <Text style={[styles.tabText, activeTab === "health" && styles.tabTextActive]}>Infrastructure</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "audit" && styles.tabItemActive]}
            onPress={() => setActiveTab("audit")}
          >
            <Ionicons name="shield-checkmark" size={16} color={activeTab === "audit" ? "#60A5FA" : "#94A3B8"} />
            <Text style={[styles.tabText, activeTab === "audit" && styles.tabTextActive]}>
              Audit Logs ({auditLogs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "settings" && styles.tabItemActive]}
            onPress={() => setActiveTab("settings")}
          >
            <Ionicons name="options" size={16} color={activeTab === "settings" ? "#EC4899" : "#94A3B8"} />
            <Text style={[styles.tabText, activeTab === "settings" && styles.tabTextActive]}>Global Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#60A5FA" />}
      >
        {/* ── TAB 1: INFRASTRUCTURE & HEALTH ── */}
        {activeTab === "health" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient colors={["#064E3B", "#047857"]} style={styles.heroCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={styles.heroLabel}>SYSTEM OPERATIONAL STATUS</Text>
                  <Text style={styles.heroValue}>
                    {health?.status === "operational" ? "🟢 All Systems Operational" : "🟡 Degradation Detected"}
                  </Text>
                </View>

                <View style={styles.statusBadgeGreen}>
                  <Text style={{ color: "#34D399", fontWeight: "800", fontSize: 11 }}>ONLINE</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", marginTop: 14, gap: 10 }}>
                <View style={styles.heroMiniStat}>
                  <Text style={styles.heroMiniLabel}>DATABASE ENGINE</Text>
                  <Text style={styles.heroMiniVal}>{health?.database?.toUpperCase() || "CONNECTED"}</Text>
                </View>
                <View style={styles.heroMiniStat}>
                  <Text style={styles.heroMiniLabel}>FRAMEWORK</Text>
                  <Text style={styles.heroMiniVal}>Laravel v{health?.laravel_version || "11.x"}</Text>
                </View>
                <View style={styles.heroMiniStat}>
                  <Text style={styles.heroMiniLabel}>RUNTIME</Text>
                  <Text style={styles.heroMiniVal}>PHP v{health?.php_version?.split("-")[0] || "8.2"}</Text>
                </View>
              </View>
            </LinearGradient>

            <Text style={styles.sectionTitle}>🖥️ Platform Technical Specifications</Text>

            <View style={styles.specCard}>
              <View style={styles.specRow}>
                <Ionicons name="server-outline" size={18} color="#60A5FA" />
                <Text style={styles.specKey}>Environment</Text>
                <Text style={styles.specVal}>{health?.environment?.toUpperCase() || "PRODUCTION"}</Text>
              </View>

              <View style={styles.specRow}>
                <Ionicons name="time-outline" size={18} color="#34D399" />
                <Text style={styles.specKey}>Server Time (UTC)</Text>
                <Text style={styles.specVal}>
                  {health?.server_time ? new Date(health.server_time).toLocaleString() : new Date().toLocaleString()}
                </Text>
              </View>

              <View style={styles.specRow}>
                <Ionicons name="key-outline" size={18} color="#FBBF24" />
                <Text style={styles.specKey}>API Gateway</Text>
                <Text style={styles.specVal}>Clean.et REST v1 (Sanctum Auth)</Text>
              </View>

              <View style={styles.specRow}>
                <Ionicons name="hardware-chip-outline" size={18} color="#F472B6" />
                <Text style={styles.specKey}>Queue Background Workers</Text>
                <Text style={styles.specVal}>Active Redis/Database Driver</Text>
              </View>
            </View>

            {/* Quick Link to Dedicated Broadcast Center */}
            <TouchableOpacity
              style={styles.broadcastBannerBtn}
              onPress={() => router.push("/(admin)/broadcast")}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="megaphone" size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    Open Broadcast & Push Sender Suite
                  </Text>
                  <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 1 }}>
                    Dispatch push notifications, emails & SMS alerts to accounts
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── TAB 2: AUDIT LOGS TIMELINE ── */}
        {activeTab === "audit" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Search Bar */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search audit trail by action, user, or IP..."
                placeholderTextColor="#64748B"
                value={auditQuery}
                onChangeText={setAuditQuery}
              />
            </View>

            {filteredLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="shield-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>No Security Audit Logs Found</Text>
                <Text style={styles.emptySub}>All administrative actions will be recorded here automatically.</Text>
              </View>
            ) : (
              filteredLogs.map((log, idx) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <Animated.View key={log.id || idx} entering={FadeInRight.delay(idx * 30)}>
                    <TouchableOpacity
                      style={styles.auditCard}
                      onPress={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                          <View style={styles.auditBadgeIcon}>
                            <Ionicons name="finger-print" size={18} color="#60A5FA" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.auditAction}>{log.action || "SYSTEM_EVENT"}</Text>
                            <Text style={styles.auditUser}>
                              👤 {log.user?.name || "System Automation"} ({log.user?.email || "internal"})
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.auditTime}>
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Now"}
                        </Text>
                      </View>

                      <Text style={styles.auditDesc}>{log.description || "Performed administrative operation."}</Text>

                      <View style={styles.auditMetaRow}>
                        <Text style={{ color: "#64748B", fontSize: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>
                          IP: {log.ip_address || "127.0.0.1"}
                        </Text>
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#94A3B8" />
                      </View>

                      {isExpanded && log.metadata && (
                        <View style={styles.metadataJsonBox}>
                          <Text style={styles.jsonText}>{JSON.stringify(log.metadata, null, 2)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            )}
          </Animated.View>
        )}

        {/* ── TAB 3: GLOBAL SETTINGS ── */}
        {activeTab === "settings" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.broadcastCard}>
              <Text style={styles.sectionTitle}>⚙️ Global Platform Governance Settings</Text>
              <Text style={{ color: "#94A3B8", fontSize: 11, marginBottom: 16 }}>
                Configure global enterprise parameters, default financial commission, and emergency controls.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Platform Commission Rate (%) *</Text>
                <TextInput
                  placeholder="e.g. 10"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={String(settingsForm.platform_commission_rate ?? 10)}
                  onChangeText={(t) =>
                    setSettingsForm({ ...settingsForm, platform_commission_rate: Number(t) || 0 })
                  }
                  style={styles.textInput}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Default Platform Currency</Text>
                  <TextInput
                    placeholder="ETB"
                    placeholderTextColor="#64748B"
                    value={settingsForm.default_currency}
                    onChangeText={(t) => setSettingsForm({ ...settingsForm, default_currency: t })}
                    style={styles.textInput}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Support Contact Email</Text>
                  <TextInput
                    placeholder="support@clean.et"
                    placeholderTextColor="#64748B"
                    keyboardType="email-address"
                    value={settingsForm.support_email}
                    onChangeText={(t) => setSettingsForm({ ...settingsForm, support_email: t })}
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Maintenance Mode Switch */}
              <View style={styles.maintenanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 14 }}>
                    Emergency Platform Maintenance Mode
                  </Text>
                  <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                    When enabled, non-admin access will be temporarily restricted.
                  </Text>
                </View>

                <Switch
                  value={settingsForm.maintenance_mode}
                  onValueChange={(val) => setSettingsForm({ ...settingsForm, maintenance_mode: val })}
                  trackColor={{ false: "#334155", true: "#EF4444" }}
                  thumbColor={settingsForm.maintenance_mode ? "#FFF" : "#94A3B8"}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: "#2563EB", marginTop: 18 }, isSavingSettings && { opacity: 0.7 }]}
                onPress={handleSaveSettings}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    Save Global Governance Settings
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#F8FAFC" },
  headerSubtitle: { fontSize: 10, color: "#94A3B8", marginTop: 1 },
  refreshBtn: { padding: 6 },
  toastContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  toastText: { flex: 1, color: "#FFF", fontSize: 13, fontWeight: "700" },
  tabBarOuterContainer: {
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    zIndex: 10,
  },
  tabBarContentContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    flexShrink: 0,
  },
  tabItemActive: { backgroundColor: "#334155" },
  tabText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#FFF" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 18, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#059669" },
  heroLabel: { fontSize: 10, fontWeight: "800", color: "#A7F3D0", textTransform: "uppercase" },
  heroValue: { fontSize: 20, fontWeight: "900", color: "#FFF", marginTop: 4 },
  statusBadgeGreen: { backgroundColor: "#10B98122", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#10B98155" },
  heroMiniStat: { flex: 1, backgroundColor: "rgba(255, 255, 255, 0.08)", padding: 10, borderRadius: 8 },
  heroMiniLabel: { fontSize: 9, fontWeight: "700", color: "#D1FAE5" },
  heroMiniVal: { fontSize: 13, fontWeight: "800", color: "#FFF", marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#FFF", marginBottom: 10 },
  specCard: { backgroundColor: "#1E293B", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#334155", gap: 12 },
  specRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  specKey: { flex: 1, color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  specVal: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  broadcastBannerBtn: { backgroundColor: "#1E293B", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#F59E0B55", marginTop: 14 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: "#F8FAFC", marginLeft: 8, fontSize: 13 },
  auditCard: { backgroundColor: "#1E293B", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  auditBadgeIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#3B82F622", alignItems: "center", justifyContent: "center" },
  auditAction: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  auditUser: { color: "#94A3B8", fontSize: 11, marginTop: 1 },
  auditTime: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  auditDesc: { color: "#CBD5E1", fontSize: 12, marginTop: 8 },
  auditMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  metadataJsonBox: { backgroundColor: "#0F172A", padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: "#334155" },
  jsonText: { color: "#34D399", fontSize: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { color: "#FFF", fontSize: 16, fontWeight: "800", marginTop: 10 },
  emptySub: { color: "#94A3B8", fontSize: 12, marginTop: 4 },
  broadcastCard: { backgroundColor: "#1E293B", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#334155" },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#CBD5E1", marginBottom: 6 },
  textInput: { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155" },
  submitBtn: { flexDirection: "row", backgroundColor: "#059669", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  maintenanceRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#EF444455", marginTop: 10 },
});
