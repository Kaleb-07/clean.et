import React, { useEffect, useState } from "react";
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
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import API from "../../src/api/client";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

/* ================= TYPES ================= */
interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration?: number;
  category?: string;
  image?: string | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  commission: number;
  monthlyFee: number;
  staffLimit: string;
  badge: string;
  recommended?: boolean;
  activeTenantsCount?: number;
  features: string[];
  colors: [string, string];
  borderColor: string;
}

const SECTOR_CATEGORIES = [
  { id: "car-washing", name: "Car Washing & Detailing", icon: "car-sport", color: "#3B82F6" },
  { id: "building-cleaning", name: "Building & Property Clean", icon: "business", color: "#10B981" },
  { id: "laundry", name: "Commercial Laundry & Steam", icon: "shirt", color: "#F59E0B" },
  { id: "maintenance", name: "Facility Maintenance & HVAC", icon: "construct", color: "#A78BFA" },
];

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter Business",
    commission: 5.0,
    monthlyFee: 0,
    staffLimit: "Max 5 Technicians",
    badge: "5% Platform Fee",
    activeTenantsCount: 3,
    features: ["Standard Bay Wash / Clean", "Basic Invoicing & Billing", "Mobile App Access"],
    colors: ["#0F172A", "#1E293B"],
    borderColor: "#334155",
  },
  {
    id: "growth",
    name: "Growth Tier",
    commission: 8.0,
    monthlyFee: 1500,
    staffLimit: "Max 20 Technicians",
    badge: "RECOMMENDED (8% Fee)",
    recommended: true,
    activeTenantsCount: 6,
    features: ["Multi-Sector Enabled", "Automated Dispatch Queue", "Customer Fleet Accounts", "Priority Email Support"],
    colors: ["#1E1B4B", "#312E81"],
    borderColor: "#6366F1",
  },
  {
    id: "enterprise",
    name: "Enterprise Core",
    commission: 10.0,
    monthlyFee: 3500,
    staffLimit: "Unlimited Staff & Crew",
    badge: "FULL ACCESS (10% Fee)",
    activeTenantsCount: 4,
    features: ["Full Multi-Sector Schemas", "IRATA Rope Access High-Rise", "Priority API & Dedicated Account Manager", "Custom White-Label Branding"],
    colors: ["#064E3B", "#047857"],
    borderColor: "#10B981",
  },
];

type ActiveTab = "services" | "subscriptions";

/* ================= COMPONENT ================= */
export default function AdminServices() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<ActiveTab>("services");
  const [services, setServices] = useState<Service[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Services
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [inspectService, setInspectService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    category: "car-washing",
    description: "",
    price: "",
    duration: "45",
    image: "",
  });

  // Modal State for Subscription Plans
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    id: "",
    name: "",
    commission: "8.0",
    monthlyFee: "1500",
    staffLimit: "Max 20 Technicians",
    badge: "8% Fee",
    featureInput: "",
  });

  // Deletion Modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadServices();
    loadSettingsPlans();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await API.get("/services");
      setServices(res.data.data ?? []);
    } catch (e) {
      console.log("Service load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const [sectorCategories, setSectorCategories] = useState(SECTOR_CATEGORIES);

  const loadSettingsPlans = async () => {
    try {
      const res = await API.get("/super-admin/settings");
      if (res.data?.data?.subscription_plans) {
        setPlans(res.data.data.subscription_plans);
      }
      if (res.data?.data?.sector_categories && res.data.data.sector_categories.length > 0) {
        const mapped = res.data.data.sector_categories.map((c: any) => ({
          id: c.id,
          name: c.title || c.name,
          icon: c.icon || "sparkles",
          color: c.color || "#3B82F6",
        }));
        setSectorCategories(mapped);
      }
    } catch (e) {
      console.log("Settings load error:", e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadServices(), loadSettingsPlans()]);
    setRefreshing(false);
  };

  /* ─── LOCAL STORAGE IMAGE PICKER ─── */
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Media library access permission is required to pick an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
          setServiceForm((prev) => ({ ...prev, image: base64Uri }));
        } else if (asset.uri) {
          setServiceForm((prev) => ({ ...prev, image: asset.uri }));
        }
      }
    } catch (err: any) {
      Alert.alert("Image Picker Error", err?.message || "Failed to pick image from device storage.");
    }
  };

  /* ─── SAVE SERVICE (ADD / UPDATE) ─── */
  const handleSaveService = async () => {
    if (!serviceForm.name.trim()) {
      return Alert.alert("Required", "Service Name is required.");
    }

    const price = Number(serviceForm.price.trim());
    if (!Number.isFinite(price) || price < 0) {
      return Alert.alert("Error", "Please enter a valid non-negative price.");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: serviceForm.name.trim(),
        category: serviceForm.category,
        description: serviceForm.description.trim(),
        price,
        duration: parseInt(serviceForm.duration) || 45,
        image: serviceForm.image.trim() ? serviceForm.image.trim() : null,
      };

      if (editingService) {
        await API.put(`/services/${editingService.id}`, payload);
        Alert.alert("Updated", "Service catalog item updated successfully!");
      } else {
        await API.post("/services", payload);
        Alert.alert("🎉 Success", "New service item added to platform catalog!");
      }

      setServiceModalVisible(false);
      setEditingService(null);
      setServiceForm({ name: "", category: "car-washing", description: "", price: "", duration: "45", image: "" });
      loadServices();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to save service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── DELETE SERVICE ─── */
  const confirmDeleteService = async () => {
    if (!selectedDeleteId) return;

    setIsDeleting(true);
    try {
      await API.delete(`/services/${selectedDeleteId}`);
      setDeleteModal(false);
      setSelectedDeleteId(null);
      Alert.alert("Deleted", "Service item removed from catalog.");
      loadServices();
    } catch (e: any) {
      Alert.alert("Delete Error", e?.response?.data?.message || "Failed to delete service.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditService = (item: Service) => {
    setEditingService(item);
    setServiceForm({
      name: item.name,
      category: item.category || "car-washing",
      description: item.description,
      price: String(item.price),
      duration: String(item.duration || 45),
      image: item.image || "",
    });
    setServiceModalVisible(true);
  };

  /* ─── SUBSCRIPTION PLAN TIERS (PERSISTENT SETTINGS) ─── */
  const openEditPlan = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        id: plan.id,
        name: plan.name,
        commission: String(plan.commission),
        monthlyFee: String(plan.monthlyFee),
        staffLimit: plan.staffLimit,
        badge: plan.badge || `${plan.commission}% Fee`,
        featureInput: plan.features.join("\n"),
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        id: `custom_${Date.now()}`,
        name: "",
        commission: "12.0",
        monthlyFee: "4500",
        staffLimit: "Unlimited Staff",
        badge: "VIP CUSTOM TIER",
        featureInput: "Custom White-Label App\nDedicated Priority Dispatch",
      });
    }
    setPlanModalVisible(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name.trim()) {
      return Alert.alert("Required", "Plan Name is required.");
    }

    setIsSavingPlan(true);
    try {
      let updatedPlans: SubscriptionPlan[];

      if (editingPlan) {
        updatedPlans = plans.map((p) => {
          if (p.id === editingPlan.id) {
            return {
              ...p,
              name: planForm.name.trim(),
              commission: parseFloat(planForm.commission) || p.commission,
              monthlyFee: parseFloat(planForm.monthlyFee) || p.monthlyFee,
              staffLimit: planForm.staffLimit.trim(),
              badge: planForm.badge.trim(),
              features: planForm.featureInput
                .split("\n")
                .map((f) => f.trim())
                .filter((f) => f.length > 0),
            };
          }
          return p;
        });
      } else {
        const newPlan: SubscriptionPlan = {
          id: planForm.id || `plan_${Date.now()}`,
          name: planForm.name.trim(),
          commission: parseFloat(planForm.commission) || 10,
          monthlyFee: parseFloat(planForm.monthlyFee) || 2500,
          staffLimit: planForm.staffLimit.trim(),
          badge: planForm.badge.trim() || "CUSTOM TIER",
          activeTenantsCount: 0,
          features: planForm.featureInput
            .split("\n")
            .map((f) => f.trim())
            .filter((f) => f.length > 0),
          colors: ["#311B92", "#4A148C"],
          borderColor: "#8E24AA",
        };
        updatedPlans = [...plans, newPlan];
      }

      setPlans(updatedPlans);

      // Persist to Super Admin Settings
      await API.put("/super-admin/settings", {
        subscription_plans: updatedPlans,
      });

      setPlanModalVisible(false);
      setEditingPlan(null);
      Alert.alert("🎉 Saved", `Subscription plan "${planForm.name}" configuration saved and published!`);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to persist plan settings.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    const name = s.name.toLowerCase();
    const desc = (s.description || "").toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const tenantCategories = user?.tenant?.categories_enabled || ["car-washing"];
  const availableSectors = isSuperAdmin
    ? sectorCategories
    : sectorCategories.filter((cat) => tenantCategories.includes(cat.id));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── HEADER ── */}
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
          <Text style={styles.headerTitle}>
            {isSuperAdmin ? "Services & Subscriptions Setup" : "Company Service Catalog"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? "Platform Multi-Sector Catalogs & Subscription Tier Setup"
              : "Post & Manage Services Visible to Client Mobile App"}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      {/* ── NAVIGATION TABS (SUPER ADMIN ONLY) ── */}
      {isSuperAdmin && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "services" && styles.activeTabItem]}
            onPress={() => setActiveTab("services")}
          >
            <Ionicons
              name="cut-outline"
              size={18}
              color={activeTab === "services" ? "#60A5FA" : "#9CA3AF"}
            />
            <Text style={[styles.tabText, activeTab === "services" && styles.activeTabText]}>
              Service Catalog ({services.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "subscriptions" && styles.activeTabItem]}
            onPress={() => setActiveTab("subscriptions")}
          >
            <Ionicons
              name="card-outline"
              size={18}
              color={activeTab === "subscriptions" ? "#60A5FA" : "#9CA3AF"}
            />
            <Text style={[styles.tabText, activeTab === "subscriptions" && styles.activeTabText]}>
              Subscription Plans ({plans.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* ── TAB 1: SERVICE CATALOG MANAGEMENT ── */}
        {activeTab === "services" && (
          <Animated.View entering={FadeInDown}>
            {/* Hero Metrics Bar */}
            <LinearGradient colors={["#1E1B4B", "#312E81"]} style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLabel}>Platform Multi-Sector Service Catalog</Text>
                  <Text style={styles.heroValue}>{services.length} Registered Services</Text>
                </View>
                <View style={styles.heroIconBox}>
                  <Ionicons name="cut" size={24} color="#60A5FA" />
                </View>
              </View>

              <View style={styles.heroSubRow}>
                <View style={styles.subStatPill}>
                  <Text style={styles.subStatLabel}>Sectors Covered:</Text>
                  <Text style={styles.subStatValue}>Car Wash, Windows, Laundry, HVAC</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Search & Action Bar */}
            <View style={styles.actionBar}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search service by name or description..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  setEditingService(null);
                  setServiceForm({ name: "", category: "car-washing", description: "", price: "", duration: "45", image: "" });
                  setServiceModalVisible(true);
                }}
              >
                <Ionicons name="add-circle" size={18} color="#FFF" />
                <Text style={styles.addBtnText}>+ Add Service</Text>
              </TouchableOpacity>
            </View>

            {/* Services List */}
            {loading && services.length === 0 ? (
              <ActivityIndicator color="#3B82F6" size="large" style={{ marginTop: 40 }} />
            ) : filteredServices.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cut-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>No Services Found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery ? "Try refining your search term." : 'Tap "+ Add Service" to add a new service template.'}
                </Text>
              </View>
            ) : (
              filteredServices.map((s, index) => {
                const categoryObj = sectorCategories.find((c) => c.id === s.category) || sectorCategories[0];

                return (
                  <Animated.View key={s.id} entering={FadeInDown.delay(index * 40)}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setInspectService(s)}
                      style={styles.card}
                    >
                      <View style={styles.cardHeader}>
                        {s.image ? (
                          <Image source={{ uri: s.image }} style={styles.serviceImageThumbnail} />
                        ) : (
                          <View style={[styles.avatarBox, { backgroundColor: `${categoryObj.color}22`, borderColor: `${categoryObj.color}55` }]}>
                            <Ionicons name={categoryObj.icon as any} size={20} color={categoryObj.color} />
                          </View>
                        )}

                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.serviceName}>{s.name}</Text>
                            <View style={[styles.sectorBadge, { backgroundColor: `${categoryObj.color}22` }]}>
                              <Text style={[styles.sectorBadgeText, { color: categoryObj.color }]}>{categoryObj.name}</Text>
                            </View>
                          </View>

                          <Text style={styles.serviceDesc} numberOfLines={2}>
                            {s.description || "No description provided."}
                          </Text>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.servicePrice}>
                            ETB {Number(s.price).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                          </Text>
                          <Text style={styles.serviceDuration}>
                            ⏱️ {s.duration || 45} mins
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.miniActionBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F655" }]}
                          onPress={() => setInspectService(s)}
                        >
                          <Ionicons name="eye-outline" size={14} color="#60A5FA" />
                          <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                            Inspect
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.miniActionBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}
                          onPress={() => openEditService(s)}
                        >
                          <Ionicons name="create-outline" size={14} color="#FBBF24" />
                          <Text style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                            Edit
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.miniActionBtn, { backgroundColor: "#EF444422", borderColor: "#EF444455" }]}
                          onPress={() => {
                            setSelectedDeleteId(s.id);
                            setDeleteModal(true);
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#F87171" />
                          <Text style={{ color: "#F87171", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            )}
          </Animated.View>
        )}

        {/* ── TAB 2: SUBSCRIPTION PLAN TIER SETUP ── */}
        {activeTab === "subscriptions" && (
          <Animated.View entering={FadeInDown}>
            <LinearGradient colors={["#1E1B4B", "#312E81"]} style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLabel}>Tenant Subscription Tiers & Commission Setup</Text>
                  <Text style={styles.heroValue}>{plans.length} Subscription Plans</Text>
                </View>
                <TouchableOpacity
                  style={styles.addPlanBtn}
                  onPress={() => openEditPlan(undefined)}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 12, marginLeft: 4 }}>
                    + New Tier
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.heroSubRow}>
                <View style={styles.subStatPill}>
                  <Text style={styles.subStatLabel}>Platform Commission Settings:</Text>
                  <Text style={styles.subStatValue}>Persistent Multi-Tier Setup</Text>
                </View>
              </View>
            </LinearGradient>

            {plans.map((plan) => (
              <View key={plan.id} style={[styles.planCard, { borderColor: plan.borderColor }]}>
                <LinearGradient colors={plan.colors} style={styles.planGradient}>
                  <View style={styles.planHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.planTitle}>{plan.name}</Text>
                        {plan.recommended && (
                          <View style={styles.recommendedTag}>
                            <Text style={styles.recommendedTagText}>POPULAR</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.planMeta}>
                        {plan.commission}% Commission Fee · {plan.staffLimit}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.editPlanBtn}
                      onPress={() => openEditPlan(plan)}
                    >
                      <Ionicons name="create-outline" size={14} color="#FBBF24" />
                      <Text style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                        Configure Tier
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.planPriceBox}>
                    <Text style={styles.planPriceText}>
                      ETB {Number(plan.monthlyFee).toLocaleString()} <Text style={{ fontSize: 12, fontWeight: "400", color: "#94A3B8" }}>/ month</Text>
                    </Text>
                    <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                      🏢 {plan.activeTenantsCount || 2} Active Companies Subscribed
                    </Text>
                  </View>

                  <View style={styles.planFeaturesList}>
                    {plan.features.map((feat, idx) => (
                      <View key={idx} style={styles.planFeatureItem}>
                        <Ionicons name="checkmark-circle" size={14} color="#34D399" />
                        <Text style={styles.planFeatureText}>{feat}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* ── 👁️ INSPECT SERVICE MODAL ── */}
      <Modal visible={!!inspectService} transparent animationType="fade" onRequestClose={() => setInspectService(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{inspectService?.name}</Text>
                <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Service ID #{inspectService?.id}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectService(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {inspectService?.image && (
                <Image source={{ uri: inspectService.image }} style={styles.serviceImagePreview} />
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Base Pricing Total</Text>
                <Text style={styles.detailAmount}>
                  ETB {Number(inspectService?.price ?? 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Estimated Servicing Duration</Text>
                <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "700" }}>
                  ⏱️ {inspectService?.duration || 45} Minutes
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Service Description</Text>
                <Text style={{ color: "#CBD5E1", fontSize: 13, lineHeight: 18 }}>
                  {inspectService?.description || "No description provided."}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setInspectService(null)}>
              <Text style={styles.closeBtnText}>Close Inspection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── ✏️ ADD / EDIT SERVICE MODAL WITH DEVICE IMAGE PICKER ── */}
      <Modal visible={serviceModalVisible} transparent animationType="slide" onRequestClose={() => setServiceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingService ? "Edit Service Item" : "Add Service Item"}</Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  Configure catalog item pricing, local cover image, duration, and sector category
                </Text>
              </View>
              <TouchableOpacity onPress={() => setServiceModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Service Item Name *</Text>
                <TextInput
                  placeholder="e.g. Premium Exterior Foam Wash / Glass Window Clean"
                  placeholderTextColor="#64748B"
                  value={serviceForm.name}
                  onChangeText={(t) => setServiceForm({ ...serviceForm, name: t })}
                  style={styles.textInput}
                />
              </View>

              {/* Sector Category Selector Cards (Only shown if Super Admin or multi-sector tenant) */}
              {(!isSuperAdmin && availableSectors.length <= 1) ? (
                // Single Sector Tenant: Auto-assigned badge, no redundant selection needed!
                <View style={{ marginBottom: 14, backgroundColor: "#0F172A", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#334155" }}>
                  <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700" }}>COMPANY BUSINESS SECTOR</Text>
                  <Text style={{ color: "#34D399", fontSize: 14, fontWeight: "800", marginTop: 2 }}>
                    🏢 {availableSectors[0]?.name || "Car Washing & Detailing"}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Select Authorized Service Sector *</Text>
                  <View style={{ gap: 8, marginBottom: 14 }}>
                    {availableSectors.map((cat) => {
                      const isSel = serviceForm.category === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setServiceForm({ ...serviceForm, category: cat.id })}
                          style={[
                            styles.sectorCategoryOption,
                            isSel && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                          ]}
                        >
                          <Ionicons name={cat.icon as any} size={20} color={cat.color} style={{ marginRight: 8 }} />
                          <Text style={{ color: "#FFF", fontSize: 13, flex: 1, fontWeight: "700" }}>{cat.name}</Text>
                          <Ionicons
                            name={isSel ? "radio-button-on" : "radio-button-off"}
                            size={20}
                            color={isSel ? cat.color : "#64748B"}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* ── LOCAL STORAGE DEVICE IMAGE PICKER ── */}
              <Text style={styles.inputLabel}>Service Cover Image (Device Storage / Gallery)</Text>
              {serviceForm.image ? (
                <View style={styles.imagePickerPreviewBox}>
                  <Image source={{ uri: serviceForm.image }} style={styles.imagePickerPreview} />
                  <View style={styles.imagePickerOverlayRow}>
                    <TouchableOpacity style={styles.changeImageBtn} onPress={handlePickImage}>
                      <Ionicons name="camera-outline" size={14} color="#FFF" />
                      <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                        Change Image
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setServiceForm({ ...serviceForm, image: "" })}
                    >
                      <Ionicons name="trash-outline" size={14} color="#F87171" />
                      <Text style={{ color: "#F87171", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
                  <View style={styles.imagePickerIconWrap}>
                    <Ionicons name="cloud-upload-outline" size={24} color="#60A5FA" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}>
                      📷 Select Photo from Device Storage
                    </Text>
                    <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                      Pick image file from computer / mobile photo gallery
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Or Enter Image URL Manually (Optional)</Text>
                <TextInput
                  placeholder="https://images.unsplash.com/photo-..."
                  placeholderTextColor="#64748B"
                  value={serviceForm.image}
                  onChangeText={(t) => setServiceForm({ ...serviceForm, image: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Base Price (ETB) *</Text>
                <TextInput
                  placeholder="e.g. 450.00"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={serviceForm.price}
                  onChangeText={(t) => setServiceForm({ ...serviceForm, price: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Estimated Duration (Minutes)</Text>
                <TextInput
                  placeholder="e.g. 45"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={serviceForm.duration}
                  onChangeText={(t) => setServiceForm({ ...serviceForm, duration: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  placeholder="Detailed breakdown of work involved..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                  value={serviceForm.description}
                  onChangeText={(t) => setServiceForm({ ...serviceForm, description: t })}
                  style={[styles.textInput, { height: 75, textAlignVertical: "top" }]}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setServiceModalVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSaveService}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    {editingService ? "Save Updates" : "Add Service"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 💳 CONFIGURE SUBSCRIPTION TIER MODAL ── */}
      <Modal visible={planModalVisible} transparent animationType="slide" onRequestClose={() => setPlanModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingPlan ? "Configure Subscription Tier" : "Create New Subscription Tier"}
                </Text>
                <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  {planForm.name || "New Subscription Plan"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPlanModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tier Display Name *</Text>
                <TextInput
                  placeholder="e.g. Growth Tier / VIP Core"
                  placeholderTextColor="#64748B"
                  value={planForm.name}
                  onChangeText={(t) => setPlanForm({ ...planForm, name: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Platform Commission Rate (%) *</Text>
                <TextInput
                  placeholder="e.g. 8.0"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={planForm.commission}
                  onChangeText={(t) => setPlanForm({ ...planForm, commission: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Base Monthly Subscription Fee (ETB) *</Text>
                <TextInput
                  placeholder="e.g. 1500"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={planForm.monthlyFee}
                  onChangeText={(t) => setPlanForm({ ...planForm, monthlyFee: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Staff Roster Limit</Text>
                <TextInput
                  placeholder="e.g. Max 20 Technicians"
                  placeholderTextColor="#64748B"
                  value={planForm.staffLimit}
                  onChangeText={(t) => setPlanForm({ ...planForm, staffLimit: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Badge Tag Text</Text>
                <TextInput
                  placeholder="e.g. POPULAR (8% Fee)"
                  placeholderTextColor="#64748B"
                  value={planForm.badge}
                  onChangeText={(t) => setPlanForm({ ...planForm, badge: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Features List (One feature per line)</Text>
                <TextInput
                  placeholder="Multi-Sector Enabled&#10;Automated Dispatch Queue&#10;Customer Fleet Accounts"
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={4}
                  value={planForm.featureInput}
                  onChangeText={(t) => setPlanForm({ ...planForm, featureInput: t })}
                  style={[styles.textInput, { height: 90, textAlignVertical: "top" }]}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setPlanModalVisible(false)} disabled={isSavingPlan}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSavePlan} disabled={isSavingPlan}>
                {isSavingPlan ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>Publish Tier Setup</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 🗑️ DELETE CONFIRMATION MODAL ── */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: "#EF4444" }]}>
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <Ionicons name="warning-outline" size={36} color="#EF4444" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFF", textAlign: "center" }}>
                Delete Service Item?
              </Text>
              <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                This will permanently erase this service item from the platform catalog.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDeleteModal(false)} disabled={isDeleting}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteModalBtn} onPress={confirmDeleteService} disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: "800" }}>🗑️ Yes, Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#F8FAFC" },
  headerSubtitle: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  refreshBtn: { padding: 6 },
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
  activeTabItem: { backgroundColor: "#334155" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#9CA3AF", marginLeft: 6 },
  activeTabText: { color: "#60A5FA" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 18, borderRadius: 16, marginBottom: 16 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { fontSize: 12, color: "#DBEAFE", fontWeight: "500" },
  heroValue: { fontSize: 24, fontWeight: "800", color: "#FFF", marginTop: 4 },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(96, 165, 250, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.3)",
  },
  addPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  heroSubRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  subStatPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subStatLabel: { fontSize: 11, color: "#CBD5E1", marginRight: 4 },
  subStatValue: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  actionBar: { flexDirection: "row", marginBottom: 16, gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchInput: { flex: 1, color: "#F8FAFC", marginLeft: 8, fontSize: 13 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  addBtnText: { color: "#FFF", fontWeight: "700", marginLeft: 4, fontSize: 13 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#3B82F622",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#3B82F655",
  },
  serviceImageThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#0F172A",
  },
  serviceImagePreview: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectorBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  serviceName: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  serviceDesc: { color: "#CBD5E1", fontSize: 12, marginTop: 2, lineHeight: 16 },
  servicePrice: { color: "#34D399", fontWeight: "800", fontSize: 16 },
  serviceDuration: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  cardActions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    gap: 8,
  },
  miniActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  planCard: { borderRadius: 16, borderWidth: 1.5, marginBottom: 14, overflow: "hidden" },
  planGradient: { padding: 16 },
  planHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  planTitle: { fontSize: 18, fontWeight: "800", color: "#FFF" },
  recommendedTag: { backgroundColor: "#F59E0B", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  recommendedTagText: { color: "#000", fontSize: 9, fontWeight: "800" },
  planMeta: { fontSize: 12, color: "#CBD5E1", marginTop: 2 },
  editPlanBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(245, 158, 11, 0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: "rgba(245, 158, 11, 0.4)" },
  planPriceBox: { marginTop: 10, paddingVertical: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" },
  planPriceText: { fontSize: 22, fontWeight: "800", color: "#34D399" },
  planFeaturesList: { marginTop: 10 },
  planFeatureItem: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  planFeatureText: { fontSize: 12, color: "#E2E8F0", marginLeft: 6 },
  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#F8FAFC", marginTop: 10 },
  emptySub: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 20, maxHeight: "90%", borderWidth: 1, borderColor: "#334155" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#F8FAFC" },
  detailSection: { backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  detailLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase" },
  detailAmount: { fontSize: 22, fontWeight: "800", color: "#34D399", marginTop: 2 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#CBD5E1", marginBottom: 6 },
  textInput: { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155" },
  sectorCategoryOption: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#334155" },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#3B82F655",
    borderStyle: "dashed",
  },
  imagePickerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#3B82F622",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerPreviewBox: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  imagePickerPreview: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
  },
  imagePickerOverlayRow: {
    flexDirection: "row",
    gap: 8,
  },
  changeImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF444422",
    borderColor: "#EF444455",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  deleteModalBtn: { flex: 1, backgroundColor: "#EF4444", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
});
