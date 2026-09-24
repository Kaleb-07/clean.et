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

/* ================= TYPES ================= */
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
export default function AdminStaff() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffBookingsMap, setStaffBookingsMap] = useState<Record<number, { completedCount: number; totalRevenue: number }>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("ALL");

  // Dynamic Sectors State (Created from Super Admin & System Defaults)
  const [sectorOptions, setSectorOptions] = useState<SectorOption[]>(DEFAULT_SECTOR_OPTIONS);
  const [selectedSectorId, setSelectedSectorId] = useState<string>("car-washing");
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role_title: "Lead Technician",
    qualifications: ["car-washing"],
  });

  useEffect(() => {
    loadStaff();
  }, []);

  /* ================= LOAD ================= */
  const loadStaff = async () => {
    setLoading(true);
    try {
      const [stRes, bRes, tRes, secStored] = await Promise.allSettled([
        API.get("/staff"),
        API.get("/bookings"),
        API.get("/tenants"),
        AsyncStorage.getItem("@clean_et_custom_sectors"),
      ]);

      const stData = stRes.status === "fulfilled"
        ? (Array.isArray(stRes.value.data) ? stRes.value.data : (stRes.value.data?.data ?? []))
        : [];
      const bData = bRes.status === "fulfilled"
        ? (Array.isArray(bRes.value.data) ? bRes.value.data : (bRes.value.data?.data ?? []))
        : [];
      const tData: any[] = tRes.status === "fulfilled"
        ? (Array.isArray(tRes.value.data) ? tRes.value.data : (tRes.value.data?.data ?? []))
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

      const map: Record<number, { completedCount: number; totalRevenue: number }> = {};
      bData.forEach((b: any) => {
        const stId = b.staff?.id || b.staff_id;
        if (stId) {
          if (!map[stId]) map[stId] = { completedCount: 0, totalRevenue: 0 };
          if (b.status === "completed") {
            map[stId].completedCount += 1;
            map[stId].totalRevenue += Number(b.price || b.service?.price || 0);
          }
        }
      });

      setStaffBookingsMap(map);
      setStaff(stData);
    } catch (e) {
      console.log("Error loading staff:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStaff();
    setRefreshing(false);
  };

  const [notification, setNotification] = useState<{ message: string; type: "success" | "danger" } | null>(null);

  const triggerNotification = (message: string, type: "success" | "danger" = "success") => {
    setNotification({ message, type });
    Alert.alert(type === "success" ? "Success" : "Notification", message);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      triggerNotification("Technician Full Name is required (minimum 2 characters).", "danger");
      return;
    }

    if (!form.role_title.trim() || form.role_title.trim().length < 2) {
      triggerNotification("Role Title / Designation is required.", "danger");
      return;
    }

    if (form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        triggerNotification("Please enter a valid email address.", "danger");
        return;
      }
    }

    if (form.phone.trim()) {
      const cleanPhone = form.phone.trim().replace(/[^0-9+]/g, "");
      if (cleanPhone.length < 6) {
        triggerNotification("Phone number must contain at least 6 digits.", "danger");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        await API.put(`/staff/${editingStaff.id}`, {
          name: form.name.trim(),
          email: form.email ? form.email.trim().toLowerCase() : undefined,
          phone: form.phone ? form.phone.trim() : undefined,
          role_title: form.role_title.trim(),
          qualifications: form.qualifications,
        });
        triggerNotification(`✨ Technician "${form.name.trim()}" profile & qualifications updated!`, "success");
        const matchedTenant = tenants.find((t: any) => t.categories_enabled?.includes(selectedSectorId)) || tenants[0];
        await API.post("/staff", {
          name: form.name.trim(),
          email: form.email ? form.email.trim().toLowerCase() : undefined,
          phone: form.phone ? form.phone.trim() : undefined,
          password: form.password ? form.password.trim() : "password123",
          role_title: form.role_title.trim(),
          qualifications: form.qualifications,
          tenant_id: matchedTenant?.id || user?.tenant?.id,
        });
        triggerNotification(`🎉 Technician "${form.name.trim()}" registered to company roster!`, "success");
      }

      setModalVisible(false);
      setEditingStaff(null);
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        role_title: "Lead Technician",
        qualifications: [availableQualifications[0]?.id || "car-washing"],
      });
      loadStaff();
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
      triggerNotification(`⚡ Crew availability updated to ${nextStatus.replace("_", " ").toUpperCase()}!`, "success");
      loadStaff();
    } catch (e: any) {
      triggerNotification("Failed to update availability status.", "danger");
    }
  };

  /* ================= DELETE ================= */
  const confirmDelete = async () => {
    if (!selectedDeleteId) return;

    setIsDeleting(true);
    try {
      await API.delete(`/staff/${selectedDeleteId}`);
      setDeleteModal(false);
      setSelectedDeleteId(null);
      triggerNotification("🗑️ Technician removed from company roster.", "danger");
      loadStaff();
    } catch (e: any) {
      triggerNotification(`Delete Error: ${e?.response?.data?.message || "Failed to remove staff member."}`, "danger");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleQualification = (id: string) => {
    if (form.qualifications.includes(id)) {
      if (form.qualifications.length > 1) {
        setForm({ ...form, qualifications: form.qualifications.filter((q) => q !== id) });
      }
    } else {
      setForm({ ...form, qualifications: [...form.qualifications, id] });
    }
  };

  const filteredStaff = staff.filter((s) => {
    const q = searchQuery.toLowerCase();
    const name = (s.user?.name || "").toLowerCase();
    const role = (s.role_title || "").toLowerCase();
    const email = (s.user?.email || "").toLowerCase();

    const matchesSearch = name.includes(q) || role.includes(q) || email.includes(q);
    const avail = (s.availability_status || "available").toLowerCase();
    const matchesAvail = availabilityFilter === "ALL" || avail === availabilityFilter.toLowerCase();

    return matchesSearch && matchesAvail;
  });

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
    setForm((prev) => ({
      ...prev,
      qualifications: [firstQual],
    }));
  };

  const openAddModal = () => {
    const defaultSectorId =
      (user?.tenant?.categories_enabled && user.tenant.categories_enabled[0]) ||
      sectorOptions[0]?.id ||
      "car-washing";
    setSelectedSectorId(defaultSectorId);
    setSectorDropdownOpen(false);
    const specs = SECTOR_SPECIALIZATIONS_MAP[defaultSectorId] || [];
    const firstQual = specs[0]?.id || defaultSectorId;

    setEditingStaff(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      role_title: "Lead Technician",
      qualifications: [firstQual],
    });
    setModalVisible(true);
  };

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
            {isSuperAdmin ? "Global Staff Roster" : "🏢 Company Crew & Dispatch Roster"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? `${staff.length} Platform Technicians`
              : `${staff.length} On-Duty Crew for ${user?.tenant?.business_name || "Company"}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadStaff}>
          <Ionicons name="refresh" size={18} color={isSuperAdmin ? "#60A5FA" : "#34D399"} />
        </TouchableOpacity>
      </View>

      {/* ── 🔔 ACTION NOTIFICATION TOAST BANNER ── */}
      {notification && (
        <Animated.View entering={FadeInDown} style={[styles.toastBanner, notification.type === "danger" ? styles.toastBannerDanger : styles.toastBannerSuccess]}>
          <Ionicons name={notification.type === "danger" ? "alert-circle" : "checkmark-circle"} size={20} color="#FFF" />
          <Text style={styles.toastText}>{notification.message}</Text>
          <TouchableOpacity onPress={() => setNotification(null)}>
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isSuperAdmin ? "#3B82F6" : "#10B981"} />
        }
      >
        {/* ── HERO METRICS BAR ── */}
        <LinearGradient
          colors={isSuperAdmin ? ["#1E1B4B", "#312E81"] : ["#064E3B", "#047857"]}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>
                {isSuperAdmin ? "Global Staff Deployment" : "Company Crew & Sector Qualifications"}
              </Text>
              <Text style={styles.heroValue}>{staff.length} On-Duty Technicians</Text>
            </View>
            <View style={[styles.heroIconBox, !isSuperAdmin && { backgroundColor: "rgba(52, 211, 153, 0.2)", borderColor: "rgba(52, 211, 153, 0.4)" }]}>
              <Ionicons name="construct" size={24} color="#34D399" />
            </View>
          </View>
        </LinearGradient>

        {/* ── AVAILABILITY FILTER CHIPS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { id: "ALL", label: "ALL CREW" },
              { id: "available", label: "🟢 AVAILABLE" },
              { id: "on_job", label: "🔵 ON JOB" },
              { id: "off_duty", label: "🔴 OFF DUTY" },
            ].map((af) => {
              const isSel = availabilityFilter === af.id;
              return (
                <TouchableOpacity
                  key={af.id}
                  onPress={() => setAvailabilityFilter(af.id)}
                  style={[styles.filterChip, isSel && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                    {af.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ── SEARCH & ACTION BAR ── */}
        <View style={styles.actionBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search crew member by name or title..."
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
            style={[styles.addBtn, { backgroundColor: isSuperAdmin ? "#2563EB" : "#059669" }]}
            onPress={openAddModal}
          >
            <Ionicons name="person-add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>+ Add Technician</Text>
          </TouchableOpacity>
        </View>

        {/* ── STAFF ROSTER LIST ── */}
        {loading && staff.length === 0 ? (
          <ActivityIndicator color={isSuperAdmin ? "#3B82F6" : "#10B981"} size="large" style={{ marginTop: 40 }} />
        ) : filteredStaff.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>No Technicians Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? "Try refining your search query." : 'Tap "+ Add Technician" to register field crew members.'}
            </Text>
          </View>
        ) : (
          filteredStaff.map((s, index) => {
            const name = s.user?.name || `Tech #${s.id}`;
            const email = s.user?.email || "";
            const phone = s.user?.phone || "";
            const perfStats = staffBookingsMap[s.id] || { completedCount: 0, totalRevenue: 0 };

            return (
              <Animated.View key={s.id} entering={FadeInDown.delay(index * 40)}>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.avatarBox, !isSuperAdmin && { backgroundColor: "#A78BFA22", borderColor: "#A78BFA55" }]}>
                      <Text style={[styles.avatarText, !isSuperAdmin && { color: "#A78BFA" }]}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.staffName}>{name}</Text>
                      <Text style={{ color: "#60A5FA", fontSize: 12, fontWeight: "700" }}>💼 {s.role_title || "Field Tech"}</Text>
                      <Text style={styles.staffMeta}>{email} {phone ? `· 📞 ${phone}` : ""}</Text>

                      {/* Performance Metric Pill */}
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                        <View style={{ backgroundColor: "#10B98122", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: "#34D399", fontSize: 10, fontWeight: "800" }}>
                            🏆 {perfStats.completedCount} Jobs Done
                          </Text>
                        </View>
                        {perfStats.totalRevenue > 0 && (
                          <View style={{ backgroundColor: "#3B82F622", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: "#60A5FA", fontSize: 10, fontWeight: "800" }}>
                              ETB {perfStats.totalRevenue.toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {(() => {
                      const avail = (s as any).availability_status || "available";
                      const availConfig: Record<string, { label: string; color: string; bg: string }> = {
                        available: { label: "🟢 AVAILABLE", color: "#34D399", bg: "#10B98122" },
                        on_job: { label: "🔵 ON JOB", color: "#60A5FA", bg: "#3B82F622" },
                        off_duty: { label: "🔴 OFF DUTY", color: "#F87171", bg: "#EF444422" },
                      };
                      const conf = availConfig[avail] || availConfig.available;
                      return (
                        <TouchableOpacity
                          onPress={() => handleToggleAvailability(s.id, avail)}
                          style={[styles.dutyBadge, { backgroundColor: conf.bg, borderColor: conf.color + "55", borderWidth: 1 }]}
                        >
                          <Text style={[styles.dutyText, { color: conf.color }]}>{conf.label}</Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>

                  {/* Sector Qualifications */}
                  <View style={styles.qualRow}>
                    {((s as any).sector_qualifications && (s as any).sector_qualifications.length > 0
                      ? (s as any).sector_qualifications
                      : s.qualifications && s.qualifications.length > 0
                      ? s.qualifications
                      : ["car-washing"]
                    ).map((q: string) => (
                      <View key={q} style={styles.qualTag}>
                        <Text style={styles.qualTagText}>{q.replace("-", " ").toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Actions (Tenant Admin Only) */}
                  {!isSuperAdmin && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.miniActionBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}
                        onPress={() => {
                          setEditingStaff(s);
                          setForm({
                            name: s.user?.name || "",
                            email: s.user?.email || "",
                            phone: s.user?.phone || "",
                            password: "",
                            role_title: s.role_title || "Lead Technician",
                            qualifications: (s as any).sector_qualifications || s.qualifications || ["car-washing"],
                          });
                          setModalVisible(true);
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
                          setSelectedDeleteId(s.id);
                          setDeleteModal(true);
                        }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#F87171" />
                        <Text style={{ color: "#F87171", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* ── ✏️ ADD / EDIT TECHNICIAN MODAL ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingStaff ? "Edit Technician Qualifications" : "Register Field Crew Member"}
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  Assign certifications & operational qualifications
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Technician Full Name *</Text>
                <TextInput
                  placeholder="e.g. Dawit Yohannes"
                  placeholderTextColor="#64748B"
                  value={form.name}
                  onChangeText={(t) => setForm({ ...form, name: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role Title / Designation *</Text>
                <TextInput
                  placeholder="e.g. Lead Auto Specialist"
                  placeholderTextColor="#64748B"
                  value={form.role_title}
                  onChangeText={(t) => setForm({ ...form, role_title: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  placeholder="e.g. dawit@clean.et"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(t) => setForm({ ...form, email: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Contact Number</Text>
                <TextInput
                  placeholder="e.g. +251922..."
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={(t) => setForm({ ...form, phone: t })}
                  style={styles.textInput}
                />
              </View>

              {!editingStaff && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Initial Password</Text>
                  <TextInput
                    placeholder="Min 6 characters (default: password123)"
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    value={form.password}
                    onChangeText={(t) => setForm({ ...form, password: t })}
                    style={styles.textInput}
                  />
                </View>
              )}

              {/* Sector Selection (Dropdown for Super Admin, Locked to Current Sector for Sector Admin) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isSuperAdmin ? "Sector Classification *" : "Assigned Division Sector"}
                </Text>

                {isSuperAdmin ? (
                  <>
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
                  </>
                ) : (
                  <View style={styles.lockedSectorBox}>
                    <View style={styles.lockedSectorIconBox}>
                      <Ionicons
                        name={
                          ((sectorOptions.find((s) => s.id === selectedSectorId)?.icon as any) || "business")
                        }
                        size={18}
                        color="#34D399"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lockedSectorTitle}>
                        {user?.tenant?.business_name || sectorOptions.find((s) => s.id === selectedSectorId)?.title || "Current Sector"}
                      </Text>
                      <Text style={styles.lockedSectorSub}>
                        {sectorOptions.find((s) => s.id === selectedSectorId)?.title || "Current Division Sector"}
                      </Text>
                    </View>
                    <View style={styles.lockedBadge}>
                      <Ionicons name="lock-closed" size={10} color="#34D399" />
                      <Text style={styles.lockedBadgeText}>CURRENT SECTOR</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Qualification Tags Selection - Filtered to Current Sector */}
              <Text style={[styles.inputLabel, { marginTop: 6, marginBottom: 8 }]}>
                {isSuperAdmin
                  ? `Sector Certifications & Specializations (${sectorOptions.find((s) => s.id === selectedSectorId)?.title || "Selected Sector"})`
                  : "Division Certifications & Qualifications"}
              </Text>

              <View style={{ gap: 6, marginBottom: 12 }}>
                {availableQualifications.map((sq) => {
                  const isChecked = form.qualifications.includes(sq.id);
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
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: "#059669" }, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSave}
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

      {/* ── 🗑️ DELETE CONFIRMATION MODAL ── */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: "#EF4444" }]}>
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <Ionicons name="warning-outline" size={36} color="#EF4444" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFF", textAlign: "center" }}>
                Remove Technician from Roster?
              </Text>
              <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                This technician will no longer be available for job assignment.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDeleteModal(false)} disabled={isDeleting}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteModalBtn} onPress={confirmDelete} disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: "800" }}>🗑️ Yes, Remove</Text>}
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 18, borderRadius: 16, marginBottom: 14 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { fontSize: 12, color: "#DBEAFE", fontWeight: "500" },
  heroValue: { fontSize: 24, fontWeight: "800", color: "#FFF", marginTop: 4 },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  filterChip: { backgroundColor: "#1E293B", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  filterChipActive: { backgroundColor: "#059669", borderColor: "#10B981" },
  filterChipText: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  filterChipTextActive: { color: "#FFF" },
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#3B82F622",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#3B82F655",
  },
  avatarText: { color: "#60A5FA", fontWeight: "800", fontSize: 18 },
  staffName: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  staffMeta: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  dutyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dutyText: { fontSize: 10, fontWeight: "800" },
  qualRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  qualTag: { backgroundColor: "#0F172A", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "#334155" },
  qualTagText: { color: "#A5B4FC", fontSize: 9, fontWeight: "700" },
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
  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#F8FAFC", marginTop: 10 },
  emptySub: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 20, maxHeight: "90%", borderWidth: 1, borderColor: "#334155" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#F8FAFC" },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#CBD5E1", marginBottom: 6 },
  textInput: { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155" },
  qualSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 8,
  },
  qualSelectItemActive: { backgroundColor: "#10B98115", borderColor: "#10B98155" },
  qualSelectText: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  qualSelectTextActive: { color: "#FFF", fontWeight: "700" },
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  deleteModalBtn: { flex: 1, backgroundColor: "#EF4444", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
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
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  dropdownSelectedSub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 1,
  },
  dropdownMenu: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
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
    borderBottomColor: "#1E293B",
  },
  dropdownItemActive: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  dropdownItemText: {
    color: "#CBD5E1",
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
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    gap: 10,
    elevation: 3,
  },
  toastBannerSuccess: {
    backgroundColor: "#059669",
  },
  toastBannerDanger: {
    backgroundColor: "#DC2626",
  },
  toastText: {
    flex: 1,
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  lockedSectorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10B98155",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  lockedSectorIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedSectorTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
  },
  lockedSectorSub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 1,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  lockedBadgeText: {
    color: "#34D399",
    fontSize: 9,
    fontWeight: "800",
  },
});
