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
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import API from "../../src/api/client";
import { useColors } from "../../hooks/useColors";
import { useLanguage } from "../../contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ================= TYPES ================= */
interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration?: number;
  category?: string;
  sub_center?: string;
  image?: string | null;
}

const DEFAULT_SECTOR_CATEGORIES = [
  { id: "car-washing", name: "Car Washing & Auto Detailing", icon: "car-sport", color: "#3B82F6" },
  { id: "building-cleaning", name: "Building & Property Clean", icon: "business", color: "#10B981" },
  { id: "laundry", name: "Commercial Laundry & Steam", icon: "shirt", color: "#F59E0B" },
  { id: "maintenance", name: "Facility Maintenance & HVAC", icon: "construct", color: "#A78BFA" },
];

const DIVISION_SUB_CENTERS: Record<string, { id: string; name: string; icon: string }[]> = {
  "car-washing": [
    { id: "corporate-fleet", name: "🚛 Corporate Fleet Wash Center", icon: "car" },
    { id: "mobile-doorstep", name: "🏠 Mobile Doorstep Wash Center", icon: "home" },
    { id: "valet-pickup", name: "🚗 Pickup & Drop-off Valet Center", icon: "key" },
    { id: "bay-wash", name: "🧼 Standard Bay Station Center", icon: "construct" },
  ],
  "building-cleaning": [
    { id: "exterior-facade", name: "🏙️ Exterior Facade & High-Rise Glass Center", icon: "business" },
    { id: "interior-deep", name: "🧹 Interior Deep Sanitization Center", icon: "sparkles" },
  ],
};

/* ================= COMPONENT ================= */
export default function AdminServices() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colors = useColors();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const isSuperAdmin = user?.role === "super_admin";

  const [services, setServices] = useState<Service[]>([]);
  const [sectorCategories, setSectorCategories] = useState(DEFAULT_SECTOR_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubCenterFilter, setSelectedSubCenterFilter] = useState<string>("ALL");

  // Modal State for Services
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [inspectService, setInspectService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    category: "car-washing",
    sub_center: "corporate-fleet",
    description: "",
    price: "",
    duration: "45",
    image: "",
  });

  // Deletion Modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  // Custom Sub-Center Branch State
  const [customCenters, setCustomCenters] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [createCenterModal, setCreateCenterModal] = useState(false);
  const [newCenterName, setNewCenterName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadServices();
    loadSettingsSectors();
    loadCustomCenters();
  }, [user?.tenant_id]);

  const loadCustomCenters = async () => {
    try {
      const key = `@custom_sub_centers_${user?.tenant_id || "global"}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setCustomCenters(JSON.parse(stored));
      }
    } catch (e) {}
  };

  const handleCreateCustomCenter = async () => {
    if (!newCenterName.trim()) {
      return Alert.alert("Required", "Please enter a name for the new sub-center station.");
    }
    const newId = `center-${Date.now().toString().slice(-4)}`;
    const newObj = { id: newId, name: `🏢 ${newCenterName.trim()}`, icon: "business" };
    const updated = [...customCenters, newObj];
    setCustomCenters(updated);
    try {
      const key = `@custom_sub_centers_${user?.tenant_id || "global"}`;
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {}
    setCreateCenterModal(false);
    setNewCenterName("");
    setServiceForm((prev) => ({ ...prev, sub_center: newId }));
    Alert.alert("🎉 Center Created", `Sub-Center "${newObj.name}" created and added to dynamic centers!`);
  };

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

  const loadSettingsSectors = async () => {
    try {
      const res = await API.get("/super-admin/settings");
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
      console.log("Settings sector load error:", e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadServices(), loadSettingsSectors()]);
    setRefreshing(false);
  };

  /* ─── LOCAL STORAGE IMAGE PICKER ─── */
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return Alert.alert("Permission Required", "Gallery permission is required to select service photos.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let imageUri = asset.uri;
        if (asset.base64) {
          imageUri = `data:image/jpeg;base64,${asset.base64}`;
        }
        setServiceForm((prev) => ({ ...prev, image: imageUri }));
      }
    } catch (err) {
      Alert.alert("Image Error", "Failed to select image from device storage.");
    }
  };

  /* ─── SAVE SERVICE ITEM ─── */
  const handleSaveService = async () => {
    const trimmedName = serviceForm.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return Alert.alert("Required", "Service Offering Name is required (minimum 2 characters).");
    }

    if (!serviceForm.price.trim()) {
      return Alert.alert("Required", "Service Base Price is required.");
    }

    const parsedPrice = parseFloat(serviceForm.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return Alert.alert("Invalid Price", "Please enter a valid numeric price (e.g. 450.00).");
    }

    const parsedDuration = parseInt(serviceForm.duration, 10);
    if (isNaN(parsedDuration) || parsedDuration < 1) {
      return Alert.alert("Invalid Duration", "Please enter a valid service duration in minutes (e.g. 45).");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: serviceForm.name.trim(),
        category: serviceForm.category || availableSectors[0]?.id || "car-washing",
        sub_center: serviceForm.sub_center || "corporate-fleet",
        description: serviceForm.description ? serviceForm.description.trim() : "",
        price: parsedPrice,
        duration: parseInt(serviceForm.duration, 10) || 45,
        image: serviceForm.image || null,
      };

      if (editingService) {
        await API.put(`/services/${editingService.id}`, payload);
        Alert.alert("Updated", "Service catalog item updated successfully.");
      } else {
        await API.post("/services", payload);
        Alert.alert("🎉 Success", "New service posted to division catalog & client app!");
      }

      setServiceModalVisible(false);
      setEditingService(null);
      setServiceForm({
        name: "",
        category: availableSectors[0]?.id || "car-washing",
        sub_center: "corporate-fleet",
        description: "",
        price: "",
        duration: "45",
        image: "",
      });
      loadServices();
    } catch (e: any) {
      const errorMsg = e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join("\n")
        : e?.response?.data?.message || "Failed to save service.";
      Alert.alert("Error", errorMsg);
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
      Alert.alert("Error", e?.response?.data?.message || "Failed to delete service.");
    } finally {
      setIsDeleting(false);
    }
  };

  const tenantCategories = user?.tenant?.categories_enabled || ["car-washing"];
  const availableSectors = isSuperAdmin
    ? sectorCategories
    : sectorCategories.filter((cat) => tenantCategories.includes(cat.id));

  const defaultSubCenters = DIVISION_SUB_CENTERS[availableSectors[0]?.id || "car-washing"] || [
    { id: "general", name: "General Division Center", icon: "sparkles" },
  ];
  const activeDivisionSubCenters = [...defaultSubCenters, ...customCenters];

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    const name = s.name.toLowerCase();
    const desc = (s.description || "").toLowerCase();
    const matchesSearch = name.includes(q) || desc.includes(q);
    const matchesSubCenter = selectedSubCenterFilter === "ALL" || s.sub_center === selectedSubCenterFilter;
    return matchesSearch && matchesSubCenter;
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
            {isSuperAdmin ? "Global Service Catalog Management" : "🏢 Division Service Catalog"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? "Enterprise Multi-Sector Cleaning Offerings"
              : `Post & Manage Offerings for ${user?.tenant?.business_name || "Division"}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#34D399" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* Search & Action Bar */}
        <View style={styles.actionBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.subtext} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search service offerings..."
              placeholderTextColor={colors.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.searchClearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.subtext} />
              </TouchableOpacity>
            ) : null}
          </View>

          {!isSuperAdmin && (
            <View style={styles.actionBtnsRow}>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: "#059669" }]}
                onPress={() => setCreateCenterModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="business" size={16} color="#FFF" />
                <Text style={styles.addBtnText}>+ Center</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  setEditingService(null);
                  setServiceForm({
                    name: "",
                    category: availableSectors[0]?.id || "car-washing",
                    sub_center: activeDivisionSubCenters[0]?.id || "general",
                    description: "",
                    price: "",
                    duration: "45",
                    image: "",
                  });
                  setServiceModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addBtnText}>+ Service</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sub-Center Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSelectedSubCenterFilter("ALL")}
              style={[styles.filterChip, selectedSubCenterFilter === "ALL" && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, selectedSubCenterFilter === "ALL" && styles.filterChipTextActive]}>
                ALL CENTERS ({services.length})
              </Text>
            </TouchableOpacity>

            {!isSuperAdmin && (
              <TouchableOpacity
                onPress={() => setCreateCenterModal(true)}
                style={[styles.filterChip, { backgroundColor: "#10B98122", borderColor: "#10B98155" }]}
              >
                <Text style={[styles.filterChipText, { color: colors.isDark ? "#34D399" : "#059669" }]}>
                  🏬 + Create Center
                </Text>
              </TouchableOpacity>
            )}

            {activeDivisionSubCenters.map((center) => {
              const isSel = selectedSubCenterFilter === center.id;
              const count = services.filter((s) => s.sub_center === center.id).length;
              return (
                <TouchableOpacity
                  key={center.id}
                  onPress={() => setSelectedSubCenterFilter(center.id)}
                  style={[styles.filterChip, isSel && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                    {center.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Services List */}
        {loading && services.length === 0 ? (
          <ActivityIndicator color="#10B981" size="large" style={{ marginTop: 40 }} />
        ) : filteredServices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cut-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>No Services Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? "Try refining your search query or filter." : 'Tap "+ Add Service" to post a new division offering.'}
            </Text>
          </View>
        ) : (
          filteredServices.map((s, index) => {
            const categoryObj = sectorCategories.find((c) => c.id === s.category) || sectorCategories[0];
            const subCenterObj = activeDivisionSubCenters.find((sc) => sc.id === s.sub_center);

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
                      <Text style={styles.serviceName}>{s.name}</Text>
                      {subCenterObj && (
                        <View style={{ flexDirection: "row", marginTop: 2 }}>
                          <View style={styles.subCenterBadge}>
                            <Text style={styles.subCenterBadgeText}>{subCenterObj.name}</Text>
                          </View>
                        </View>
                      )}

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

                    {!isSuperAdmin && (
                      <>
                        <TouchableOpacity
                          style={[styles.miniActionBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}
                          onPress={() => {
                            setEditingService(s);
                            setServiceForm({
                              name: s.name,
                              category: s.category || availableSectors[0]?.id || "car-washing",
                              sub_center: s.sub_center || activeDivisionSubCenters[0]?.id || "general",
                              description: s.description || "",
                              price: String(s.price),
                              duration: String(s.duration || 45),
                              image: s.image || "",
                            });
                            setServiceModalVisible(true);
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
                            setSelectedDeleteId(s.id);
                            setDeleteModal(true);
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#F87171" />
                          <Text style={{ color: "#F87171", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* ── 👁️ INSPECT SERVICE MODAL ── */}
      <Modal visible={!!inspectService} transparent animationType="fade" onRequestClose={() => setInspectService(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>{inspectService?.name}</Text>
                <Text style={{ color: colors.isDark ? "#34D399" : "#059669", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Service ID #{inspectService?.id}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setInspectService(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.subtext} />
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
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
                  ⏱️ {inspectService?.duration || 45} Minutes
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Service Description</Text>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
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

      {/* ── ✏️ ADD / EDIT SERVICE MODAL WITH SERVICE CENTER SELECTION ── */}
      <Modal visible={serviceModalVisible} transparent animationType="slide" onRequestClose={() => setServiceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>{editingService ? "Edit Service Item" : "Add Service Item"}</Text>
                <Text style={styles.modalSubtitle}>
                  Configure division service center branch, price, duration, and cover photo
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setServiceModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Service Item Name *</Text>
                <TextInput
                  placeholder="e.g. Home-to-Home Mobile Wash / Exterior Facade Clean"
                  placeholderTextColor={colors.subtext}
                  value={serviceForm.name}
                  onChangeText={(t) => setServiceForm({ ...serviceForm, name: t })}
                  style={styles.textInput}
                />
              </View>

              {/* Service Sub-Center Selector Cards */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Assign Service Center Branch / Type *</Text>
                <TouchableOpacity
                  onPress={() => setCreateCenterModal(true)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#10B98122", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#10B98155" }}
                >
                  <Ionicons name="add" size={14} color={colors.isDark ? "#34D399" : "#059669"} />
                  <Text style={{ color: colors.isDark ? "#34D399" : "#059669", fontSize: 11, fontWeight: "800" }}>+ Add Center</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 8, marginBottom: 14 }}>
                {activeDivisionSubCenters.map((sc) => {
                  const isSel = serviceForm.sub_center === sc.id;
                  return (
                    <TouchableOpacity
                      key={sc.id}
                      onPress={() => setServiceForm({ ...serviceForm, sub_center: sc.id })}
                      style={[
                        styles.subCenterOption,
                        isSel && { borderColor: "#10B981", backgroundColor: "#10B98115" },
                      ]}
                    >
                      <Text style={{ color: colors.text, fontSize: 13, flex: 1, fontWeight: "700" }}>{sc.name}</Text>
                      <Ionicons
                        name={isSel ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={isSel ? "#10B981" : "#64748B"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Local Storage Device Image Picker */}
              <Text style={styles.inputLabel}>Service Cover Photo (Device Storage / Gallery)</Text>
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
                    <Ionicons name="cloud-upload-outline" size={24} color={colors.isDark ? "#34D399" : "#059669"} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>
                      📷 Select Photo from Device Storage
                    </Text>
                    <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 2 }}>
                      Pick real-time photo from computer/device gallery
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Base Price (ETB) *</Text>
                  <TextInput
                    placeholder="e.g. 450.00"
                    placeholderTextColor={colors.subtext}
                    keyboardType="numeric"
                    value={serviceForm.price}
                    onChangeText={(t) => setServiceForm({ ...serviceForm, price: t })}
                    style={styles.textInput}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Duration (Minutes)</Text>
                  <TextInput
                    placeholder="e.g. 45"
                    placeholderTextColor={colors.subtext}
                    keyboardType="numeric"
                    value={serviceForm.duration}
                    onChangeText={(t) => setServiceForm({ ...serviceForm, duration: t })}
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { marginTop: 12 }]}>
                <Text style={styles.inputLabel}>Work Scope Description</Text>
                <TextInput
                  placeholder="Describe service procedures, safety gear, onboard equipment..."
                  placeholderTextColor={colors.subtext}
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
                    {editingService ? "Save Changes" : "Post Service Offering"}
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
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center" }}>
                Delete Service Item?
              </Text>
              <Text style={{ color: colors.subtext, fontSize: 12, textAlign: "center", marginTop: 4 }}>
                This will remove the item from company division catalog and mobile app.
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

      {/* ── ➕ CREATE DYNAMIC CUSTOM SUB-CENTER MODAL ── */}
      <Modal visible={createCenterModal} transparent animationType="slide" onRequestClose={() => setCreateCenterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>➕ Add Dynamic Sub-Center Station</Text>
                <Text style={styles.modalSubtitle}>
                  Create a new station branch (e.g. Bole Station, Kazanchis Facade Hub)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCreateCenterModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Sub-Center Station Name *</Text>
              <TextInput
                placeholder="e.g. Bole Express Detailing Station"
                placeholderTextColor={colors.subtext}
                value={newCenterName}
                onChangeText={setNewCenterName}
                style={styles.textInput}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setCreateCenterModal(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: "#10B981" }]} onPress={handleCreateCustomCenter}>
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>Create Station Center</Text>
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
    backgroundColor: colors.isDark ? "#334155" : "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  headerSubtitle: { fontSize: 11, color: colors.subtext, marginTop: 1 },
  refreshBtn: { padding: 6 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  actionBar: { flexDirection: "column", marginBottom: 14, gap: 10 },
  searchBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  searchInput: { flex: 1, color: colors.text, marginLeft: 8, fontSize: 13, paddingVertical: 0 },
  searchClearBtn: { padding: 4, justifyContent: "center", alignItems: "center" },
  actionBtnsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  addBtnText: { color: "#FFF", fontWeight: "700", marginLeft: 6, fontSize: 13 },
  filterChip: { backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
  filterChipActive: { backgroundColor: "#059669", borderColor: "#10B981" },
  filterChipText: { color: colors.subtext, fontSize: 11, fontWeight: "700" },
  filterChipTextActive: { color: "#FFF" },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  serviceImageThumbnail: { width: 48, height: 48, borderRadius: 10, marginRight: 12, borderWidth: 1, borderColor: colors.cardBorder },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
  },
  serviceName: { color: colors.text, fontWeight: "800", fontSize: 15 },
  subCenterBadge: { backgroundColor: "#10B98122", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2, borderWidth: 1, borderColor: "#10B98155" },
  subCenterBadgeText: { color: colors.isDark ? "#34D399" : "#059669", fontSize: 10, fontWeight: "700" },
  serviceDesc: { color: colors.subtext, fontSize: 12, marginTop: 4, lineHeight: 16 },
  servicePrice: { fontSize: 15, fontWeight: "800", color: colors.isDark ? "#34D399" : "#059669" },
  serviceDuration: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  cardActions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
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
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.subtext, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, maxHeight: "90%", borderWidth: 1, borderColor: colors.cardBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 10 },
  modalTitleWrap: { flex: 1, paddingRight: 6 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalSubtitle: { color: colors.subtext, fontSize: 11, marginTop: 2, lineHeight: 16 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.isDark ? "#334155" : "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  detailSection: { backgroundColor: colors.background, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.cardBorder },
  detailLabel: { fontSize: 11, color: colors.subtext, fontWeight: "700", textTransform: "uppercase" },
  detailAmount: { fontSize: 18, fontWeight: "800", color: colors.isDark ? "#34D399" : "#059669", marginTop: 2 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: colors.subtext, marginBottom: 6 },
  textInput: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, borderWidth: 1, borderColor: colors.cardBorder },
  subCenterOption: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
  imagePickerButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 14 },
  imagePickerIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#10B98122", alignItems: "center", justifyContent: "center" },
  imagePickerPreviewBox: { marginBottom: 14, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: colors.cardBorder },
  imagePickerPreview: { width: "100%", height: 140 },
  imagePickerOverlayRow: { flexDirection: "row", backgroundColor: colors.background, padding: 8, justifyContent: "space-between" },
  changeImageBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#2563EB", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  removeImageBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#EF444422", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#EF444455" },
  closeBtn: { flex: 1, backgroundColor: colors.isDark ? "#334155" : "#E2E8F0", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: colors.isDark ? "#FFF" : colors.text, fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#059669", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  deleteModalBtn: { flex: 1, backgroundColor: "#EF4444", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  serviceImagePreview: { width: "100%", height: 160, borderRadius: 10, marginBottom: 12 },
});
