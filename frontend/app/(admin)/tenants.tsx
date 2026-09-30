import React, { useState, useEffect, useMemo } from "react";
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
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight, FadeOutUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "../../hooks/useColors";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  useSuperAdmin,
  Tenant,
  CreateTenantPayload,
} from "../../hooks/useSuperAdmin";

type ActiveTab = "overview" | "divisions" | "sectors";

interface SectorCategoryOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

const SECTOR_ICON_OPTIONS = [
  { icon: "car-sport", color: "#3B82F6", label: "Automotive & Fleet" },
  { icon: "business", color: "#10B981", label: "Building & Office" },
  { icon: "shirt", color: "#8B5CF6", label: "Laundry & Textiles" },
  { icon: "sunny", color: "#F59E0B", label: "Solar & Energy" },
  { icon: "home", color: "#6366F1", label: "Residential Cleaning" },
  { icon: "medkit", color: "#EF4444", label: "Medical Sanitization" },
  { icon: "water", color: "#06B6D4", label: "Pool & Water Tank" },
  { icon: "bug", color: "#84CC16", label: "Pest & Fumigation" },
  { icon: "trash-bin", color: "#64748B", label: "Janitorial & Waste" },
  { icon: "construct", color: "#F97316", label: "Post-Construction" },
  { icon: "restaurant", color: "#EAB308", label: "Kitchen & Dining" },
  { icon: "sparkles", color: "#EC4899", label: "Glass & Deep Polish" },
  { icon: "leaf", color: "#14B8A6", label: "Eco-Friendly Care" },
  { icon: "grid", color: "#A855F7", label: "Tile & Carpet" },
  { icon: "shield-checkmark", color: "#0284C7", label: "Disinfection & Safety" },
  { icon: "snow", color: "#38BDF8", label: "HVAC & Air Duct" },
];

const SECTORS_STORAGE_KEY = "@clean_et_custom_sectors";

const DEFAULT_SECTOR_OPTIONS: SectorCategoryOption[] = [
  {
    id: "car-washing",
    title: "Car Washing & Auto Detailing",
    subtitle: "Fleet, Mobile Doorstep, Valet Pickup & Bay Wash Stations",
    icon: "car-sport",
    color: "#3B82F6",
  },
  {
    id: "building-cleaning",
    title: "Building & Property Cleaning",
    subtitle: "Exterior Facade Glass & Deep Interior Building Sanitization",
    icon: "business",
    color: "#10B981",
  },
  {
    id: "commercial-laundry",
    title: "Commercial Laundry & Dry Cleaning",
    subtitle: "Enterprise Linen, Uniforms & Heavy Textile Sanitization",
    icon: "shirt",
    color: "#8B5CF6",
  },
  {
    id: "solar-panel-cleaning",
    title: "Solar Panel & Renewable Maintenance",
    subtitle: "Photovoltaic Panel Washing & Efficiency Restoration",
    icon: "sunny",
    color: "#F59E0B",
  },
];

export default function SuperAdminTenants() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const {
    analytics,
    tenants,
    refreshing,
    onRefresh,
    createTenant,
    updateTenant,
    updateTenantStatus,
    impersonateTenant,
    stopImpersonation,
    impersonatingId,
  } = useSuperAdmin();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "suspended">("ALL");

  // Create / Edit Division Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    admin_password: "",
    categories_enabled: ["car-washing"],
  });

  // Inspect Division Modal
  const [inspectTenant, setInspectTenant] = useState<Tenant | null>(null);

  // Status Toggle Loading & Custom Confirmation Modal State
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    tenant: Tenant;
    nextStatus: "active" | "suspended";
  } | null>(null);

  // Toast Notification Banner State
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Dynamic Sector Options & Custom Sector Creator State
  const [sectorOptions, setSectorOptions] = useState<SectorCategoryOption[]>(DEFAULT_SECTOR_OPTIONS);
  const [showAddSectorInput, setShowAddSectorInput] = useState(false);
  const [customSectorName, setCustomSectorName] = useState("");
  const [selectedCustomIcon, setSelectedCustomIcon] = useState(SECTOR_ICON_OPTIONS[0]);

  const saveSectorsToStorage = async (updatedSectors: SectorCategoryOption[]) => {
    try {
      await AsyncStorage.setItem(SECTORS_STORAGE_KEY, JSON.stringify(updatedSectors));
    } catch (e) {
      console.warn("Failed to persist sectors to AsyncStorage:", e);
    }
  };

  // Load custom sectors from AsyncStorage on mount
  useEffect(() => {
    const loadStoredSectors = async () => {
      try {
        const stored = await AsyncStorage.getItem(SECTORS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const combinedMap = new Map<string, SectorCategoryOption>();
            DEFAULT_SECTOR_OPTIONS.forEach((sec) => combinedMap.set(sec.id, sec));
            parsed.forEach((sec: SectorCategoryOption) => {
              if (sec && sec.id) combinedMap.set(sec.id, sec);
            });
            setSectorOptions(Array.from(combinedMap.values()));
          }
        }
      } catch (e) {
        console.warn("Failed to load sectors from AsyncStorage:", e);
      }
    };
    loadStoredSectors();
  }, []);

  // Sync sector options with any custom categories in backend tenants data
  useEffect(() => {
    if (tenants && tenants.length > 0) {
      setSectorOptions((prevOptions) => {
        let hasNew = false;
        const newOptions = [...prevOptions];
        tenants.forEach((tenant) => {
          (tenant.categories_enabled || []).forEach((catSlug) => {
            const exists = newOptions.some((s) => s.id === catSlug);
            if (!exists) {
              hasNew = true;
              const title = catSlug
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
              newOptions.push({
                id: catSlug,
                title,
                subtitle: "Enterprise Cleaning Division Sector",
                icon: "sparkles",
                color: "#6366F1",
              });
            }
          });
        });
        if (hasNew) {
          saveSectorsToStorage(newOptions);
          return newOptions;
        }
        return prevOptions;
      });
    }
  }, [tenants]);

  // Dedicated Sector Creation Modal State (For Sectors Tab)
  const [createSectorModalVisible, setCreateSectorModalVisible] = useState(false);
  const [sectorForm, setSectorForm] = useState({
    title: "",
    subtitle: "",
    icon: "sparkles",
    color: "#3B82F6",
  });

  const handleCreateSectorFromTab = async () => {
    if (!sectorForm.title.trim()) {
      showToast("error", "Sector Title is required.");
      return;
    }
    const slug = sectorForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!slug) return;

    if (sectorOptions.some((s) => s.id === slug)) {
      showToast("info", "A sector with this name already exists.");
      return;
    }

    const newSector: SectorCategoryOption = {
      id: slug,
      title: sectorForm.title.trim(),
      subtitle: sectorForm.subtitle.trim() || "Custom Enterprise Cleaning Sector",
      icon: sectorForm.icon || "sparkles",
      color: sectorForm.color || "#3B82F6",
    };

    const updated = [...sectorOptions, newSector];
    setSectorOptions(updated);
    await saveSectorsToStorage(updated);
    setCreateSectorModalVisible(false);
    setSectorForm({ title: "", subtitle: "", icon: "sparkles", color: "#3B82F6" });
    showToast("success", `Sector "${newSector.title}" created & saved!`);
  };

  const handleAddCustomSector = async () => {
    if (!customSectorName.trim()) return;
    const slug = customSectorName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!slug) return;

    const exists = sectorOptions.some((s) => s.id === slug);
    if (exists) {
      showToast("info", "Sector already exists in options.");
      return;
    }

    const newOption: SectorCategoryOption = {
      id: slug,
      title: customSectorName.trim(),
      subtitle: "Custom Enterprise Cleaning Sector",
      icon: selectedCustomIcon.icon,
      color: selectedCustomIcon.color,
    };

    const updated = [...sectorOptions, newOption];
    setSectorOptions(updated);
    await saveSectorsToStorage(updated);
    setForm((prev) => ({
      ...prev,
      categories_enabled: [...prev.categories_enabled, slug],
    }));
    setCustomSectorName("");
    setShowAddSectorInput(false);
    showToast("success", `Custom sector "${newOption.title}" created & saved!`);
  };

  /* --- TOGGLE SECTOR --- */
  const toggleSector = (sectorId: string) => {
    setForm((prev) => {
      const exists = prev.categories_enabled.includes(sectorId);
      let updated: string[];
      if (exists) {
        if (prev.categories_enabled.length === 1) {
          Alert.alert("Requirement", "At least one cleaning sector must be assigned.");
          return prev;
        }
        updated = prev.categories_enabled.filter((id) => id !== sectorId);
      } else {
        updated = [...prev.categories_enabled, sectorId];
      }
      return { ...prev, categories_enabled: updated };
    });
  };

  /* --- OPEN ADD / EDIT MODAL --- */
  const openAddModal = () => {
    setEditingTenant(null);
    setForm({
      business_name: "",
      admin_name: "",
      admin_email: "",
      admin_phone: "",
      admin_password: "",
      categories_enabled: ["car-washing"],
    });
    setModalVisible(true);
  };

  const openEditModal = (t: Tenant) => {
    const manager = t.users && t.users.length > 0 ? t.users[0] : null;
    setEditingTenant(t);
    setForm({
      business_name: t.business_name || "",
      admin_name: manager?.name || "",
      admin_email: manager?.email || "",
      admin_phone: manager?.phone || "",
      admin_password: "",
      categories_enabled: t.categories_enabled || ["car-washing"],
    });
    setModalVisible(true);
  };

  /* --- SAVE DIVISION (CREATE / EDIT) --- */
  const handleSaveDivision = async () => {
    if (!form.business_name.trim()) {
      return Alert.alert("Required", "Division Name is required.");
    }

    if (!editingTenant && (!form.admin_name.trim() || !form.admin_email.trim() || !form.admin_password.trim())) {
      return Alert.alert("Required", "Division Manager Name, Email, and Initial Password are required.");
    }

    setIsSubmitting(true);
    try {
      const payload: CreateTenantPayload = {
        business_name: form.business_name.trim(),
        plan: "enterprise",
        categories_enabled: form.categories_enabled,
        admin_name: form.admin_name.trim() || undefined,
        admin_email: form.admin_email.trim() || undefined,
        admin_phone: form.admin_phone.trim() || undefined,
        admin_password: form.admin_password.trim() || undefined,
      };

      if (editingTenant) {
        await updateTenant(editingTenant.id, payload);
        Alert.alert("Updated", `Cleaning Division "${form.business_name}" updated successfully.`);
      } else {
        await createTenant(payload);
        Alert.alert(
          "?? Success",
          `New Cleaning Division "${form.business_name}" created!\n\nManager Account Credentials:\nEmail: ${form.admin_email}\nPassword: ${form.admin_password}`
        );
      }

      setModalVisible(false);
      setEditingTenant(null);
      setForm({
        business_name: "",
        admin_name: "",
        admin_email: "",
        admin_phone: "",
        admin_password: "",
        categories_enabled: ["car-washing"],
      });
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || e.message || "Failed to save division.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --- TOGGLE DIVISION STATUS --- */
  const handleToggleStatus = (tenant: Tenant) => {
    const nextStatus = tenant.status === "active" ? "suspended" : "active";
    setStatusConfirmModal({ tenant, nextStatus });
  };

  const executeStatusToggle = async () => {
    if (!statusConfirmModal) return;
    const { tenant, nextStatus } = statusConfirmModal;
    setUpdatingStatusId(tenant.id);
    try {
      await updateTenantStatus(tenant.id, nextStatus);
      showToast(
        "success",
        `Division "${tenant.business_name}" is now ${nextStatus.toUpperCase()}.`
      );
      setStatusConfirmModal(null);
    } catch (err: any) {
      showToast(
        "error",
        err?.response?.data?.message || err.message || "Failed to update division status."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = t.business_name.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* -- ?? TOAST NOTIFICATION BANNER -- */}
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
      {/* -- HEADER -- */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(admin)/(tabs)/dashboard");
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>?? Super Admin Governance</Text>
          <Text style={styles.headerSubtitle}>
            Clean.et Enterprise Cleaning Divisions & Sectors Governance
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => router.push("/(admin)/notifications")}>
          <Ionicons name="notifications-outline" size={18} color="#F472B6" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      {/* Impersonation Alert Banner */}
      {impersonatingId && (
        <View style={styles.impersonateBanner}>
          <Ionicons name="eye-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.impersonateText}>
            Currently Inspecting Division #{impersonatingId}
          </Text>
          <TouchableOpacity style={styles.exitImpersonateBtn} onPress={stopImpersonation}>
            <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>Exit View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* -- TOP NAV TABS (SCROLLABLE & RESPONSIVE) -- */}
      <View style={styles.tabBarOuterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContentContainer}
        >
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "overview" && styles.tabItemActive]}
            onPress={() => setActiveTab("overview")}
          >
            <Ionicons name="stats-chart" size={16} color={activeTab === "overview" ? "#60A5FA" : "#94A3B8"} />
            <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>Overview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "divisions" && styles.tabItemActive]}
            onPress={() => setActiveTab("divisions")}
          >
            <Ionicons name="business" size={16} color={activeTab === "divisions" ? "#60A5FA" : "#94A3B8"} />
            <Text style={[styles.tabText, activeTab === "divisions" && styles.tabTextActive]}>
              Divisions ({tenants.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "sectors" && styles.tabItemActive]}
            onPress={() => setActiveTab("sectors")}
          >
            <Ionicons name="layers" size={16} color={activeTab === "sectors" ? "#60A5FA" : "#94A3B8"} />
            <Text style={[styles.tabText, activeTab === "sectors" && styles.tabTextActive]}>
              Sectors ({sectorOptions.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {/* -- TAB 1: OVERVIEW -- */}
        {activeTab === "overview" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* HERO EXECUTIVE SUMMARY */}
            <LinearGradient colors={["#1E1B4B", "#312E81"]} style={styles.heroCard}>
              <Text style={styles.heroLabel}>ENTERPRISE GROSS MERCHANDISE VALUE</Text>
              <Text style={styles.heroValue}>
                ETB {Number(analytics?.gmv || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
              </Text>
              <View style={{ flexDirection: "row", marginTop: 12, gap: 10 }}>
                <View style={styles.heroMiniStat}>
                  <Text style={styles.heroMiniLabel}>DIVISIONS ACTIVE</Text>
                  <Text style={styles.heroMiniVal}>{analytics?.tenants?.active ?? tenants.length}</Text>
                </View>
                <View style={styles.heroMiniStat}>
                  <Text style={styles.heroMiniLabel}>FIELD CREW</Text>
                  <Text style={styles.heroMiniVal}>{analytics?.total_staff ?? 0}</Text>
                </View>
                <View style={styles.heroMiniStat}>
                  <Text style={styles.heroMiniLabel}>TOTAL CLIENTS</Text>
                  <Text style={styles.heroMiniVal}>{analytics?.total_customers ?? 0}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Quick Actions Grid */}
            <View style={{ flexDirection: "row", gap: 10, marginVertical: 14 }}>
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: "#059669" }]}
                onPress={() => {
                  openAddModal();
                  setActiveTab("divisions");
                }}
              >
                <Ionicons name="add-circle" size={24} color="#FFF" />
                <Text style={styles.quickActionText}>+ Add Cleaning Division</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: "#2563EB" }]}
                onPress={() => setActiveTab("sectors")}
              >
                <Ionicons name="layers-outline" size={24} color="#FFF" />
                <Text style={styles.quickActionText}>Explore & Add Sectors</Text>
              </TouchableOpacity>
            </View>

            {/* System Divisions List Preview */}
            <Text style={styles.sectionHeaderTitle}>?? Enterprise Service Divisions</Text>
            {tenants.map((tenant) => (
              <View key={tenant.id} style={styles.divisionPreviewCard}>
                <View style={styles.divisionIconBox}>
                  <Ionicons name="business" size={20} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "800", fontSize: 14 }}>
                    {tenant.business_name}
                  </Text>
                  <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                    Sectors: {(tenant.categories_enabled || ["car-washing"]).join(", ")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: tenant.status === "active" ? "#10B98122" : "#EF444422" },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: tenant.status === "active" ? "#34D399" : "#F87171",
                    }}
                  >
                    {tenant.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* -- TAB 2: DIVISIONS -- */}
        {activeTab === "divisions" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Search & Action Bar */}
            <View style={styles.actionBar}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search division by name..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addBtnText}>+ Division</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {(["ALL", "active", "suspended"] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setStatusFilter(st)}
                  style={[
                    styles.filterChip,
                    statusFilter === st && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === st && styles.filterChipTextActive,
                    ]}
                  >
                    {st.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Divisions Roster Cards */}
            {filteredTenants.map((t, idx) => {
              const manager = t.users && t.users.length > 0 ? t.users[0] : null;
              const isUpdatingStatus = updatingStatusId === t.id;

              return (
                <Animated.View key={t.id} entering={FadeInRight.delay(idx * 50)}>
                  <View style={styles.card}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, marginRight: 8 }}>
                        <View style={styles.avatarBox}>
                          <Ionicons name="business" size={20} color="#60A5FA" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle} numberOfLines={1}>{t.business_name || `Division #${t.id}`}</Text>
                          <Text style={styles.cardSub}>Division ID #{t.id}</Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: t.status === "active" ? "#10B98122" : "#EF444422" },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: t.status === "active" ? "#34D399" : "#F87171",
                          }}
                        >
                          {t.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Manager Contact Details */}
                    <View style={styles.managerDetailsRow}>
                      <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700" }}>
                        DEPARTMENT DIVISION MANAGER
                      </Text>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 2 }}>
                        ?? {manager ? manager.name : "Unassigned"}
                      </Text>
                      <Text style={{ color: "#CBD5E1", fontSize: 11, marginTop: 1 }}>
                        ?? {manager ? manager.email : "No Email"} {manager?.phone ? `• ?? ${manager.phone}` : ""}
                      </Text>
                    </View>

                    {/* Actions: Inspect, Edit, Suspend/Activate */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F655" }]}
                        onPress={() => setInspectTenant(t)}
                      >
                        <Ionicons name="eye-outline" size={14} color="#60A5FA" />
                        <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                          Inspect
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}
                        onPress={() => openEditModal(t)}
                      >
                        <Ionicons name="create-outline" size={14} color="#FBBF24" />
                        <Text style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                          Edit
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: t.status === "active" ? "#EF444422" : "#10B98122",
                            borderColor: t.status === "active" ? "#EF444455" : "#10B98155",
                          },
                        ]}
                        onPress={() => handleToggleStatus(t)}
                        disabled={isUpdatingStatus}
                      >
                        {isUpdatingStatus ? (
                          <ActivityIndicator size="small" color={t.status === "active" ? "#F87171" : "#34D399"} />
                        ) : (
                          <>
                            <Ionicons
                              name={t.status === "active" ? "pause-circle-outline" : "play-circle-outline"}
                              size={14}
                              color={t.status === "active" ? "#F87171" : "#34D399"}
                            />
                            <Text
                              style={{
                                color: t.status === "active" ? "#F87171" : "#34D399",
                                fontSize: 11,
                                fontWeight: "700",
                                marginLeft: 4,
                              }}
                            >
                              {t.status === "active" ? "Suspend" : "Activate"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {/* -- TAB 3: SECTORS -- */}
        {activeTab === "sectors" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Header & Create Button */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.sectionHeaderTitle}>? Enterprise Cleaning Sectors</Text>
                <Text style={{ color: "#94A3B8", fontSize: 11 }}>
                  Platform Service Domains & Division Operational Licensing
                </Text>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 }}
                onPress={() => setCreateSectorModalVisible(true)}
              >
                <Ionicons name="add-circle" size={16} color="#FFF" />
                <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>+ Create Sector</Text>
              </TouchableOpacity>
            </View>

            {/* Sector Cards Roster */}
            {sectorOptions.map((sec) => {
              const operatingDivisions = tenants.filter((t) =>
                (t.categories_enabled || []).includes(sec.id)
              );

              return (
                <View key={sec.id} style={styles.sectorRosterCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={[styles.sectorRosterIconBox, { backgroundColor: `${sec.color}22`, borderColor: `${sec.color}55` }]}>
                      <Ionicons name={sec.icon as any} size={24} color={sec.color} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>{sec.title}
                        </Text>
                        <View style={styles.slugBadge}>
                          <Text style={styles.slugBadgeText}>{sec.id}</Text>
                        </View>
                      </View>
                      <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
                        {sec.subtitle}
                      </Text>
                    </View>
                  </View>

                  {/* Divisions operating in this sector */}
                  <View style={styles.sectorDivisionsFooter}>
                    <Text style={{ color: "#CBD5E1", fontSize: 11, fontWeight: "700" }}>
                      OPERATING DIVISIONS ({operatingDivisions.length}):
                    </Text>
                    <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "600", marginTop: 2 }}>
                      {operatingDivisions.length > 0
                        ? operatingDivisions.map((d) => d.business_name).join(" • ")
                        : "No divisions currently licensed"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>

      {/* -- ??? INSPECT DIVISION MODAL -- */}
      <Modal visible={!!inspectTenant} transparent animationType="fade" onRequestClose={() => setInspectTenant(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{inspectTenant?.business_name}</Text>
                <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Division ID #{inspectTenant?.id}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectTenant(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Division Operating Status</Text>
                <Text
                  style={{
                    color: inspectTenant?.status === "active" ? "#34D399" : "#F87171",
                    fontSize: 15,
                    fontWeight: "800",
                    marginTop: 2,
                  }}
                >
                  ?? {inspectTenant?.status.toUpperCase()}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Authorized Cleaning Sectors</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 2 }}>{(inspectTenant?.categories_enabled || ["car-washing"]).join(", ")}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Department Manager Credentials</Text>
                {inspectTenant?.users && inspectTenant.users.length > 0 ? (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>
                      ?? {inspectTenant.users[0].name}
                    </Text>
                    <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>
                      ?? Email: {inspectTenant.users[0].email}
                    </Text>
                    {inspectTenant.users[0].phone && (
                      <Text style={{ color: "#CBD5E1", fontSize: 12, marginTop: 1 }}>
                        ?? Phone: {inspectTenant.users[0].phone}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>No manager assigned.</Text>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setInspectTenant(null)}>
              <Text style={styles.closeBtnText}>Close Inspection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* -- ?? REGISTER / EDIT CLEANING DIVISION MODAL -- */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingTenant ? "?? Edit Cleaning Division" : "+ Register Cleaning Division"}
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  {editingTenant
                    ? "Update division business details, authorized sectors, and manager contact"
                    : "Set up new internal department and assign primary Division Manager credentials"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Division Business Name *</Text>
                <TextInput
                  placeholder="e.g. Clean.et Car Washing Division"
                  placeholderTextColor="#64748B"
                  value={form.business_name}
                  onChangeText={(t) => setForm({ ...form, business_name: t })}
                  style={styles.textInput}
                />
              </View>

              <Text style={styles.inputLabel}>Select Authorized Cleaning Sectors *</Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                {sectorOptions.map((sec) => {
                  const isSel = form.categories_enabled.includes(sec.id);
                  return (
                    <TouchableOpacity
                      key={sec.id}
                      onPress={() => toggleSector(sec.id)}
                      style={[
                        styles.sectorOptionCard,
                        isSel && { borderColor: sec.color, backgroundColor: `${sec.color}15` },
                      ]}
                    >
                      <Ionicons name={sec.icon as any} size={20} color={sec.color} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>{sec.title}</Text>
                        <Text style={{ color: "#94A3B8", fontSize: 10, marginTop: 1 }}>{sec.subtitle}</Text>
                      </View>
                      <Ionicons
                        name={isSel ? "checkbox" : "square-outline"}
                        size={20}
                        color={isSel ? sec.color : "#64748B"}
                      />
                    </TouchableOpacity>
                  );
                })}

                {/* + Define Custom Cleaning Sector */}
                {showAddSectorInput ? (
                  <View style={[styles.customSectorInputCard, { flexDirection: "column", alignItems: "stretch" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TextInput
                        placeholder="e.g. Hospital & Medical Sanitization"
                        placeholderTextColor="#64748B"
                        value={customSectorName}
                        onChangeText={setCustomSectorName}
                        style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                      />
                      <TouchableOpacity
                        style={{ padding: 8 }}
                        onPress={() => {
                          setShowAddSectorInput(false);
                          setCustomSectorName("");
                        }}
                      >
                        <Ionicons name="close" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>

                    <Text style={{ color: "#94A3B8", fontSize: 10, fontWeight: "700", marginTop: 8, marginBottom: 4 }}>
                      SELECT ICON FOR NEW SECTOR:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {SECTOR_ICON_OPTIONS.map((item) => {
                          const isSel = selectedCustomIcon.icon === item.icon;
                          return (
                            <TouchableOpacity
                              key={item.icon}
                              onPress={() => setSelectedCustomIcon(item)}
                              style={[
                                styles.miniIconPill,
                                isSel && { borderColor: item.color, backgroundColor: `${item.color}25` },
                              ]}
                            >
                              <Ionicons name={item.icon as any} size={16} color={item.color} />
                              <Text style={{ color: isSel ? item.color : "#94A3B8", fontSize: 9, fontWeight: "700" }}>
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>

                    <TouchableOpacity style={styles.addCustomSectorBtn} onPress={handleAddCustomSector}>
                      <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 12, textAlign: "center" }}>
                        + Add Custom Sector ({selectedCustomIcon.label})
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.showAddSectorCard}
                    onPress={() => setShowAddSectorInput(true)}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#60A5FA" />
                    <Text style={{ color: "#60A5FA", fontSize: 12, fontWeight: "700" }}>
                      + Define New Custom Cleaning Sector
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Manager Credentials Form */}
              <View style={styles.managerFormSection}>
                <Text style={styles.managerSectionTitle}>
                  ?? DEPARTMENT DIVISION MANAGER CREDENTIALS
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Manager Full Name {editingTenant ? "" : "*"}</Text>
                  <TextInput
                    placeholder="e.g. Abebe Bikila"
                    placeholderTextColor="#64748B"
                    value={form.admin_name}
                    onChangeText={(t) => setForm({ ...form, admin_name: t })}
                    style={styles.textInput}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Manager Email {editingTenant ? "" : "*"}</Text>
                    <TextInput
                      placeholder="manager@clean.et"
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={form.admin_email}
                      onChangeText={(t) => setForm({ ...form, admin_email: t })}
                      style={styles.textInput}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      placeholder="+251911223344"
                      placeholderTextColor="#64748B"
                      keyboardType="phone-pad"
                      value={form.admin_phone}
                      onChangeText={(t) => setForm({ ...form, admin_phone: t })}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { marginTop: 10 }]}>
                  <Text style={styles.inputLabel}>
                    {editingTenant ? "New Password (Leave blank to keep current)" : "Initial Account Password *"}
                  </Text>
                  <TextInput
                    placeholder={editingTenant ? "Enter new password if changing" : "Enter initial login password"}
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    value={form.admin_password}
                    onChangeText={(t) => setForm({ ...form, admin_password: t })}
                    style={styles.textInput}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSaveDivision}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    {editingTenant ? "Save Changes" : "Register Division"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* -- ??? CUSTOM DIVISION STATUS TOGGLE CONFIRMATION MODAL -- */}
      <Modal
        visible={!!statusConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusConfirmModal(null)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(300)} style={styles.confirmModalCard}>
            <View
              style={[
                styles.confirmIconContainer,
                {
                  backgroundColor:
                    statusConfirmModal?.nextStatus === "suspended" ? "#EF444420" : "#10B98120",
                  borderColor:
                    statusConfirmModal?.nextStatus === "suspended" ? "#EF444450" : "#10B98150",
                },
              ]}
            >
              <Ionicons
                name={
                  statusConfirmModal?.nextStatus === "suspended"
                    ? "warning-outline"
                    : "checkmark-circle-outline"
                }
                size={32}
                color={statusConfirmModal?.nextStatus === "suspended" ? "#F87171" : "#34D399"}
              />
            </View>

            <Text style={styles.confirmModalTitle}>
              {statusConfirmModal?.nextStatus === "suspended"
                ? "Suspend Cleaning Division?"
                : "Reactivate Cleaning Division?"}
            </Text>

            <Text style={styles.confirmModalSubtitle}>
              {statusConfirmModal?.nextStatus === "suspended"
                ? `Suspending "${statusConfirmModal.tenant.business_name}" will temporarily disable manager access and active service operations.`
                : `Reactivating "${statusConfirmModal?.tenant.business_name}" will restore full department operations and manager access.`}
            </Text>

            <View style={styles.confirmStatusDetailBox}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#94A3B8", fontSize: 10, fontWeight: "700" }}>DIVISION</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
                  {statusConfirmModal?.tenant.business_name}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#94A3B8", fontSize: 10, fontWeight: "700" }}>ACTION</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: statusConfirmModal?.tenant.status === "active" ? "#34D399" : "#F87171",
                    }}
                  >
                    {statusConfirmModal?.tenant.status.toUpperCase()}
                  </Text>
                  <Ionicons name="arrow-forward" size={10} color="#94A3B8" />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: statusConfirmModal?.nextStatus === "active" ? "#34D399" : "#F87171",
                    }}
                  >
                    {statusConfirmModal?.nextStatus.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 20, width: "100%" }}>
              <TouchableOpacity
                style={styles.cancelConfirmBtn}
                onPress={() => setStatusConfirmModal(null)}
                disabled={!!updatingStatusId}
              >
                <Text style={{ color: "#94A3B8", fontWeight: "700", fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitConfirmBtn,
                  {
                    backgroundColor:
                      statusConfirmModal?.nextStatus === "suspended" ? "#DC2626" : "#059669",
                  },
                  updatingStatusId === statusConfirmModal?.tenant.id && { opacity: 0.7 },
                ]}
                onPress={executeStatusToggle}
                disabled={!!updatingStatusId}
              >
                {updatingStatusId === statusConfirmModal?.tenant.id ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    {statusConfirmModal?.nextStatus === "suspended"
                      ? "Yes, Suspend"
                      : "Yes, Activate"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* -- ? DEDICATED SECTOR CREATION MODAL (FOR SECTORS TAB) -- */}
      <Modal
        visible={createSectorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateSectorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>? Create Cleaning Sector</Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  Define a new enterprise service category for Clean.et platform
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCreateSectorModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sector Title *</Text>
              <TextInput
                placeholder="e.g. Hospital & Medical Sanitization"
                placeholderTextColor="#64748B"
                value={sectorForm.title}
                onChangeText={(t) => setSectorForm({ ...sectorForm, title: t })}
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description / Subtitle</Text>
              <TextInput
                placeholder="e.g. Sterilization, Biohazard & Medical Floor Care"
                placeholderTextColor="#64748B"
                value={sectorForm.subtitle}
                onChangeText={(t) => setSectorForm({ ...sectorForm, subtitle: t })}
                style={styles.textInput}
              />
            </View>

            <Text style={styles.inputLabel}>Select Sector Icon & Color Theme *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 10, paddingVertical: 4 }}>
                {SECTOR_ICON_OPTIONS.map((item) => {
                  const isSel = sectorForm.icon === item.icon;
                  return (
                    <TouchableOpacity
                      key={item.icon}
                      onPress={() => setSectorForm({ ...sectorForm, icon: item.icon, color: item.color })}
                      style={[
                        styles.iconColorPill,
                        isSel && { borderColor: item.color, backgroundColor: `${item.color}25` },
                      ]}
                    >
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                      <Text style={[styles.iconPillLabel, isSel && { color: item.color }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setCreateSectorModalVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateSectorFromTab}>
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>Create Sector</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */
const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  headerSubtitle: { fontSize: 11, color: colors.subtext, marginTop: 1 },
  refreshBtn: { padding: 6 },
  impersonateBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  impersonateText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  exitImpersonateBtn: { backgroundColor: "#1D4ED8", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tabBarOuterContainer: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
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
  tabText: { color: colors.subtext, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#FFF" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 16, borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: "#4338CA" },
  heroLabel: { fontSize: 11, fontWeight: "800", color: "#A5B4FC", textTransform: "uppercase" },
  heroValue: { fontSize: 24, fontWeight: "900", color: "#FFF", marginTop: 4 },
  heroMiniStat: { flex: 1, backgroundColor: "rgba(255, 255, 255, 0.08)", padding: 8, borderRadius: 8 },
  heroMiniLabel: { fontSize: 9, fontWeight: "700", color: "#C7D2FE" },
  heroMiniVal: { fontSize: 14, fontWeight: "800", color: "#FFF", marginTop: 2 },
  quickActionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  quickActionText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 10 },
  divisionPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  divisionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#3B82F622",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actionBar: { flexDirection: "row", marginBottom: 12, gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, color: colors.text, marginLeft: 8, fontSize: 13 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  addBtnText: { color: "#FFF", fontWeight: "700", marginLeft: 4, fontSize: 13 },
  filterChip: { backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
  filterChipActive: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  filterChipText: { color: colors.subtext, fontSize: 11, fontWeight: "700" },
  filterChipTextActive: { color: "#FFF" },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder },
  avatarBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#3B82F622", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.text, fontWeight: "800", fontSize: 15 },
  cardSub: { color: colors.subtext, fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  managerDetailsRow: { backgroundColor: colors.background, padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: colors.cardBorder },
  cardActions: { flexDirection: "row", marginTop: 10, gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 10 },
  emptySub: { color: colors.subtext, fontSize: 12, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, maxHeight: "90%", borderWidth: 1, borderColor: colors.cardBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  detailSection: { backgroundColor: colors.background, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.cardBorder },
  detailLabel: { fontSize: 11, color: colors.subtext, fontWeight: "700", textTransform: "uppercase" },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: colors.subtext, marginBottom: 6 },
  textInput: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, borderWidth: 1, borderColor: colors.cardBorder },
  sectorOptionCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
  managerFormSection: { marginTop: 10, backgroundColor: colors.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder },
  managerSectionTitle: { fontSize: 11, fontWeight: "800", color: "#34D399", marginBottom: 10 },
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#059669", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: { flex: 1, color: "#FFF", fontSize: 13, fontWeight: "700" },
  confirmModalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderWidth: 1,
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  confirmModalSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmStatusDetailBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelConfirmBtn: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitConfirmBtn: {
    flex: 1.2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  customSectorInputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
    gap: 8,
  },
  addCustomSectorBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  showAddSectorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#3B82F688",
    gap: 6,
  },
  sectorRosterCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectorRosterIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  slugBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  slugBadgeText: {
    color: colors.subtext,
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
  },
  sectorDivisionsFooter: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconColorPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 4,
    minWidth: 90,
  },
  iconPillLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.subtext,
    textAlign: "center",
  },
  miniIconPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
});

