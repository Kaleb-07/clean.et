import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useSuperAdmin,
  Tenant,
  CreateTenantPayload,
} from "../../hooks/useSuperAdmin";

type ActiveTab = "overview" | "tenants" | "governance";

export default function SuperAdminTenantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    tenants,
    analytics,
    health,
    auditLogs,
    settings,
    isLoading,
    error,
    reload,
    createTenantWithAdmin,
    updateTenantStatus,
    updateSystemSettings,
  } = useSuperAdmin();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Onboarding Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<CreateTenantPayload>({
    business_name: "",
    plan: "growth",
    categories_enabled: ["car-washing", "building-cleaning"],
    admin_name: "",
    admin_email: "",
    admin_password: "",
    admin_phone: "",
  });

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    default_currency: settings?.default_currency || "ETB",
    platform_commission_rate: String(settings?.platform_commission_rate || 10.0),
    support_email: settings?.support_email || "support@clean.et",
    maintenance_mode: settings?.maintenance_mode || false,
  });

  const toggleCategory = (cat: string) => {
    setForm((prev) => {
      const exists = prev.categories_enabled.includes(cat);
      const updated = exists
        ? prev.categories_enabled.filter((c) => c !== cat)
        : [...prev.categories_enabled, cat];
      return { ...prev, categories_enabled: updated };
    });
  };

  const handleCreateTenant = async () => {
    if (!form.business_name.trim()) {
      Alert.alert("Error", "Please enter the Business Name.");
      return;
    }
    if (form.categories_enabled.length === 0) {
      Alert.alert("Error", "Please select at least one enabled service category.");
      return;
    }
    if (form.admin_email && !form.admin_password) {
      Alert.alert("Error", "Please enter a password for the Tenant Admin user.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTenantWithAdmin(form);
      setModalVisible(false);
      setForm({
        business_name: "",
        plan: "growth",
        categories_enabled: ["car-washing", "building-cleaning"],
        admin_name: "",
        admin_email: "",
        admin_password: "",
        admin_phone: "",
      });
      Alert.alert("Success", "Tenant & Admin account onboarded successfully!");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to onboard tenant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (tenant: Tenant) => {
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    try {
      await updateTenantStatus(tenant.id, newStatus);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update status.");
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSystemSettings({
        default_currency: settingsForm.default_currency,
        platform_commission_rate: parseFloat(settingsForm.platform_commission_rate) || 0,
        support_email: settingsForm.support_email,
        maintenance_mode: settingsForm.maintenance_mode,
      });
      Alert.alert("Saved", "System governance settings updated!");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update settings.");
    }
  };

  const filteredTenants = tenants.filter((t) =>
    t.business_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Super Admin Portal</Text>
          <View style={styles.healthBadge}>
            <View
              style={[
                styles.healthDot,
                {
                  backgroundColor:
                    health?.database === "healthy" ? "#10B981" : "#EF4444",
                },
              ]}
            />
            <Text style={styles.healthText}>
              System {health?.status === "operational" ? "Operational" : "Warning"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={reload}>
          <Ionicons name="refresh" size={20} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      {/* ─── NAVIGATION TABS ─── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "overview" && styles.activeTabItem]}
          onPress={() => setActiveTab("overview")}
        >
          <Ionicons
            name="analytics-outline"
            size={18}
            color={activeTab === "overview" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "overview" && styles.activeTabText,
            ]}
          >
            Analytics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "tenants" && styles.activeTabItem]}
          onPress={() => setActiveTab("tenants")}
        >
          <Ionicons
            name="business-outline"
            size={18}
            color={activeTab === "tenants" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "tenants" && styles.activeTabText,
            ]}
          >
            Tenants ({tenants.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "governance" && styles.activeTabItem]}
          onPress={() => setActiveTab("governance")}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={activeTab === "governance" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "governance" && styles.activeTabText,
            ]}
          >
            Governance
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading Super Admin Intelligence...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={reload} tintColor="#3B82F6" />
          }
        >
          {/* ─── TAB 1: OVERVIEW & ANALYTICS ─── */}
          {activeTab === "overview" && (
            <Animated.View entering={FadeInDown.duration(300)}>
              {/* GMV HERO CARD */}
              <LinearGradient
                colors={["#1E3A8A", "#3B82F6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroCardHeader}>
                  <Text style={styles.heroLabel}>Total Platform GMV</Text>
                  <View style={styles.currencyPill}>
                    <Text style={styles.currencyPillText}>
                      {analytics?.currency || "ETB"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.heroValue}>
                  {analytics?.currency || "ETB"}{" "}
                  {analytics?.gmv.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </Text>
                <Text style={styles.heroSubtext}>
                  Gross Merchandise Value from completed & invoiced bookings across all tenants
                </Text>
              </LinearGradient>

              {/* STATS GRID */}
              <View style={styles.gridRow}>
                <View style={styles.statBox}>
                  <Ionicons name="business" size={24} color="#3B82F6" />
                  <Text style={styles.statBoxValue}>
                    {analytics?.tenants.active || 0} / {analytics?.tenants.total || 0}
                  </Text>
                  <Text style={styles.statBoxLabel}>Active Tenants</Text>
                </View>

                <View style={styles.statBox}>
                  <Ionicons name="calendar" size={24} color="#10B981" />
                  <Text style={styles.statBoxValue}>
                    {analytics?.bookings.total || 0}
                  </Text>
                  <Text style={styles.statBoxLabel}>Global Bookings</Text>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={styles.statBox}>
                  <Ionicons name="people" size={24} color="#F59E0B" />
                  <Text style={styles.statBoxValue}>
                    {analytics?.total_customers || 0}
                  </Text>
                  <Text style={styles.statBoxLabel}>Total Customers</Text>
                </View>

                <View style={styles.statBox}>
                  <Ionicons name="construct" size={24} color="#8B5CF6" />
                  <Text style={styles.statBoxValue}>
                    {analytics?.total_staff || 0}
                  </Text>
                  <Text style={styles.statBoxLabel}>Field Staff Crew</Text>
                </View>
              </View>

              {/* BOOKINGS BREAKDOWN CARD */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Global Booking Status Breakdown</Text>
                <View style={styles.statusRow}>
                  <View style={styles.statusBadgeItem}>
                    <Text style={[styles.statusCount, { color: "#F59E0B" }]}>
                      {analytics?.bookings.breakdown.pending || 0}
                    </Text>
                    <Text style={styles.statusName}>Pending</Text>
                  </View>

                  <View style={styles.statusBadgeItem}>
                    <Text style={[styles.statusCount, { color: "#3B82F6" }]}>
                      {analytics?.bookings.breakdown.in_progress || 0}
                    </Text>
                    <Text style={styles.statusName}>In Progress</Text>
                  </View>

                  <View style={styles.statusBadgeItem}>
                    <Text style={[styles.statusCount, { color: "#10B981" }]}>
                      {analytics?.bookings.breakdown.completed || 0}
                    </Text>
                    <Text style={styles.statusName}>Completed</Text>
                  </View>

                  <View style={styles.statusBadgeItem}>
                    <Text style={[styles.statusCount, { color: "#EF4444" }]}>
                      {analytics?.bookings.breakdown.cancelled || 0}
                    </Text>
                    <Text style={styles.statusName}>Cancelled</Text>
                  </View>
                </View>
              </View>

              {/* SUBSCRIPTION PLAN DISTRIBUTION */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Tenant Subscription Plan Breakdown</Text>
                <View style={styles.planDistributionRow}>
                  <View style={styles.planCol}>
                    <Text style={styles.planCount}>
                      {analytics?.plan_distribution.starter || 0}
                    </Text>
                    <Text style={styles.planLabel}>Starter</Text>
                  </View>
                  <View style={styles.planCol}>
                    <Text style={[styles.planCount, { color: "#3B82F6" }]}>
                      {analytics?.plan_distribution.growth || 0}
                    </Text>
                    <Text style={styles.planLabel}>Growth</Text>
                  </View>
                  <View style={styles.planCol}>
                    <Text style={[styles.planCount, { color: "#8B5CF6" }]}>
                      {analytics?.plan_distribution.enterprise || 0}
                    </Text>
                    <Text style={styles.planLabel}>Enterprise</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* ─── TAB 2: TENANTS DIRECTORY & ONBOARDING ─── */}
          {activeTab === "tenants" && (
            <Animated.View entering={FadeInDown.duration(300)}>
              {/* ACTION BAR */}
              <View style={styles.tenantActionBar}>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search tenant business..."
                    placeholderTextColor="#6B7280"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <TouchableOpacity
                  style={styles.onboardButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.onboardButtonText}>Onboard</Text>
                </TouchableOpacity>
              </View>

              {/* TENANTS LIST */}
              {filteredTenants.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="business-outline" size={48} color="#4B5563" />
                  <Text style={styles.emptyTitle}>No Tenants Found</Text>
                  <Text style={styles.emptySub}>
                    Click 'Onboard' to create your first tenant company & admin account.
                  </Text>
                </View>
              ) : (
                filteredTenants.map((t) => (
                  <View key={t.id} style={styles.tenantCard}>
                    <View style={styles.tenantCardHeader}>
                      <View style={styles.tenantTitleGroup}>
                        <Text style={styles.tenantName}>{t.business_name}</Text>
                        <View style={styles.planTag}>
                          <Text style={styles.planTagText}>
                            {t.plan.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.switchGroup}>
                        <Text
                          style={[
                            styles.statusLabel,
                            {
                              color:
                                t.status === "active" ? "#10B981" : "#EF4444",
                            },
                          ]}
                        >
                          {t.status.toUpperCase()}
                        </Text>
                        <Switch
                          value={t.status === "active"}
                          onValueChange={() => handleStatusToggle(t)}
                          trackColor={{ false: "#374151", true: "#059669" }}
                          thumbColor={t.status === "active" ? "#10B981" : "#9CA3AF"}
                        />
                      </View>
                    </View>

                    {/* ENABLED SERVICES BADGES */}
                    <View style={styles.categoriesRow}>
                      <Text style={styles.fieldLabel}>Enabled Sectors:</Text>
                      {t.categories_enabled.map((cat) => (
                        <View key={cat} style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{cat}</Text>
                        </View>
                      ))}
                    </View>

                    {/* TENANT ADMIN USER INFO */}
                    {t.users && t.users.length > 0 && (
                      <View style={styles.adminUserBox}>
                        <Ionicons name="person-circle" size={20} color="#60A5FA" />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.adminName}>
                            Admin: {t.users[0].name}
                          </Text>
                          <Text style={styles.adminEmail}>{t.users[0].email}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                ))
              )}
            </Animated.View>
          )}

          {/* ─── TAB 3: SYSTEM GOVERNANCE & AUDIT LOGS ─── */}
          {activeTab === "governance" && (
            <Animated.View entering={FadeInDown.duration(300)}>
              {/* GLOBAL SYSTEM SETTINGS CARD */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Global System Governance</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Platform Currency</Text>
                  <TextInput
                    style={styles.textInput}
                    value={settingsForm.default_currency}
                    onChangeText={(val) =>
                      setSettingsForm((p) => ({ ...p, default_currency: val }))
                    }
                    placeholder="e.g. ETB, USD"
                    placeholderTextColor="#6B7280"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Platform Commission Rate (%)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={settingsForm.platform_commission_rate}
                    onChangeText={(val) =>
                      setSettingsForm((p) => ({
                        ...p,
                        platform_commission_rate: val,
                      }))
                    }
                    placeholder="10.0"
                    placeholderTextColor="#6B7280"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Support Contact Email</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="email-address"
                    value={settingsForm.support_email}
                    onChangeText={(val) =>
                      setSettingsForm((p) => ({ ...p, support_email: val }))
                    }
                    placeholder="support@clean.et"
                    placeholderTextColor="#6B7280"
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveSettingsButton}
                  onPress={handleSaveSettings}
                >
                  <Text style={styles.saveSettingsText}>Save Governance Settings</Text>
                </TouchableOpacity>
              </View>

              {/* AUDIT LOGS CARD */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Platform Audit Logs History</Text>
                {auditLogs.length === 0 ? (
                  <Text style={styles.emptySub}>No audit logs recorded yet.</Text>
                ) : (
                  auditLogs.map((log) => (
                    <View key={log.id} style={styles.auditLogItem}>
                      <View style={styles.auditHeader}>
                        <View style={styles.actionTag}>
                          <Text style={styles.actionTagText}>{log.action}</Text>
                        </View>
                        <Text style={styles.auditTime}>
                          {new Date(log.created_at).toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.auditDesc}>{log.description}</Text>
                      {log.user && (
                        <Text style={styles.auditUser}>
                          By: {log.user.name} ({log.user.email}) | IP: {log.ip_address}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      )}

      {/* ─── ONBOARD TENANT MODAL ─── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Onboard New Tenant & Admin</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.sectionHeader}>Business Details</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Business Name (e.g. Apex Detailing)"
                placeholderTextColor="#6B7280"
                value={form.business_name}
                onChangeText={(val) => setForm((p) => ({ ...p, business_name: val }))}
              />

              {/* PLAN PICKER */}
              <Text style={styles.inputLabel}>Subscription Plan</Text>
              <View style={styles.planSelectorRow}>
                {(["starter", "growth", "enterprise"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.planOption,
                      form.plan === p && styles.selectedPlanOption,
                    ]}
                    onPress={() => setForm((prev) => ({ ...prev, plan: p }))}
                  >
                    <Text
                      style={[
                        styles.planOptionText,
                        form.plan === p && styles.selectedPlanOptionText,
                      ]}
                    >
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* SERVICES ENABLED CHECKBOXES */}
              <Text style={styles.inputLabel}>Authorized Services / Sectors</Text>
              <View style={styles.categoryCheckboxRow}>
                {[
                  { id: "car-washing", label: "Car Washing & Detailing" },
                  { id: "building-cleaning", label: "Building & Property Clean" },
                ].map((c) => {
                  const checked = form.categories_enabled.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.checkboxItem,
                        checked && styles.checkedCheckboxItem,
                      ]}
                      onPress={() => toggleCategory(c.id)}
                    >
                      <Ionicons
                        name={checked ? "checkbox" : "square-outline"}
                        size={20}
                        color={checked ? "#3B82F6" : "#6B7280"}
                      />
                      <Text style={styles.checkboxText}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionHeader}>Tenant Admin User Account</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Admin Full Name"
                placeholderTextColor="#6B7280"
                value={form.admin_name}
                onChangeText={(val) => setForm((p) => ({ ...p, admin_name: val }))}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Admin Email Address"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.admin_email}
                onChangeText={(val) => setForm((p) => ({ ...p, admin_email: val }))}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Admin Password"
                placeholderTextColor="#6B7280"
                secureTextEntry
                value={form.admin_password}
                onChangeText={(val) =>
                  setForm((p) => ({ ...p, admin_password: val }))
                }
              />
              <TextInput
                style={styles.textInput}
                placeholder="Phone Number (+251...)"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
                value={form.admin_phone}
                onChangeText={(val) => setForm((p) => ({ ...p, admin_phone: val }))}
              />

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
                onPress={handleCreateTenant}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Onboard Tenant & Admin</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  backButton: {
    padding: 6,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  healthBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  healthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  healthText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  refreshButton: {
    padding: 6,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTabItem: {
    backgroundColor: "#334155",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginLeft: 6,
  },
  activeTabText: {
    color: "#60A5FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#94A3B8",
    fontSize: 14,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  heroCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 14,
    color: "#DBEAFE",
    fontWeight: "500",
  },
  currencyPill: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currencyPillText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginVertical: 8,
  },
  heroSubtext: {
    fontSize: 12,
    color: "#BFDBFE",
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statBox: {
    flex: 0.48,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F8FAFC",
    marginTop: 8,
  },
  statBoxLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statusBadgeItem: {
    alignItems: "center",
  },
  statusCount: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusName: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  planDistributionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  planCol: {
    alignItems: "center",
  },
  planCount: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  planLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  tenantActionBar: {
    flexDirection: "row",
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: "#F8FAFC",
    marginLeft: 8,
  },
  onboardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  onboardButtonText: {
    color: "#FFF",
    fontWeight: "700",
    marginLeft: 4,
  },
  emptyBox: {
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
  tenantCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  tenantCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tenantTitleGroup: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  planTag: {
    alignSelf: "flex-start",
    backgroundColor: "#3B82F622",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  planTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#60A5FA",
  },
  switchGroup: {
    alignItems: "flex-end",
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  categoriesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginRight: 6,
  },
  categoryBadge: {
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
    marginTop: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: "#E2E8F0",
  },
  adminUserBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  adminName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  adminEmail: {
    fontSize: 11,
    color: "#94A3B8",
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#CBD5E1",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 10,
  },
  saveSettingsButton: {
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveSettingsText: {
    color: "#FFF",
    fontWeight: "700",
  },
  auditLogItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingVertical: 10,
  },
  auditHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionTag: {
    backgroundColor: "#3B82F622",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#60A5FA",
  },
  auditTime: {
    fontSize: 10,
    color: "#64748B",
  },
  auditDesc: {
    fontSize: 13,
    color: "#E2E8F0",
    marginTop: 4,
  },
  auditUser: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  modalScroll: {
    maxHeight: 500,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#60A5FA",
    marginTop: 12,
    marginBottom: 8,
  },
  planSelectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  planOption: {
    flex: 0.31,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  selectedPlanOption: {
    backgroundColor: "#2563EB",
    borderColor: "#3B82F6",
  },
  planOptionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  selectedPlanOptionText: {
    color: "#FFF",
  },
  categoryCheckboxRow: {
    marginBottom: 12,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  checkedCheckboxItem: {
    borderColor: "#3B82F6",
  },
  checkboxText: {
    color: "#F8FAFC",
    marginLeft: 8,
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  submitButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
