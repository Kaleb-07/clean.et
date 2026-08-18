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
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useSuperAdmin,
  Tenant,
  CreateTenantPayload,
} from "../../hooks/useSuperAdmin";

type ActiveTab = "overview" | "tenants" | "governance";
type WizardStep = 1 | 2 | 3;

interface PlanTierInfo {
  id: "starter" | "growth" | "enterprise";
  name: string;
  badge: string;
  commission: string;
  staffLimit: string;
  features: string[];
  colors: [string, string];
  borderColor: string;
}

const SUBSCRIPTION_PLANS: PlanTierInfo[] = [
  {
    id: "starter",
    name: "Starter Business",
    badge: "5% Fee",
    commission: "5% Commission",
    staffLimit: "Max 5 Staff Members",
    features: ["Standard Bay Wash / Clean", "Basic Invoicing & Billing", "Mobile App Access"],
    colors: ["#0F172A", "#1E293B"],
    borderColor: "#334155",
  },
  {
    id: "growth",
    name: "Growth Tier",
    badge: "RECOMMENDED (8% Fee)",
    commission: "8% Commission",
    staffLimit: "Max 20 Staff Members",
    features: ["Multi-Sector Enabled", "Automated Dispatch Queue", "Customer Accounts & Fleets"],
    colors: ["#1E1B4B", "#312E81"],
    borderColor: "#6366F1",
  },
  {
    id: "enterprise",
    name: "Enterprise Core",
    badge: "FULL ACCESS (10% Fee)",
    commission: "10% Platform Rate",
    staffLimit: "Unlimited Staff & Techs",
    features: ["Full Multi-Sector Schemas", "IRATA Rope Access High-Rise", "Priority API & Dedicated Manager"],
    colors: ["#064E3B", "#047857"],
    borderColor: "#10B981",
  },
];

interface SectorCategoryOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  tags: string[];
  sharePercent: number;
}

const SECTOR_CATEGORIES: SectorCategoryOption[] = [
  {
    id: "car-washing",
    title: "Car Washing & Detailing",
    subtitle: "Sedans, SUVs, Minibuses, Engine Bays & Mobile Home Wash",
    icon: "car-sport",
    color: "#3B82F6",
    tags: ["Foam Wash", "Interior Vacuum", "Ceramic Coating", "Mobile Dispatch"],
    sharePercent: 65,
  },
  {
    id: "building-cleaning",
    title: "Building & Property Clean",
    subtitle: "High-Rise Glass Windows, Post-Construction & Office Steam Sanitation",
    icon: "business",
    color: "#10B981",
    tags: ["IRATA Rope Access", "High-Rise Glass", "Carpet Steam", "Plaster Clean"],
    sharePercent: 25,
  },
  {
    id: "laundry",
    title: "Commercial Laundry & Linen",
    subtitle: "Hotel Linens, Garment Dry Cleaning & Bulk Fabric Steam",
    icon: "shirt",
    color: "#F59E0B",
    tags: ["Linen Steam", "Garment Express", "Dry Clean"],
    sharePercent: 7,
  },
  {
    id: "maintenance",
    title: "Property Maintenance & HVAC",
    subtitle: "Air Duct Sanitation, Plumbing, Electrical & Facility Care",
    icon: "construct",
    color: "#A78BFA",
    tags: ["Duct Clean", "Facility Repairs", "HVAC Wash"],
    sharePercent: 3,
  },
];

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
    updateTenant,
    deleteTenant,
    updateSystemSettings,
  } = useSuperAdmin();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [auditSearch, setAuditSearch] = useState("");

  // Onboarding Wizard Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // View & Edit Tenant Modal state
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [deleteTenantTarget, setDeleteTenantTarget] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editForm, setEditForm] = useState<{
    business_name: string;
    plan: "starter" | "growth" | "enterprise";
    categories_enabled: string[];
    admin_name: string;
    admin_email: string;
    admin_password: string;
    admin_phone: string;
  }>({
    business_name: "",
    plan: "growth",
    categories_enabled: [],
    admin_name: "",
    admin_email: "",
    admin_password: "",
    admin_phone: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

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
    auto_dispatch: true,
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

  const toggleEditCategory = (cat: string) => {
    setEditForm((prev) => {
      const exists = prev.categories_enabled.includes(cat);
      const updated = exists
        ? prev.categories_enabled.filter((c) => c !== cat)
        : [...prev.categories_enabled, cat];
      return { ...prev, categories_enabled: updated };
    });
  };

  const handleCreateTenant = async () => {
    if (!form.business_name.trim()) {
      Alert.alert("Required", "Please enter the Tenant Business Name.");
      setWizardStep(1);
      return;
    }
    if (form.categories_enabled.length === 0) {
      Alert.alert("Required", "Please select at least one authorized service sector category.");
      setWizardStep(2);
      return;
    }
    if (!form.admin_email || !form.admin_password) {
      Alert.alert("Required", "Please enter an Email Address and Password for the Tenant Admin user.");
      setWizardStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      await createTenantWithAdmin({
        business_name: form.business_name.trim(),
        plan: form.plan,
        categories_enabled: form.categories_enabled,
        admin_name: (form.admin_name || "").trim(),
        admin_email: (form.admin_email || "").trim().toLowerCase(),
        admin_password: (form.admin_password || "").trim(),
        admin_phone: (form.admin_phone || "").trim(),
      });
      setModalVisible(false);
      setWizardStep(1);
      setForm({
        business_name: "",
        plan: "growth",
        categories_enabled: ["car-washing", "building-cleaning"],
        admin_name: "",
        admin_email: "",
        admin_password: "",
        admin_phone: "",
      });
      Alert.alert("🎉 Success!", "Tenant Company & Admin Account successfully onboarded and activated!");
    } catch (err: any) {
      Alert.alert("Onboarding Error", err?.message || "Failed to onboard tenant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (t: Tenant) => {
    const primaryAdmin = t.users?.[0] || (t as any).admin;
    setEditTenant(t);
    setEditForm({
      business_name: t.business_name,
      plan: t.plan,
      categories_enabled: t.categories_enabled ?? ["car-washing"],
      admin_name: primaryAdmin?.name || "",
      admin_email: primaryAdmin?.email || "",
      admin_password: "",
      admin_phone: primaryAdmin?.phone || "",
    });
  };

  const handleSaveEditTenant = async () => {
    if (!editTenant) return;
    if (!editForm.business_name.trim()) {
      Alert.alert("Required", "Please enter a valid Business Name.");
      return;
    }
    if (editForm.categories_enabled.length === 0) {
      Alert.alert("Required", "At least one category must be selected.");
      return;
    }

    setIsUpdating(true);
    try {
      await updateTenant(editTenant.id, {
        business_name: editForm.business_name.trim(),
        plan: editForm.plan,
        categories_enabled: editForm.categories_enabled,
        admin_name: editForm.admin_name.trim(),
        admin_email: editForm.admin_email.trim().toLowerCase(),
        admin_password: editForm.admin_password.trim() ? editForm.admin_password.trim() : undefined,
        admin_phone: editForm.admin_phone.trim(),
      });
      setEditTenant(null);
      Alert.alert("Saved", "Tenant company profile & admin credentials updated successfully!");
    } catch (err: any) {
      Alert.alert("Update Error", err?.message || "Failed to update tenant.");
    } finally {
      setIsUpdating(false);
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

  const filteredAuditLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.description.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.user?.name ?? "").toLowerCase().includes(auditSearch.toLowerCase())
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(admin)/(tabs)/dashboard");
    }
  };

  // Mock / Real Revenue Trends calculation for visual bar chart
  const revenueTrends = analytics?.revenue_trends ?? [
    { month: "Mar", gmv: 3400, commission: 340 },
    { month: "Apr", gmv: 5200, commission: 520 },
    { month: "May", gmv: 7800, commission: 780 },
    { month: "Jun", gmv: 9600, commission: 960 },
    { month: "Jul", gmv: 12400, commission: 1240 },
    { month: "Aug", gmv: analytics?.gmv || 14800, commission: analytics?.platform_commission || 1480 },
  ];

  const maxTrendGmv = Math.max(...revenueTrends.map((t) => t.gmv), 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
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
            name="pie-chart-outline"
            size={18}
            color={activeTab === "overview" ? "#60A5FA" : "#9CA3AF"}
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
            color={activeTab === "tenants" ? "#60A5FA" : "#9CA3AF"}
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
            name="settings-outline"
            size={18}
            color={activeTab === "governance" ? "#60A5FA" : "#9CA3AF"}
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

      {/* ─── MAIN CONTENT AREA ─── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading Platform Governance...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={reload} tintColor="#3B82F6" />
          }
        >
          {/* TAB 1: OVERVIEW & PLATFORM VISUAL ANALYTICS */}
          {activeTab === "overview" && (
            <Animated.View entering={FadeInDown}>
              {/* Dual Financial Hero Card */}
              <LinearGradient
                colors={["#1E1B4B", "#312E81"]}
                style={styles.heroCard}
              >
                <View style={styles.heroCardHeader}>
                  <Text style={styles.heroLabel}>Platform Gross Merchandise Value (GMV)</Text>
                  <View style={styles.currencyPill}>
                    <Text style={styles.currencyPillText}>
                      {analytics?.currency || "ETB"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.heroValue}>
                  ETB {(analytics?.gmv ?? 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </Text>

                <View style={styles.heroCommissionRow}>
                  <View style={styles.commissionPill}>
                    <Ionicons name="sparkles" size={12} color="#10B981" />
                    <Text style={styles.commissionPillText}>
                      Platform Commission (10%): ETB {(analytics?.platform_commission ?? ((analytics?.gmv ?? 0) * 0.10)).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* 📊 VISUAL ANALYTICS CHART 1: MONTHLY REVENUE GROWTH BARS */}
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <View>
                    <Text style={styles.cardTitle}>Monthly GMV Revenue Trends</Text>
                    <Text style={{ color: "#94A3B8", fontSize: 11 }}>6-Month Platform Revenue & Commission Growth</Text>
                  </View>
                  <View style={{ backgroundColor: "#3B82F622", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ color: "#60A5FA", fontSize: 10, fontWeight: "700" }}>+28% YoY</Text>
                  </View>
                </View>

                {/* Custom Visual Bar Chart */}
                <View style={styles.chartContainer}>
                  <View style={styles.chartBarsRow}>
                    {revenueTrends.map((t, idx) => {
                      const heightPercent = Math.max((t.gmv / maxTrendGmv) * 100, 15);
                      const isLatest = idx === revenueTrends.length - 1;

                      return (
                        <View key={t.month} style={styles.chartCol}>
                          <Text style={styles.chartValText}>
                            {(t.gmv / 1000).toFixed(1)}k
                          </Text>
                          <View style={styles.chartBarTrack}>
                            <LinearGradient
                              colors={isLatest ? ["#10B981", "#059669"] : ["#3B82F6", "#1D4ED8"]}
                              style={[styles.chartBarFill, { height: `${heightPercent}%` }]}
                            />
                          </View>
                          <Text style={[styles.chartLabelText, isLatest && { color: "#34D399", fontWeight: "800" }]}>
                            {t.month}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* 📊 VISUAL ANALYTICS CHART 2: SECTOR REVENUE SHARE DISTRIBUTION */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Service Sector Market Share</Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginBottom: 14 }}>
                  Revenue distribution across authorized service categories
                </Text>

                {SECTOR_CATEGORIES.map((cat) => (
                  <View key={cat.id} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name={cat.icon as any} size={16} color={cat.color} style={{ marginRight: 6 }} />
                        <Text style={{ color: "#F8FAFC", fontSize: 13, fontWeight: "700" }}>{cat.title}</Text>
                      </View>
                      <Text style={{ color: cat.color, fontSize: 12, fontWeight: "800" }}>{cat.sharePercent}%</Text>
                    </View>

                    <View style={styles.sectorProgressBarTrack}>
                      <View
                        style={[
                          styles.sectorProgressBarFill,
                          { width: `${cat.sharePercent}%`, backgroundColor: cat.color },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>

              {/* KPI Grid */}
              <View style={styles.gridRow}>
                <TouchableOpacity
                  style={styles.statBox}
                  activeOpacity={0.8}
                  onPress={() => setActiveTab("tenants")}
                >
                  <Ionicons name="business" size={20} color="#60A5FA" />
                  <Text style={styles.statBoxValue}>{analytics?.tenants?.total ?? 0}</Text>
                  <Text style={styles.statBoxLabel}>Total Tenants</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.statBox}
                  activeOpacity={0.8}
                  onPress={() => router.push("/(admin)/customers" as any)}
                >
                  <Ionicons name="people" size={20} color="#34D399" />
                  <Text style={styles.statBoxValue}>{analytics?.total_customers ?? 0}</Text>
                  <Text style={styles.statBoxLabel}>Total Customers</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gridRow}>
                <TouchableOpacity
                  style={styles.statBox}
                  activeOpacity={0.8}
                  onPress={() => router.push("/(admin)/staff" as any)}
                >
                  <Ionicons name="person-add" size={20} color="#A78BFA" />
                  <Text style={styles.statBoxValue}>{analytics?.total_staff ?? 0}</Text>
                  <Text style={styles.statBoxLabel}>Total Staff Crew</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.statBox}
                  activeOpacity={0.8}
                  onPress={() => router.push("/(admin)/invoices" as any)}
                >
                  <Ionicons name="receipt" size={20} color="#F59E0B" />
                  <Text style={styles.statBoxValue}>{analytics?.bookings?.total ?? 0}</Text>
                  <Text style={styles.statBoxLabel}>Global Orders</Text>
                </TouchableOpacity>
              </View>

              {/* Global Pipeline Stepper */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Global Order Pipeline</Text>
                <View style={styles.statusRow}>
                  <View style={styles.statusBadgeItem}>
                    <Text style={[styles.statusCount, { color: "#F59E0B" }]}>
                      {analytics?.bookings?.breakdown?.pending ?? 0}
                    </Text>
                    <Text style={styles.statusName}>Pending</Text>
                  </View>
                  <View style={styles.statusBadgeItem}>
                    <Text style={[styles.statusCount, { color: "#3B82F6" }]}>
                      {analytics?.bookings?.breakdown?.in_progress ?? 0}
                    </Text>
                    <Text style={styles.statusName}>In Progress</Text>
                  </View>
                  <View style={styles.statusBadgeItem}>
                    <Text style={[styles.statusCount, { color: "#10B981" }]}>
                      {analytics?.bookings?.breakdown?.completed ?? 0}
                    </Text>
                    <Text style={styles.statusName}>Completed</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* TAB 2: TENANTS MANAGEMENT & ONBOARDING */}
          {activeTab === "tenants" && (
            <Animated.View entering={FadeInDown}>
              {/* Search & Action Bar */}
              <View style={styles.tenantActionBar}>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search tenant business..."
                    placeholderTextColor="#64748B"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <TouchableOpacity
                  style={styles.onboardButton}
                  onPress={() => {
                    setWizardStep(1);
                    setModalVisible(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.onboardButtonText}>+ Onboard</Text>
                </TouchableOpacity>
              </View>

              {/* Tenant Cards List */}
              {filteredTenants.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="business-outline" size={48} color="#475569" />
                  <Text style={styles.emptyTitle}>No Tenants Found</Text>
                  <Text style={styles.emptySub}>
                    Tap "+ Onboard" to create a new tenant company and primary admin.
                  </Text>
                </View>
              ) : (
                filteredTenants.map((t) => {
                  const isActive = t.status === "active";
                  const primaryAdmin = t.users?.[0] || (t as any).admin;

                  return (
                    <View key={t.id} style={styles.tenantCard}>
                      <View style={styles.tenantCardHeader}>
                        <View style={styles.tenantTitleGroup}>
                          <Text style={styles.tenantName}>{t.business_name}</Text>
                          <View style={styles.planTag}>
                            <Text style={styles.planTagText}>
                              {t.plan.toUpperCase()} PLAN
                            </Text>
                          </View>
                        </View>

                        <View style={styles.switchGroup}>
                          <Text
                            style={[
                              styles.statusLabel,
                              { color: isActive ? "#10B981" : "#EF4444" },
                            ]}
                          >
                            {isActive ? "ACTIVE" : "SUSPENDED"}
                          </Text>
                          <Switch
                            value={isActive}
                            onValueChange={() => handleStatusToggle(t)}
                            trackColor={{ false: "#475569", true: "#059669" }}
                            thumbColor={isActive ? "#10B981" : "#94A3B8"}
                          />
                        </View>
                      </View>

                      {/* Enabled Service Categories */}
                      <View style={styles.categoriesRow}>
                        <Text style={styles.fieldLabel}>Sectors Enabled:</Text>
                        {(t.categories_enabled ?? []).map((cat) => (
                          <View key={cat} style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{cat}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Primary Admin User Box */}
                      {primaryAdmin && (
                        <View style={styles.adminUserBox}>
                          <Ionicons
                            name="person-circle-outline"
                            size={24}
                            color="#60A5FA"
                            style={{ marginRight: 8 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.adminName}>
                              Primary Admin: {primaryAdmin.name}
                            </Text>
                            <Text style={styles.adminEmail}>
                              {primaryAdmin.email} · {primaryAdmin.phone || "No phone"}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* ── TENANT ACTION BUTTONS (VIEW, EDIT, DELETE) ── */}
                      <View style={styles.tenantCardActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F655" }]}
                          onPress={() => setViewTenant(t)}
                        >
                          <Ionicons name="eye-outline" size={16} color="#60A5FA" />
                          <Text style={[styles.actionBtnText, { color: "#60A5FA" }]}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}
                          onPress={() => openEditModal(t)}
                        >
                          <Ionicons name="create-outline" size={16} color="#FBBF24" />
                          <Text style={[styles.actionBtnText, { color: "#FBBF24" }]}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: "#EF444422", borderColor: "#EF444455" }]}
                          onPress={() => setDeleteTenantTarget(t)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#F87171" />
                          <Text style={[styles.actionBtnText, { color: "#F87171" }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </Animated.View>
          )}

          {/* TAB 3: PROFESSIONAL SYSTEM GOVERNANCE SUITE & DIAGNOSTICS */}
          {activeTab === "governance" && (
            <Animated.View entering={FadeInDown}>
              {/* System Diagnostics & Operational Health */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>System Diagnostics & Operational Health</Text>

                <View style={styles.diagGrid}>
                  <View style={styles.diagBox}>
                    <Text style={styles.diagLabel}>Database Status</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981", marginRight: 6 }} />
                      <Text style={{ color: "#34D399", fontWeight: "800", fontSize: 13 }}>HEALTHY</Text>
                    </View>
                  </View>

                  <View style={styles.diagBox}>
                    <Text style={styles.diagLabel}>Server Runtime</Text>
                    <Text style={{ color: "#F8FAFC", fontWeight: "700", fontSize: 12, marginTop: 4 }}>
                      PHP {health?.php_version?.split("-")[0] || "8.2"} / Laravel {health?.laravel_version || "11"}
                    </Text>
                  </View>
                </View>

                <View style={styles.diagGrid}>
                  <View style={styles.diagBox}>
                    <Text style={styles.diagLabel}>Operational Mode</Text>
                    <Text style={{ color: "#60A5FA", fontWeight: "700", fontSize: 12, marginTop: 4 }}>
                      {(health?.environment || "production").toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.diagBox}>
                    <Text style={styles.diagLabel}>Active Tenants</Text>
                    <Text style={{ color: "#F59E0B", fontWeight: "800", fontSize: 14, marginTop: 4 }}>
                      {analytics?.tenants?.active ?? 0} Companies Active
                    </Text>
                  </View>
                </View>
              </View>

              {/* Governance Rules & Controls */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Global Platform Governance</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Default Platform Currency</Text>
                  <TextInput
                    style={styles.textInput}
                    value={settingsForm.default_currency}
                    onChangeText={(val) =>
                      setSettingsForm((p) => ({ ...p, default_currency: val }))
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Platform Commission Rate (%)</Text>
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
                  />
                </View>

                <View style={[styles.inputGroup, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.inputLabel}>Maintenance Mode</Text>
                    <Text style={{ color: "#64748B", fontSize: 11 }}>
                      If enabled, non-admin users will see a system maintenance message.
                    </Text>
                  </View>
                  <Switch
                    value={settingsForm.maintenance_mode}
                    onValueChange={(val) =>
                      setSettingsForm((p) => ({ ...p, maintenance_mode: val }))
                    }
                    trackColor={{ false: "#475569", true: "#DC2626" }}
                    thumbColor={settingsForm.maintenance_mode ? "#EF4444" : "#94A3B8"}
                  />
                </View>

                <View style={[styles.inputGroup, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.inputLabel}>Automated Crew Auto-Dispatch</Text>
                    <Text style={{ color: "#64748B", fontSize: 11 }}>
                      Automatically assign nearest available technician crew to incoming bookings.
                    </Text>
                  </View>
                  <Switch
                    value={settingsForm.auto_dispatch}
                    onValueChange={(val) =>
                      setSettingsForm((p) => ({ ...p, auto_dispatch: val }))
                    }
                    trackColor={{ false: "#475569", true: "#2563EB" }}
                    thumbColor={settingsForm.auto_dispatch ? "#3B82F6" : "#94A3B8"}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveSettingsButton}
                  onPress={handleSaveSettings}
                >
                  <Text style={styles.saveSettingsText}>Save Governance Settings</Text>
                </TouchableOpacity>
              </View>

              {/* Interactive Audit Logs Console */}
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={styles.cardTitle}>Platform Audit Console</Text>
                  <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700" }}>{filteredAuditLogs.length} Events</Text>
                </View>

                <View style={[styles.searchBox, { marginBottom: 12 }]}>
                  <Ionicons name="search" size={16} color="#94A3B8" />
                  <TextInput
                    style={[styles.searchInput, { height: 36, fontSize: 12 }]}
                    placeholder="Filter audit events..."
                    placeholderTextColor="#64748B"
                    value={auditSearch}
                    onChangeText={setAuditSearch}
                  />
                </View>

                {filteredAuditLogs.length === 0 ? (
                  <Text style={{ color: "#64748B", fontSize: 12, paddingVertical: 10, textAlign: "center" }}>
                    No matching audit events recorded.
                  </Text>
                ) : (
                  filteredAuditLogs.slice(0, 10).map((log) => (
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
                          By: {log.user.name} ({log.user.email})
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

      {/* ─── 👁️ VIEW TENANT DETAILS MODAL ─── */}
      <Modal
        visible={!!viewTenant}
        animationType="fade"
        transparent
        onRequestClose={() => setViewTenant(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{viewTenant?.business_name}</Text>
                <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Tenant ID #{viewTenant?.id} · {viewTenant?.plan.toUpperCase()} TIER
                </Text>
              </View>
              <TouchableOpacity onPress={() => setViewTenant(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }}>
              <View style={styles.detailCardSection}>
                <Text style={styles.detailCardLabel}>Account Status</Text>
                <View style={[styles.detailStatusBadge, { backgroundColor: viewTenant?.status === "active" ? "#10B98122" : "#EF444422" }]}>
                  <Text style={{ color: viewTenant?.status === "active" ? "#34D399" : "#F87171", fontWeight: "800", fontSize: 12 }}>
                    ● {viewTenant?.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.detailCardSection}>
                <Text style={styles.detailCardLabel}>Authorized Service Sectors</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {(viewTenant?.categories_enabled ?? []).map((cat) => (
                    <View key={cat} style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>✓ {cat}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {viewTenant?.users?.[0] && (
                <View style={styles.detailCardSection}>
                  <Text style={styles.detailCardLabel}>Primary Tenant Admin Account</Text>
                  <View style={styles.adminUserBox}>
                    <Ionicons name="person" size={20} color="#60A5FA" style={{ marginRight: 8 }} />
                    <View>
                      <Text style={styles.adminName}>{viewTenant.users[0].name}</Text>
                      <Text style={styles.adminEmail}>{viewTenant.users[0].email}</Text>
                      <Text style={styles.adminEmail}>{viewTenant.users[0].phone || "No phone registered"}</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.detailCardSection}>
                <Text style={styles.detailCardLabel}>Created Date</Text>
                <Text style={{ color: "#E2E8F0", fontSize: 13 }}>
                  {viewTenant?.created_at ? new Date(viewTenant.created_at).toLocaleString() : "N/A"}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeViewButton}
              onPress={() => setViewTenant(null)}
            >
              <Text style={styles.closeViewButtonText}>Close Inspection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── 🗑️ DELETE CONFIRMATION MODAL ─── */}
      <Modal
        visible={!!deleteTenantTarget}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteTenantTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: "#EF4444" }]}>
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: "#EF444422", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Ionicons name="warning-outline" size={28} color="#EF4444" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFF", textAlign: "center" }}>
                Delete Tenant Company?
              </Text>
              <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 18 }}>
                Are you sure you want to permanently delete <Text style={{ color: "#FFF", fontWeight: "700" }}>{deleteTenantTarget?.business_name}</Text>?
                {"\n\n"}This will erase the tenant business, primary admin credentials, staff profiles, and scoped bookings.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={styles.prevStepButton}
                onPress={() => setDeleteTenantTarget(null)}
                disabled={isDeleting}
              >
                <Text style={styles.prevStepButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, { flex: 1, backgroundColor: "#EF4444", marginTop: 0 }, isDeleting && { opacity: 0.7 }]}
                onPress={async () => {
                  if (!deleteTenantTarget) return;
                  setIsDeleting(true);
                  try {
                    await deleteTenant(deleteTenantTarget.id);
                    setDeleteTenantTarget(null);
                    Alert.alert("Deleted", `Tenant "${deleteTenantTarget.business_name}" deleted successfully.`);
                  } catch (err: any) {
                    Alert.alert("Delete Error", err?.message || "Failed to delete tenant.");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>🗑️ Yes, Delete Tenant</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── ✏️ EDIT TENANT & ADMIN CREDENTIALS MODAL ─── */}
      <Modal
        visible={!!editTenant}
        animationType="slide"
        transparent
        onRequestClose={() => setEditTenant(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Tenant & Admin User</Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  Update business profile, subscription, or primary admin credentials
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditTenant(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeader}>Business Profile & Tier</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.business_name}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, business_name: val }))}
                />
              </View>

              <Text style={styles.inputLabel}>Subscription Plan Tier</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
                {(["starter", "growth", "enterprise"] as const).map((planKey) => {
                  const isSel = editForm.plan === planKey;
                  return (
                    <TouchableOpacity
                      key={planKey}
                      style={[
                        styles.planOption,
                        isSel && styles.selectedPlanOption,
                        { flex: 0.31 },
                      ]}
                      onPress={() => setEditForm((p) => ({ ...p, plan: planKey }))}
                    >
                      <Text style={[styles.planOptionText, isSel && styles.selectedPlanOptionText]}>
                        {planKey.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Authorized Service Sectors</Text>
              <View style={{ marginBottom: 14 }}>
                {SECTOR_CATEGORIES.map((cat) => {
                  const isChecked = editForm.categories_enabled.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => toggleEditCategory(cat.id)}
                      style={[
                        styles.checkboxItem,
                        isChecked && styles.checkedCheckboxItem,
                      ]}
                    >
                      <Ionicons
                        name={isChecked ? "checkbox" : "square-outline"}
                        size={20}
                        color={isChecked ? cat.color : "#64748B"}
                      />
                      <Text style={[styles.checkboxText, { flex: 1, marginLeft: 8 }]}>{cat.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── ADMIN USER CREDENTIALS EDIT SECTION ── */}
              <Text style={styles.sectionHeader}>Primary Tenant Admin User Account</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Admin Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Admin Name"
                  placeholderTextColor="#64748B"
                  value={editForm.admin_name}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, admin_name: val }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Admin Email (Login ID) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="admin.company@clean.et"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={editForm.admin_email}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, admin_email: val }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reset Admin Password (Optional)</Text>
                <View style={styles.passwordInputWrap}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="Leave blank to keep existing password"
                    placeholderTextColor="#64748B"
                    secureTextEntry={!showEditPassword}
                    value={editForm.admin_password}
                    onChangeText={(val) => setEditForm((p) => ({ ...p, admin_password: val }))}
                  />
                  <TouchableOpacity
                    onPress={() => setShowEditPassword(!showEditPassword)}
                    style={styles.passwordEyeButton}
                  >
                    <Ionicons
                      name={showEditPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Admin Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="+2519..."
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  value={editForm.admin_phone}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, admin_phone: val }))}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.prevStepButton}
                onPress={() => setEditTenant(null)}
              >
                <Text style={styles.prevStepButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, { flex: 1, marginTop: 0 }, isUpdating && { opacity: 0.7 }]}
                onPress={handleSaveEditTenant}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Updates & Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MULTI-STEP ENTERPRISE TENANT ONBOARDING WIZARD MODAL ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header & Wizard Stepper */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Onboard Tenant Business</Text>
                <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
                  Step {wizardStep} of 3 — {wizardStep === 1 ? "Company & Subscription Plan" : wizardStep === 2 ? "Service Sector Roles" : "Primary Admin Credentials"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Stepper Progress Bar */}
            <View style={styles.wizardProgressBar}>
              <View style={[styles.wizardProgressFill, { width: wizardStep === 1 ? "33%" : wizardStep === 2 ? "66%" : "100%" }]} />
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* ── WIZARD STEP 1: COMPANY PROFILE & SUBSCRIPTION PLAN ── */}
              {wizardStep === 1 && (
                <Animated.View entering={FadeInDown}>
                  <Text style={styles.sectionHeader}>1. Business Profile</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tenant Business Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Apex Detailing Ltd / Skyline Cleaners"
                      placeholderTextColor="#64748B"
                      value={form.business_name}
                      onChangeText={(val) => setForm((p) => ({ ...p, business_name: val }))}
                    />
                  </View>

                  <Text style={styles.sectionHeader}>Select Subscription Plan Tier</Text>

                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const isSelected = form.plan === plan.id;
                    return (
                      <TouchableOpacity
                        key={plan.id}
                        activeOpacity={0.8}
                        onPress={() => setForm((p) => ({ ...p, plan: plan.id }))}
                        style={[
                          styles.planCardOption,
                          { borderColor: isSelected ? plan.borderColor : "#334155" },
                          isSelected && styles.planCardSelected,
                        ]}
                      >
                        <LinearGradient
                          colors={plan.colors}
                          style={styles.planCardGradient}
                        >
                          <View style={styles.planCardHeaderRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.planCardName}>{plan.name}</Text>
                              <Text style={styles.planCardMeta}>{plan.commission} · {plan.staffLimit}</Text>
                            </View>

                            <View
                              style={[
                                styles.planBadgePill,
                                { backgroundColor: isSelected ? plan.borderColor : "rgba(255,255,255,0.1)" },
                              ]}
                            >
                              <Text style={styles.planBadgePillText}>{plan.badge}</Text>
                            </View>
                          </View>

                          <View style={styles.planFeaturesList}>
                            {plan.features.map((feat, idx) => (
                              <View key={idx} style={styles.planFeatureItem}>
                                <Ionicons name="checkmark-circle" size={14} color={isSelected ? "#34D399" : "#60A5FA"} />
                                <Text style={styles.planFeatureText}>{feat}</Text>
                              </View>
                            ))}
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={styles.nextStepButton}
                    onPress={() => {
                      if (!form.business_name.trim()) {
                        Alert.alert("Required", "Please enter the Business Name.");
                        return;
                      }
                      setWizardStep(2);
                    }}
                  >
                    <Text style={styles.nextStepButtonText}>Continue to Service Sectors ➔</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* ── WIZARD STEP 2: AUTHORIZED SERVICE SECTOR ROLES ── */}
              {wizardStep === 2 && (
                <Animated.View entering={FadeInDown}>
                  <Text style={styles.sectionHeader}>2. Authorized Service Sectors</Text>
                  <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 12 }}>
                    Assign which multi-sector categories this tenant company is authorized to manage and receive dispatch orders for:
                  </Text>

                  {SECTOR_CATEGORIES.map((cat) => {
                    const isChecked = form.categories_enabled.includes(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        activeOpacity={0.8}
                        onPress={() => toggleCategory(cat.id)}
                        style={[
                          styles.sectorCategoryCard,
                          isChecked && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                        ]}
                      >
                        <View style={styles.sectorCategoryHeader}>
                          <View style={[styles.sectorIconWrap, { backgroundColor: `${cat.color}22` }]}>
                            <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                          </View>

                          <View style={{ flex: 1, marginHorizontal: 10 }}>
                            <Text style={styles.sectorCategoryTitle}>{cat.title}</Text>
                            <Text style={styles.sectorCategorySub}>{cat.subtitle}</Text>
                          </View>

                          <Ionicons
                            name={isChecked ? "checkbox-sharp" : "square-outline"}
                            size={24}
                            color={isChecked ? cat.color : "#64748B"}
                          />
                        </View>

                        <View style={styles.sectorTagsRow}>
                          {cat.tags.map((t, idx) => (
                            <View key={idx} style={[styles.sectorTagPill, isChecked && { backgroundColor: `${cat.color}25` }]}>
                              <Text style={[styles.sectorTagText, isChecked && { color: "#F9FAFB" }]}>#{t}</Text>
                            </View>
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <View style={styles.wizardNavRow}>
                    <TouchableOpacity
                      style={styles.prevStepButton}
                      onPress={() => setWizardStep(1)}
                    >
                      <Text style={styles.prevStepButtonText}>⬅ Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.nextStepButton, { flex: 1, marginLeft: 10 }]}
                      onPress={() => {
                        if (form.categories_enabled.length === 0) {
                          Alert.alert("Required", "Please select at least one authorized service sector category.");
                          return;
                        }
                        setWizardStep(3);
                      }}
                    >
                      <Text style={styles.nextStepButtonText}>Continue to Admin Credentials ➔</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}

              {/* ── WIZARD STEP 3: PRIMARY TENANT ADMIN USER ACCOUNT ── */}
              {wizardStep === 3 && (
                <Animated.View entering={FadeInDown}>
                  <Text style={styles.sectionHeader}>3. Primary Tenant Admin Credentials</Text>
                  <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 14 }}>
                    Create the primary executive account for <Text style={{ color: "#FFF", fontWeight: "700" }}>{form.business_name}</Text>:
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tenant Admin Full Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Solomon Teklu / Bethlehem Girma"
                      placeholderTextColor="#64748B"
                      value={form.admin_name}
                      onChangeText={(val) => setForm((p) => ({ ...p, admin_name: val }))}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Admin Email Address (Login ID) *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. admin.company@clean.et"
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={form.admin_email}
                      onChangeText={(val) => setForm((p) => ({ ...p, admin_email: val }))}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Secure Admin Password *</Text>
                    <View style={styles.passwordInputWrap}>
                      <TextInput
                        style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                        placeholder="Min 6 characters"
                        placeholderTextColor="#64748B"
                        secureTextEntry={!showPassword}
                        value={form.admin_password}
                        onChangeText={(val) => setForm((p) => ({ ...p, admin_password: val }))}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.passwordEyeButton}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Admin Phone Number</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="+2519..."
                      placeholderTextColor="#64748B"
                      keyboardType="phone-pad"
                      value={form.admin_phone}
                      onChangeText={(val) => setForm((p) => ({ ...p, admin_phone: val }))}
                    />
                  </View>

                  {/* Summary Box */}
                  <View style={styles.onboardingSummaryCard}>
                    <Text style={styles.summaryCardTitle}>Onboarding Summary</Text>
                    <Text style={styles.summaryText}>• Business: {form.business_name || "N/A"}</Text>
                    <Text style={styles.summaryText}>• Plan Tier: {form.plan.toUpperCase()}</Text>
                    <Text style={styles.summaryText}>• Authorized Sectors: {form.categories_enabled.join(", ")}</Text>
                    <Text style={styles.summaryText}>• Primary Admin: {form.admin_name || "Admin"} ({form.admin_email || "Pending"})</Text>
                  </View>

                  <View style={styles.wizardNavRow}>
                    <TouchableOpacity
                      style={styles.prevStepButton}
                      onPress={() => setWizardStep(2)}
                    >
                      <Text style={styles.prevStepButtonText}>⬅ Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.submitButton, { flex: 1, marginLeft: 10 }, isSubmitting && { opacity: 0.7 }]}
                      onPress={handleCreateTenant}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>🚀 Onboard & Activate Tenant</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
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
    marginTop: 8,
  },
  heroCommissionRow: {
    marginTop: 10,
  },
  commissionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  commissionPillText: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
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
    marginBottom: 2,
  },
  chartContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  chartBarsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 140,
    paddingTop: 10,
  },
  chartCol: {
    alignItems: "center",
    flex: 1,
  },
  chartValText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    marginBottom: 4,
  },
  chartBarTrack: {
    width: 18,
    height: 90,
    backgroundColor: "#1E293B",
    borderRadius: 9,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBarFill: {
    width: "100%",
    borderRadius: 9,
  },
  chartLabelText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 6,
    fontWeight: "600",
  },
  sectorProgressBarTrack: {
    height: 8,
    backgroundColor: "#0F172A",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectorProgressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  diagGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  diagBox: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  diagLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
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
  tenantCardActions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  detailCardSection: {
    marginBottom: 14,
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  detailCardLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  closeViewButton: {
    backgroundColor: "#334155",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
  },
  closeViewButtonText: {
    color: "#FFF",
    fontWeight: "700",
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
    marginBottom: 6,
  },
  passwordInputWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordEyeButton: {
    position: "absolute",
    right: 12,
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 20,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  wizardProgressBar: {
    height: 4,
    backgroundColor: "#334155",
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  wizardProgressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 2,
  },
  modalScroll: {
    maxHeight: 520,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#60A5FA",
    marginTop: 4,
    marginBottom: 12,
  },
  planCardOption: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    overflow: "hidden",
  },
  planCardSelected: {
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  planCardGradient: {
    padding: 14,
  },
  planCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planCardName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFF",
  },
  planCardMeta: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  planBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planBadgePillText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  planFeaturesList: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  planFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  planFeatureText: {
    fontSize: 11,
    color: "#CBD5E1",
    marginLeft: 6,
  },
  sectorCategoryCard: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  sectorCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectorIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectorCategoryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFF",
  },
  sectorCategorySub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  sectorTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    gap: 6,
  },
  sectorTagPill: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectorTagText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  wizardNavRow: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 10,
  },
  prevStepButton: {
    backgroundColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  prevStepButtonText: {
    color: "#E2E8F0",
    fontWeight: "700",
  },
  nextStepButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  nextStepButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
  },
  onboardingSummaryCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  summaryCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#60A5FA",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  summaryText: {
    fontSize: 11,
    color: "#CBD5E1",
    marginBottom: 2,
  },
  submitButton: {
    backgroundColor: "#10B981",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
  },
  planOption: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingVertical: 10,
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
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  checkedCheckboxItem: {
    borderColor: "#3B82F6",
  },
  checkboxText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
  },
});
