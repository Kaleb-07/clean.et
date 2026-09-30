import React, { useEffect, useState, useMemo } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import API from "../../src/api/client";
import { useAuth } from "../../contexts/AuthContext";
import { useColors } from "../../hooks/useColors";
import { useLanguage } from "../../contexts/LanguageContext";

/* ================= TYPES ================= */
interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string;
  bookings_count?: number;
}

interface StaffMember {
  id: number;
  tenant_id?: number;
  role_title: string;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  qualifications?: string[];
  availability_status?: string;
}

interface SectorOption {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  color?: string;
}

const DEFAULT_SECTOR_OPTIONS: SectorOption[] = [
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

const SECTOR_SPECIALIZATIONS_MAP: Record<string, { id: string; label: string }[]> = {
  "car-washing": [
    { id: "car-washing", label: "Car Washing & Auto Detailing" },
    { id: "corporate-fleet", label: "🚛 Corporate Fleet Wash Specialist" },
    { id: "mobile-doorstep", label: "🏠 Mobile Doorstep Rig Operator" },
    { id: "valet-pickup", label: "🚗 Valet Pickup & Return Specialist" },
    { id: "bay-wash", label: "🧼 Standard Station Bay Technician" },
  ],
  "building-cleaning": [
    { id: "building-cleaning", label: "High-Rise Window & Glass Sanitation" },
    { id: "exterior-facade", label: "🏙️ IRATA Certified Rope Access Specialist" },
    { id: "interior-deep", label: "🧹 Interior Building Deep Sanitizer" },
    { id: "maintenance", label: "Facility Maintenance & HVAC Sanitizing" },
  ],
  "commercial-laundry": [
    { id: "commercial-laundry", label: "Commercial Fabric & Linen Care" },
    { id: "dry-cleaning", label: "👔 Garment Dry Cleaning & Pressing Specialist" },
    { id: "industrial-textile", label: "🧺 Industrial Textile Sanitization" },
  ],
  "solar-panel-cleaning": [
    { id: "solar-panel-cleaning", label: "Solar Panel & Renewable Maintenance" },
    { id: "photovoltaic-wash", label: "☀️ Photovoltaic Surface Cleaning Specialist" },
    { id: "inverter-safety", label: "⚡ Solar Inverter & Electrical Safety Certified" },
  ],
};

const SECTOR_QUALIFICATIONS = [
  { id: "car-washing", label: "Car Washing & Auto Detailing" },
  { id: "corporate-fleet", label: "🚛 Corporate Fleet Wash Specialist" },
  { id: "mobile-doorstep", label: "🏠 Mobile Doorstep Rig Operator" },
  { id: "valet-pickup", label: "🚗 Valet Pickup & Return Specialist" },
  { id: "bay-wash", label: "🧼 Standard Station Bay Technician" },
  { id: "building-cleaning", label: "High-Rise Window & Glass Sanitation" },
  { id: "exterior-facade", label: "🏙️ IRATA Certified Rope Access Specialist" },
  { id: "interior-deep", label: "🧹 Interior Building Deep Sanitizer" },
  { id: "laundry", label: "Commercial Fabric & Linen Care" },
  { id: "maintenance", label: "Facility Maintenance & HVAC Sanitizing" },
];

/* ================= COMPONENT ================= */
export default function AdminTechniciansAndCustomers() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colors = useColors();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const isSuperAdmin = user?.role === "super_admin";

  const [activeTab, setActiveTab] = useState<"technicians" | "customers">(
    isSuperAdmin ? "technicians" : "customers"
  );

  useEffect(() => {
    if (!isSuperAdmin) {
      setActiveTab("customers");
    }
  }, [isSuperAdmin]);

  // Customers State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerBookingsMap, setCustomerBookingsMap] = useState<Record<number, any[]>>({});

  // Staff / Technicians State
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffBookingsMap, setStaffBookingsMap] = useState<
    Record<number, { completedCount: number; totalRevenue: number }>
  >({});
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("ALL");

  // Dynamic Sectors State (Created from Super Admin & System Defaults)
  const [sectorOptions, setSectorOptions] = useState<SectorOption[]>(DEFAULT_SECTOR_OPTIONS);
  const [selectedSectorId, setSelectedSectorId] = useState<string>("car-washing");
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Customer Modals State
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [inspectCustomer, setInspectCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  // Technician Modals State (identical to sector admin technician creation)
  const [techModalVisible, setTechModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [techForm, setTechForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role_title: "Lead Technician",
    qualifications: ["car-washing"],
  });

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "staff" | "customer"; id: number; name: string } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<{ message: string; type: "success" | "danger" } | null>(null);

  const triggerNotification = (message: string, type: "success" | "danger" = "success") => {
    setNotification({ message, type });
    Alert.alert(type === "success" ? "Success" : "Notification", message);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  /* ================= LOAD ALL DATA ================= */
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cRes, stRes, bRes, tRes, secStored] = await Promise.allSettled([
        API.get("/customers"),
        API.get("/staff"),
        API.get("/bookings"),
        API.get("/tenants"),
        AsyncStorage.getItem("@clean_et_custom_sectors"),
      ]);

      const cData =
        cRes.status === "fulfilled"
          ? Array.isArray(cRes.value.data)
            ? cRes.value.data
            : cRes.value.data?.data ?? []
          : [];
      const stData =
        stRes.status === "fulfilled"
          ? Array.isArray(stRes.value.data)
            ? stRes.value.data
            : stRes.value.data?.data ?? []
          : [];
      const bData =
        bRes.status === "fulfilled"
          ? Array.isArray(bRes.value.data)
            ? bRes.value.data
            : bRes.value.data?.data ?? []
          : [];
      const tData: any[] =
        tRes.status === "fulfilled"
          ? Array.isArray(tRes.value.data)
            ? tRes.value.data
            : tRes.value.data?.data ?? []
          : [];

      let parsedSec: SectorOption[] = [];
      if (secStored.status === "fulfilled" && secStored.value) {
        try {
          parsedSec = JSON.parse(secStored.value);
        } catch {}
      }

      const combinedMap = new Map<string, SectorOption>();
      DEFAULT_SECTOR_OPTIONS.forEach((s) => combinedMap.set(s.id, s));
      if (Array.isArray(parsedSec)) {
        parsedSec.forEach((s) => {
          if (s && s.id) combinedMap.set(s.id, s);
        });
      }
      if (Array.isArray(tData)) {
        tData.forEach((tenant: any) => {
          (tenant.categories_enabled || []).forEach((catSlug: string) => {
            if (!combinedMap.has(catSlug)) {
              combinedMap.set(catSlug, {
                id: catSlug,
                title: catSlug
                  .split("-")
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" "),
                subtitle: tenant.business_name || "Enterprise Division Sector",
                icon: "sparkles",
                color: "#6366F1",
              });
            }
          });
        });
      }

      const mergedSectors = Array.from(combinedMap.values());
      setSectorOptions(mergedSectors);
      setTenants(tData);

      if (user?.tenant?.categories_enabled && user.tenant.categories_enabled.length > 0) {
        setSelectedSectorId(user.tenant.categories_enabled[0]);
      } else if (mergedSectors.length > 0) {
        setSelectedSectorId((prev) => (prev ? prev : mergedSectors[0].id));
      }

      // Customer bookings map
      const cMap: Record<number, any[]> = {};
      // Staff bookings map
      const sMap: Record<number, { completedCount: number; totalRevenue: number }> = {};

      bData.forEach((b: any) => {
        const cid = b.customer?.id || b.customer_id;
        if (cid) {
          if (!cMap[cid]) cMap[cid] = [];
          cMap[cid].push(b);
        }

        const stId = b.staff?.id || b.staff_id;
        if (stId) {
          if (!sMap[stId]) sMap[stId] = { completedCount: 0, totalRevenue: 0 };
          if (b.status === "completed") {
            sMap[stId].completedCount += 1;
            sMap[stId].totalRevenue += Number(b.price || b.service?.price || 0);
          }
        }
      });

      setCustomerBookingsMap(cMap);
      setStaffBookingsMap(sMap);
      setCustomers(cData);
      setStaff(stData);
    } catch (e) {
      console.log("Error loading directory data:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  /* ================= ACTIVE SECTOR & QUALIFICATIONS ================= */
  const availableQualifications = useMemo(() => {
    const specs = SECTOR_SPECIALIZATIONS_MAP[selectedSectorId];
    if (specs && specs.length > 0) {
      return specs;
    }
    const custom = sectorOptions.find((cs) => cs.id === selectedSectorId);
    const label = custom ? custom.title : selectedSectorId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return [{ id: selectedSectorId, label }];
  }, [selectedSectorId, sectorOptions]);

  const handleSelectSector = (sectorId: string) => {
    setSelectedSectorId(sectorId);
    const specs = SECTOR_SPECIALIZATIONS_MAP[sectorId] || [];
    const firstQual = specs[0]?.id || sectorId;
    setTechForm((prev) => ({
      ...prev,
      qualifications: [firstQual],
    }));
  };

  const openAddTechModal = () => {
    const defaultSectorId =
      (user?.tenant?.categories_enabled && user.tenant.categories_enabled[0]) ||
      sectorOptions[0]?.id ||
      "car-washing";
    setSelectedSectorId(defaultSectorId);
    setSectorDropdownOpen(false);
    const specs = SECTOR_SPECIALIZATIONS_MAP[defaultSectorId] || [];
    const firstQual = specs[0]?.id || defaultSectorId;

    setEditingStaff(null);
    setTechForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      role_title: "Lead Technician",
      qualifications: [firstQual],
    });
    setTechModalVisible(true);
  };

  /* ================= TECHNICIAN HANDLERS ================= */
  const toggleQualification = (id: string) => {
    if (techForm.qualifications.includes(id)) {
      if (techForm.qualifications.length > 1) {
        setTechForm({ ...techForm, qualifications: techForm.qualifications.filter((q) => q !== id) });
      }
    } else {
      setTechForm({ ...techForm, qualifications: [...techForm.qualifications, id] });
    }
  };

  const handleSaveTechnician = async () => {
    const trimmedName = techForm.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      triggerNotification("Technician Full Name is required (minimum 2 characters).", "danger");
      return;
    }

    if (!techForm.role_title.trim() || techForm.role_title.trim().length < 2) {
      triggerNotification("Role Title / Designation is required.", "danger");
      return;
    }

    if (techForm.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(techForm.email.trim())) {
        triggerNotification("Please enter a valid email address.", "danger");
        return;
      }
    }

    if (techForm.phone.trim()) {
      const cleanPhone = techForm.phone.trim().replace(/[^0-9+]/g, "");
      if (cleanPhone.length < 6) {
        triggerNotification("Phone number must contain at least 6 digits.", "danger");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        await API.put(`/staff/${editingStaff.id}`, {
          name: techForm.name.trim(),
          email: techForm.email ? techForm.email.trim().toLowerCase() : undefined,
          phone: techForm.phone ? techForm.phone.trim() : undefined,
          role_title: techForm.role_title.trim(),
          qualifications: techForm.qualifications,
        });
        triggerNotification(`✨ Technician "${techForm.name.trim()}" profile updated!`, "success");
      } else {
        const matchedTenant = tenants.find((t: any) => t.categories_enabled?.includes(selectedSectorId)) || tenants[0];
        await API.post("/staff", {
          name: techForm.name.trim(),
          email: techForm.email ? techForm.email.trim().toLowerCase() : undefined,
          phone: techForm.phone ? techForm.phone.trim() : undefined,
          password: techForm.password ? techForm.password.trim() : "password123",
          role_title: techForm.role_title.trim(),
          qualifications: techForm.qualifications,
          tenant_id: matchedTenant?.id || user?.tenant?.id,
        });
        triggerNotification(`🎉 Technician "${techForm.name.trim()}" registered to roster!`, "success");
      }

      setTechModalVisible(false);
      setEditingStaff(null);
      setTechForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        role_title: "Lead Technician",
        qualifications: [availableQualifications[0]?.id || "car-washing"],
      });
      loadAllData();
    } catch (e: any) {
      const errorMsg = e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join("\n")
        : e?.response?.data?.message || "Failed to save technician.";
      triggerNotification(`Error: ${errorMsg}`, "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (staffId: number, currentStatus?: string) => {
    const nextStatusMap: Record<string, string> = {
      available: "on_job",
      on_job: "off_duty",
      off_duty: "available",
    };
    const nextStatus = nextStatusMap[currentStatus || "available"] || "available";

    try {
      await API.patch(`/staff/${staffId}/availability`, { availability_status: nextStatus });
      triggerNotification(`⚡ Crew availability set to ${nextStatus.replace("_", " ").toUpperCase()}!`, "success");
      loadAllData();
    } catch (e: any) {
      triggerNotification("Failed to update availability status.", "danger");
    }
  };

  /* ================= CUSTOMER HANDLERS ================= */
  const handleSaveCustomer = async () => {
    const trimmedName = customerForm.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      triggerNotification("Client Full Name is required (minimum 2 characters).", "danger");
      return;
    }

    if (customerForm.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerForm.email.trim())) {
        triggerNotification("Please enter a valid email address.", "danger");
        return;
      }
    }

    if (customerForm.phone.trim()) {
      const cleanPhone = customerForm.phone.trim().replace(/[^0-9+]/g, "");
      if (cleanPhone.length < 6) {
        triggerNotification("Phone number must contain at least 6 digits.", "danger");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await API.put(`/customers/${editingCustomer.id}`, {
          name: customerForm.name.trim(),
          email: customerForm.email ? customerForm.email.trim().toLowerCase() : undefined,
          phone: customerForm.phone ? customerForm.phone.trim() : undefined,
        });
        triggerNotification(`✨ Client profile "${customerForm.name.trim()}" updated successfully!`, "success");
      } else {
        await API.post("/customers", {
          name: customerForm.name.trim(),
          email: customerForm.email ? customerForm.email.trim().toLowerCase() : undefined,
          phone: customerForm.phone ? customerForm.phone.trim() : undefined,
          password: customerForm.password ? customerForm.password.trim() : "password123",
        });
        triggerNotification(`🎉 Client account "${customerForm.name.trim()}" created successfully!`, "success");
      }

      setCustomerModalVisible(false);
      setEditingCustomer(null);
      setCustomerForm({ name: "", email: "", phone: "", password: "" });
      loadAllData();
    } catch (e: any) {
      const errorMsg = e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join("\n")
        : e?.response?.data?.message || "Failed to save client.";
      triggerNotification(`Error: ${errorMsg}`, "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================= DELETE HANDLER ================= */
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === "staff") {
        await API.delete(`/staff/${deleteTarget.id}`);
        triggerNotification("🗑️ Technician removed from company roster.", "danger");
      } else {
        await API.delete(`/customers/${deleteTarget.id}`);
        triggerNotification("🗑️ Client account removed from directory.", "danger");
      }
      setDeleteModal(false);
      setDeleteTarget(null);
      loadAllData();
    } catch (e: any) {
      triggerNotification(`Delete Error: ${e?.response?.data?.message || "Failed to delete item."}`, "danger");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ================= FILTERING ================= */
  const filteredStaff = staff.filter((s) => {
    const q = searchQuery.toLowerCase();
    const name = (s.user?.name || "").toLowerCase();
    const role = (s.role_title || "").toLowerCase();
    const email = (s.user?.email || "").toLowerCase();
    const phone = (s.user?.phone || "").toLowerCase();

    const matchesSearch = name.includes(q) || role.includes(q) || email.includes(q) || phone.includes(q);
    const matchesFilter =
      availabilityFilter === "ALL" || (s.availability_status || "available") === availabilityFilter;

    return matchesSearch && matchesFilter;
  });

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const name = (c.name || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    const phone = (c.phone || "").toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q);
  });

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
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isSuperAdmin ? "Technicians & Customers" : "Customer Directory"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? `${staff.length} Field Technicians • ${customers.length} Client Accounts`
              : `${customers.length} Registered Client Accounts`}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadAllData}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      {/* ── 🔔 ACTION NOTIFICATION TOAST BANNER ── */}
      {notification && (
        <Animated.View
          entering={FadeInDown}
          style={[styles.toastBanner, notification.type === "danger" ? styles.toastBannerDanger : styles.toastBannerSuccess]}
        >
          <Ionicons
            name={notification.type === "danger" ? "alert-circle" : "checkmark-circle"}
            size={20}
            color="#FFF"
          />
          <Text style={styles.toastText}>{notification.message}</Text>
          <TouchableOpacity onPress={() => setNotification(null)}>
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── TOP TAB SWITCHER (TECHNICIANS VS CUSTOMERS - SUPER ADMIN ONLY) ── */}
      {isSuperAdmin && (
        <View style={styles.tabSwitcherOuter}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "technicians" && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab("technicians");
              setSearchQuery("");
            }}
          >
            <Ionicons
              name="construct"
              size={16}
              color={activeTab === "technicians" ? "#FFF" : "#94A3B8"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabButtonText, activeTab === "technicians" && styles.tabButtonTextActive]}>
              Technicians ({staff.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "customers" && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab("customers");
              setSearchQuery("");
            }}
          >
            <Ionicons
              name="people"
              size={16}
              color={activeTab === "customers" ? "#FFF" : "#94A3B8"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabButtonText, activeTab === "customers" && styles.tabButtonTextActive]}>
              Customers ({customers.length})
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
        {/* ── HERO METRICS BAR ── */}
        <LinearGradient
          colors={activeTab === "technicians" ? ["#1E1B4B", "#312E81"] : ["#064E3B", "#047857"]}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>
                {activeTab === "technicians"
                  ? "FIELD CREW ROSTER & CERTIFICATIONS"
                  : "CLIENT PROFILES & WALK-IN DIRECTORY"}
              </Text>
              <Text style={styles.heroValue}>
                {activeTab === "technicians"
                  ? `${staff.length} Field Technicians`
                  : `${customers.length} Registered Clients`}
              </Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons
                name={activeTab === "technicians" ? "construct" : "people"}
                size={24}
                color={activeTab === "technicians" ? "#A78BFA" : "#34D399"}
              />
            </View>
          </View>

          <View style={styles.heroSubRow}>
            <View style={styles.subStatPill}>
              <Text style={styles.subStatLabel}>
                {activeTab === "technicians" ? "Available Technicians:" : "Active Accounts:"}
              </Text>
              <Text style={styles.subStatValue}>
                {activeTab === "technicians"
                  ? staff.filter((s) => (s.availability_status || "available") === "available").length
                  : customers.length}
              </Text>
            </View>
            <View style={styles.subStatPill}>
              <Text style={styles.subStatLabel}>
                {activeTab === "technicians" ? "On Assignment:" : "With Bookings:"}
              </Text>
              <Text style={styles.subStatValue}>
                {activeTab === "technicians"
                  ? staff.filter((s) => s.availability_status === "on_job").length
                  : Object.keys(customerBookingsMap).length}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── AVAILABILITY FILTER CHIPS (FOR TECHNICIANS) ── */}
        {activeTab === "technicians" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["ALL", "available", "on_job", "off_duty"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, availabilityFilter === status && styles.filterChipActive]}
                  onPress={() => setAvailabilityFilter(status)}
                >
                  <Text style={[styles.filterChipText, availabilityFilter === status && styles.filterChipTextActive]}>
                    {status === "ALL" ? "All Crew" : status.replace("_", " ").toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ── SEARCH & ACTION BUTTON ROW ── */}
        <View style={styles.actionBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.subtext} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === "technicians"
                  ? "Search tech by name, role, email, phone..."
                  : "Search client by name, email, or phone..."
              }
              placeholderTextColor={colors.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={colors.subtext} />
              </TouchableOpacity>
            ) : null}
          </View>

          {activeTab === "technicians" ? (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: "#2563EB" }]}
              onPress={openAddTechModal}
            >
              <Ionicons name="person-add" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>+ Register Tech</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: "#059669" }]}
              onPress={() => {
                setEditingCustomer(null);
                setCustomerForm({ name: "", email: "", phone: "", password: "" });
                setCustomerModalVisible(true);
              }}
            >
              <Ionicons name="person-add" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>+ Add Client</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── TAB 1: TECHNICIANS ROSTER ── */}
        {activeTab === "technicians" && (
          <>
            {loading && staff.length === 0 ? (
              <ActivityIndicator color="#3B82F6" size="large" style={{ marginTop: 40 }} />
            ) : filteredStaff.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="construct-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>No Technicians Found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery ? "Try refining your search term." : 'Tap "+ Register Tech" to onboard a new technician.'}
                </Text>
              </View>
            ) : (
              filteredStaff.map((s, index) => {
                const stats = staffBookingsMap[s.id] || { completedCount: 0, totalRevenue: 0 };
                const currentStatus = s.availability_status || "available";
                const staffName = s.user?.name || `Technician #${s.id}`;
                const qualifications = (s as any).sector_qualifications || s.qualifications || ["car-washing"];

                return (
                  <Animated.View key={s.id} entering={FadeInDown.delay(index * 35)}>
                    <View style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.avatarBox, { backgroundColor: "#A78BFA20", borderColor: "#A78BFA40" }]}>
                          <Text style={[styles.avatarText, { color: "#A78BFA" }]}>
                            {staffName.charAt(0).toUpperCase()}
                          </Text>
                        </View>

                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.customerName}>{staffName}</Text>
                          </View>
                          <Text style={styles.techRoleText}>💼 {s.role_title || "Field Technician"}</Text>
                          {s.user?.email && <Text style={styles.customerEmail}>📧 {s.user.email}</Text>}
                          {s.user?.phone && <Text style={styles.customerPhone}>📞 {s.user.phone}</Text>}
                        </View>

                        {/* Availability Toggle Pill */}
                        <TouchableOpacity
                          style={[
                            styles.statusBadge,
                            currentStatus === "available"
                              ? { backgroundColor: "#10B98122", borderColor: "#10B98166", borderWidth: 1 }
                              : currentStatus === "on_job"
                              ? { backgroundColor: "#3B82F622", borderColor: "#3B82F666", borderWidth: 1 }
                              : { backgroundColor: "#EF444422", borderColor: "#EF444466", borderWidth: 1 },
                          ]}
                          onPress={() => handleToggleAvailability(s.id, currentStatus)}
                        >
                          <Ionicons
                            name="ellipse"
                            size={8}
                            color={
                              currentStatus === "available"
                                ? "#34D399"
                                : currentStatus === "on_job"
                                ? "#60A5FA"
                                : "#F87171"
                            }
                          />
                          <Text
                            style={{
                              color:
                                currentStatus === "available"
                                  ? "#34D399"
                                  : currentStatus === "on_job"
                                  ? "#60A5FA"
                                  : "#F87171",
                              fontSize: 10,
                              fontWeight: "800",
                              marginLeft: 4,
                            }}
                          >
                            {currentStatus.replace("_", " ").toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Performance Mini Bar */}
                      <View style={styles.techStatsRow}>
                        <View style={styles.techMiniStat}>
                          <Text style={styles.techStatLabel}>JOBS COMPLETED</Text>
                          <Text style={styles.techStatValue}>{stats.completedCount} Jobs</Text>
                        </View>
                        <View style={styles.techMiniStat}>
                          <Text style={styles.techStatLabel}>REVENUE SERVICED</Text>
                          <Text style={[styles.techStatValue, { color: "#34D399" }]}>
                            ETB {stats.totalRevenue.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Qualifications Chips */}
                      <View style={styles.qualificationsContainer}>
                        {qualifications.map((q: string) => {
                          const qualDef = SECTOR_QUALIFICATIONS.find((sq) => sq.id === q);
                          return (
                            <View key={q} style={styles.qualPill}>
                              <Ionicons name="ribbon-outline" size={12} color="#60A5FA" />
                              <Text style={styles.qualPillText}>{qualDef?.label || q}</Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* Actions */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.miniActionBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}
                          onPress={() => {
                            setEditingStaff(s);
                            setTechForm({
                              name: s.user?.name || "",
                              email: s.user?.email || "",
                              phone: s.user?.phone || "",
                              password: "",
                              role_title: s.role_title || "Lead Technician",
                              qualifications: (s as any).sector_qualifications || s.qualifications || ["car-washing"],
                            });
                            setTechModalVisible(true);
                          }}
                        >
                          <Ionicons name="create-outline" size={14} color="#FBBF24" />
                          <Text style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                            Edit Qualifications
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.miniActionBtn, { backgroundColor: "#EF444422", borderColor: "#EF444455" }]}
                          onPress={() => {
                            setDeleteTarget({ type: "staff", id: s.id, name: staffName });
                            setDeleteModal(true);
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#F87171" />
                          <Text style={{ color: "#F87171", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </>
        )}

        {/* ── TAB 2: CUSTOMERS DIRECTORY ── */}
        {activeTab === "customers" && (
          <>
            {loading && customers.length === 0 ? (
              <ActivityIndicator color="#10B981" size="large" style={{ marginTop: 40 }} />
            ) : filteredCustomers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>No Clients Found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery ? "Try refining your search term." : 'Tap "+ Add Client" to register a customer account.'}
                </Text>
              </View>
            ) : (
              filteredCustomers.map((c, index) => {
                const customerJobs = customerBookingsMap[c.id] || [];
                const ordersCount = customerJobs.length || c.bookings_count || 0;

                return (
                  <Animated.View key={c.id} entering={FadeInDown.delay(index * 35)}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setInspectCustomer(c)}
                      style={styles.card}
                    >
                      <View style={styles.cardHeader}>
                        <View style={[styles.avatarBox, { backgroundColor: "#10B98122", borderColor: "#10B98155" }]}>
                          <Text style={[styles.avatarText, { color: "#34D399" }]}>
                            {c.name ? c.name.charAt(0).toUpperCase() : "C"}
                          </Text>
                        </View>

                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.customerName}>{c.name}</Text>
                            {ordersCount > 0 && (
                              <View style={styles.ordersBadge}>
                                <Text style={styles.ordersBadgeText}>{ordersCount} Orders</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.customerEmail}>{c.email}</Text>
                          {c.phone && <Text style={styles.customerPhone}>📞 {c.phone}</Text>}
                        </View>

                        <View style={styles.verifiedBadge}>
                          <Ionicons name="shield-checkmark" size={12} color="#34D399" />
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.miniActionBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F655" }]}
                          onPress={() => setInspectCustomer(c)}
                        >
                          <Ionicons name="eye-outline" size={14} color="#60A5FA" />
                          <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                            Inspect & History
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.miniActionBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}
                          onPress={() => {
                            setEditingCustomer(c);
                            setCustomerForm({
                              name: c.name,
                              email: c.email,
                              phone: c.phone || "",
                              password: "",
                            });
                            setCustomerModalVisible(true);
                          }}
                        >
                          <Ionicons name="create-outline" size={14} color="#FBBF24" />
                          <Text style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                            Edit
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.miniActionBtn, { backgroundColor: "#EF444422", borderColor: "#EF444455" }]}
                          onPress={() => {
                            setDeleteTarget({ type: "customer", id: c.id, name: c.name });
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
          </>
        )}
      </ScrollView>

      {/* ── 🔧 TECHNICIAN CREATION & EDIT MODAL (SAME UI AS SECTOR ADMIN) ── */}
      <Modal visible={techModalVisible} transparent animationType="slide" onRequestClose={() => setTechModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>
                  {editingStaff ? "Edit Technician Qualifications" : "Register Field Crew Member"}
                </Text>
                <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 2 }}>
                  Assign certifications & operational qualifications
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTechModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Technician Full Name *</Text>
                <TextInput
                  placeholder="e.g. Dawit Yohannes"
                  placeholderTextColor={colors.subtext}
                  value={techForm.name}
                  onChangeText={(t) => setTechForm({ ...techForm, name: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role Title / Designation *</Text>
                <TextInput
                  placeholder="e.g. Lead Auto Specialist"
                  placeholderTextColor={colors.subtext}
                  value={techForm.role_title}
                  onChangeText={(t) => setTechForm({ ...techForm, role_title: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  placeholder="e.g. dawit@clean.et"
                  placeholderTextColor={colors.subtext}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={techForm.email}
                  onChangeText={(t) => setTechForm({ ...techForm, email: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Contact Number</Text>
                <TextInput
                  placeholder="e.g. +251922..."
                  placeholderTextColor={colors.subtext}
                  keyboardType="phone-pad"
                  value={techForm.phone}
                  onChangeText={(t) => setTechForm({ ...techForm, phone: t })}
                  style={styles.textInput}
                />
              </View>

              {!editingStaff && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Initial Password</Text>
                  <TextInput
                    placeholder="Min 6 characters (default: password123)"
                    placeholderTextColor={colors.subtext}
                    secureTextEntry
                    value={techForm.password}
                    onChangeText={(t) => setTechForm({ ...techForm, password: t })}
                    style={styles.textInput}
                  />
                </View>
              )}

              {/* Sector Selection Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sector Classification *</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setSectorDropdownOpen(!sectorDropdownOpen)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
                    <View style={styles.dropdownIconBox}>
                      <Ionicons
                        name={
                          ((sectorOptions.find((s) => s.id === selectedSectorId)?.icon as any) || "sparkles")
                        }
                        size={18}
                        color="#38BDF8"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownSelectedTitle}>
                        {sectorOptions.find((s) => s.id === selectedSectorId)?.title || "Select Sector"}
                      </Text>
                      <Text style={styles.dropdownSelectedSub} numberOfLines={1}>
                        {sectorOptions.find((s) => s.id === selectedSectorId)?.subtitle || "Operational Sector Category"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={sectorDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>

                {sectorDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {sectorOptions.map((sec) => {
                      const isSelected = selectedSectorId === sec.id;
                      return (
                        <TouchableOpacity
                          key={sec.id}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                          onPress={() => {
                            handleSelectSector(sec.id);
                            setSectorDropdownOpen(false);
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
                            <Ionicons
                              name={(sec.icon as any) || "briefcase-outline"}
                              size={16}
                              color={isSelected ? "#10B981" : "#60A5FA"}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                                {sec.title}
                              </Text>
                              {sec.subtitle && (
                                <Text style={styles.dropdownItemSubText} numberOfLines={1}>
                                  {sec.subtitle}
                                </Text>
                              )}
                            </View>
                          </View>
                          {isSelected && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Sector Certifications & Specializations - Filtered to Current Sector */}
              <Text style={[styles.inputLabel, { marginTop: 6, marginBottom: 8 }]}>
                Sector Certifications & Specializations ({sectorOptions.find((s) => s.id === selectedSectorId)?.title || "Selected Sector"})
              </Text>

              <View style={{ gap: 6, marginBottom: 12 }}>
                {availableQualifications.map((sq) => {
                  const isChecked = techForm.qualifications.includes(sq.id);
                  return (
                    <TouchableOpacity
                      key={sq.id}
                      onPress={() => toggleQualification(sq.id)}
                      style={[styles.qualSelectItem, isChecked && styles.qualSelectItemActive]}
                    >
                      <Ionicons
                        name={isChecked ? "checkbox" : "square-outline"}
                        size={18}
                        color={isChecked ? "#10B981" : "#64748B"}
                      />
                      <Text style={[styles.qualSelectText, isChecked && styles.qualSelectTextActive]}>
                        {sq.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setTechModalVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: "#2563EB" }, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSaveTechnician}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    {editingStaff ? "Save Updates" : "Register Crew"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 👥 CUSTOMER CREATION & EDIT MODAL ── */}
      <Modal visible={customerModalVisible} transparent animationType="slide" onRequestClose={() => setCustomerModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>
                  {editingCustomer ? "Edit Client Profile" : "Register Customer Account"}
                </Text>
                <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 2 }}>
                  Register client profile contact and account credentials
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCustomerModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Client Full Name *</Text>
                <TextInput
                  placeholder="e.g. Abebe Bikila"
                  placeholderTextColor={colors.subtext}
                  value={customerForm.name}
                  onChangeText={(t) => setCustomerForm({ ...customerForm, name: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  placeholder="e.g. abebe@gmail.com"
                  placeholderTextColor={colors.subtext}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={customerForm.email}
                  onChangeText={(t) => setCustomerForm({ ...customerForm, email: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  placeholder="e.g. +251911..."
                  placeholderTextColor={colors.subtext}
                  keyboardType="phone-pad"
                  value={customerForm.phone}
                  onChangeText={(t) => setCustomerForm({ ...customerForm, phone: t })}
                  style={styles.textInput}
                />
              </View>

              {!editingCustomer && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Initial Password</Text>
                  <TextInput
                    placeholder="Min 6 characters (default: password123)"
                    placeholderTextColor={colors.subtext}
                    secureTextEntry
                    value={customerForm.password}
                    onChangeText={(t) => setCustomerForm({ ...customerForm, password: t })}
                    style={styles.textInput}
                  />
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setCustomerModalVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: "#059669" }, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSaveCustomer}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    {editingCustomer ? "Save Updates" : "Register Client"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 👁️ INSPECT CLIENT MODAL ── */}
      <Modal visible={!!inspectCustomer} transparent animationType="fade" onRequestClose={() => setInspectCustomer(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{inspectCustomer?.name}</Text>
                <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Client Account ID #{inspectCustomer?.id}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectCustomer(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {(() => {
              const customerJobs = customerBookingsMap[inspectCustomer?.id || 0] || [];
              const completedJobs = customerJobs.filter((b) => b.status === "completed");
              const totalSpent = completedJobs.reduce(
                (sum, b) => sum + Number(b.price || b.service?.price || 0),
                0
              );

              return (
                <ScrollView style={{ maxHeight: 400 }}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Email Address</Text>
                    <Text style={styles.detailValue}>{inspectCustomer?.email}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Phone Contact</Text>
                    <Text style={styles.detailValue}>{inspectCustomer?.phone || "No phone registered"}</Text>
                  </View>

                  {/* Customer Financial Summary Cards */}
                  <View style={{ flexDirection: "row", gap: 8, marginVertical: 10 }}>
                    <View style={styles.inspectStatCard}>
                      <Text style={{ color: "#94A3B8", fontSize: 10, fontWeight: "800" }}>TOTAL SPENT</Text>
                      <Text style={{ color: "#34D399", fontSize: 15, fontWeight: "800", marginTop: 4 }}>
                        ETB {totalSpent.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    <View style={styles.inspectStatCard}>
                      <Text style={{ color: "#94A3B8", fontSize: 10, fontWeight: "800" }}>TOTAL BOOKINGS</Text>
                      <Text style={{ color: "#60A5FA", fontSize: 15, fontWeight: "800", marginTop: 4 }}>
                        {customerJobs.length} Orders
                      </Text>
                    </View>
                  </View>

                  {/* Customer Itemized Order Log */}
                  <Text style={{ color: "#F8FAFC", fontSize: 13, fontWeight: "800", marginBottom: 8, marginTop: 4 }}>
                    📋 Itemized Order History Log
                  </Text>

                  {customerJobs.length === 0 ? (
                    <Text style={{ color: "#94A3B8", fontSize: 12, fontStyle: "italic", paddingVertical: 8 }}>
                      No previous booking orders recorded for this client profile.
                    </Text>
                  ) : (
                    customerJobs.map((b: any) => (
                      <View key={b.id} style={styles.orderHistoryItem}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 12 }}>
                            #{b.id} · {b.service?.name || "Clean Service"}
                          </Text>
                          <Text style={{ color: "#34D399", fontWeight: "800", fontSize: 12 }}>
                            ETB {Number(b.price || b.service?.price || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                          <Text style={{ color: "#94A3B8", fontSize: 10 }}>🗓️ {b.booking_date || "Today"}</Text>
                          <Text style={{ color: "#60A5FA", fontSize: 10, fontWeight: "800" }}>
                            {(b.status || "pending").toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              );
            })()}

            <TouchableOpacity style={[styles.closeBtn, { marginTop: 12 }]} onPress={() => setInspectCustomer(null)}>
              <Text style={styles.closeBtnText}>Close Inspection</Text>
            </TouchableOpacity>
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
                Remove {deleteTarget?.type === "staff" ? "Technician" : "Client"} from Directory?
              </Text>
              <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                {deleteTarget?.name} will be removed from records.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDeleteModal(false)} disabled={isDeleting}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteModalBtn} onPress={confirmDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800" }}>🗑️ Yes, Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */
const getStyles = (colors: any) =>
  StyleSheet.create({
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
      backgroundColor: colors.isDark ? "#334155" : colors.cardBorder,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    headerSubtitle: { fontSize: 11, color: colors.subtext, marginTop: 1 },
    refreshBtn: { padding: 6 },
    tabSwitcherOuter: {
      flexDirection: "row",
      backgroundColor: colors.card,
      padding: 6,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#2563EB",
  },
  tabButtonText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#FFF",
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 18, borderRadius: 16, marginBottom: 14 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { fontSize: 11, color: "#DBEAFE", fontWeight: "700" },
  heroValue: { fontSize: 22, fontWeight: "800", color: "#FFF", marginTop: 4 },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  heroSubRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  subStatPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  subStatLabel: { color: colors.subtext, fontSize: 11 },
  subStatValue: { color: "#FFF", fontWeight: "800", fontSize: 11 },
  filterChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  filterChipText: { color: colors.subtext, fontSize: 11, fontWeight: "700" },
  filterChipTextActive: { color: "#FFF" },
  actionBar: { flexDirection: "row", marginBottom: 14, gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 10 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addBtnText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 10 },
  emptySub: { color: colors.subtext, fontSize: 12, marginTop: 4, textAlign: "center" },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarText: { fontSize: 17, fontWeight: "800" },
  customerName: { fontSize: 15, fontWeight: "800", color: colors.text },
  customerEmail: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  customerPhone: { fontSize: 12, color: colors.subtext, marginTop: 1 },
  techRoleText: { fontSize: 12, color: "#A78BFA", fontWeight: "700", marginTop: 1 },
  ordersBadge: { backgroundColor: "#3B82F622", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ordersBadgeText: { color: "#60A5FA", fontSize: 10, fontWeight: "800" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B98115",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#10B98133",
  },
  verifiedText: { color: "#34D399", fontSize: 10, fontWeight: "800" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  techStatsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  techMiniStat: { flex: 1 },
  techStatLabel: { color: colors.subtext, fontSize: 9, fontWeight: "800" },
  techStatValue: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 2 },
  qualificationsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  qualPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E3A8A25",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "#3B82F635",
  },
  qualPillText: { color: "#93C5FD", fontSize: 10, fontWeight: "700" },
  cardActions: { flexDirection: "row", marginTop: 12, gap: 8 },
  miniActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", padding: 16 },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: colors.subtext, marginBottom: 6 },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  qualSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  qualSelectItemActive: { borderColor: "#10B981", backgroundColor: "#10B98115" },
  qualSelectText: { color: colors.subtext, fontSize: 12, fontWeight: "600", flex: 1 },
  qualSelectTextActive: { color: "#FFF", fontWeight: "700" },
  closeBtn: { flex: 1, backgroundColor: colors.isDark ? "#334155" : "#E2E8F0", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: colors.isDark ? "#FFF" : colors.text, fontWeight: "700" },
  submitBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteModalBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detailSection: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  detailLabel: { fontSize: 10, color: colors.subtext, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
  inspectStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  orderHistoryItem: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownSelectedTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  dropdownSelectedSub: {
    color: colors.subtext,
    fontSize: 11,
    marginTop: 1,
  },
  dropdownMenu: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 6,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  dropdownItemActive: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  dropdownItemText: {
    color: colors.subtext,
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownItemTextActive: {
    color: "#10B981",
    fontWeight: "700",
  },
  dropdownItemSubText: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 1,
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 10,
  },
  toastBannerSuccess: { backgroundColor: "#064E3B" },
  toastBannerDanger: { backgroundColor: "#7F1D1D" },
  toastText: { color: "#FFF", fontSize: 12, fontWeight: "600", flex: 1 },
});

