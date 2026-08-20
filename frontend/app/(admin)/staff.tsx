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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import API from "../../src/api/client";
import { useAuth } from "../../contexts/AuthContext";

/* ================= TYPES ================= */
interface StaffMember {
  id: number;
  role_title: string;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  qualifications?: string[];
}

const SECTOR_QUALIFICATIONS = [
  { id: "car-washing", label: "Car Washing & Auto Detailing" },
  { id: "building-cleaning", label: "High-Rise Window & Glass Sanitation" },
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [inspectStaff, setInspectStaff] = useState<StaffMember | null>(null);

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
      const res = await API.get("/staff");
      setStaff(res.data.data ?? []);
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

  /* ================= SAVE ================= */
  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      return Alert.alert("Required", "Technician Name and Email are required.");
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        await API.put(`/staff/${editingStaff.id}`, {
          role_title: form.role_title.trim(),
          qualifications: form.qualifications,
        });
        Alert.alert("Updated", "Technician qualifications and title updated.");
      } else {
        await API.post("/staff", {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password ? form.password.trim() : "password123",
          role_title: form.role_title.trim(),
          qualifications: form.qualifications,
        });
        Alert.alert("🎉 Success", isSuperAdmin ? "Staff member registered on platform!" : "Technician registered to company roster!");
      }

      setModalVisible(false);
      setEditingStaff(null);
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        role_title: "Lead Technician",
        qualifications: ["car-washing"],
      });
      loadStaff();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to save technician.");
    } finally {
      setIsSubmitting(false);
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
      Alert.alert("Removed", "Technician removed from roster.");
      loadStaff();
    } catch (e: any) {
      Alert.alert("Delete Error", e?.response?.data?.message || "Failed to remove staff member.");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleQualification = (id: string) => {
    if (form.qualifications.includes(id)) {
      setForm({ ...form, qualifications: form.qualifications.filter((q) => q !== id) });
    } else {
      setForm({ ...form, qualifications: [...form.qualifications, id] });
    }
  };

  const filteredStaff = staff.filter((s) => {
    const q = searchQuery.toLowerCase();
    const name = (s.user?.name || "").toLowerCase();
    const role = (s.role_title || "").toLowerCase();
    const email = (s.user?.email || "").toLowerCase();
    return name.includes(q) || role.includes(q) || email.includes(q);
  });

  const tenantCategories = user?.tenant?.categories_enabled || ["car-washing"];
  const availableQualifications = isSuperAdmin
    ? SECTOR_QUALIFICATIONS
    : SECTOR_QUALIFICATIONS.filter((sq) => tenantCategories.includes(sq.id));

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
            style={[styles.addBtn, !isSuperAdmin && { backgroundColor: "#059669" }]}
            onPress={() => {
              setEditingStaff(null);
              setForm({
                name: "",
                email: "",
                phone: "",
                password: "",
                role_title: "Lead Technician",
                qualifications: ["car-washing"],
              });
              setModalVisible(true);
            }}
          >
            <Ionicons name="person-add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>{isSuperAdmin ? "+ Add Staff" : "+ Add Technician"}</Text>
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
                    </View>

                    <View style={styles.dutyBadge}>
                      <Ionicons name="flash" size={12} color="#34D399" />
                      <Text style={styles.dutyText}>On Duty</Text>
                    </View>
                  </View>

                  {/* Sector Qualifications */}
                  <View style={styles.qualRow}>
                    {(s.qualifications && s.qualifications.length > 0 ? s.qualifications : ["car-washing"]).map((q) => (
                      <View key={q} style={styles.qualTag}>
                        <Text style={styles.qualTagText}>{q.replace("-", " ").toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Actions */}
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
                          qualifications: s.qualifications || ["car-washing"],
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
                  {editingStaff ? "Edit Technician Qualifications" : "Register Company Technician"}
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  {isSuperAdmin
                    ? "Register staff member on platform"
                    : `Register on-duty technician for ${user?.tenant?.business_name || "Company"}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {!editingStaff && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Technician Full Name *</Text>
                    <TextInput
                      placeholder="e.g. Samuel Tadesse"
                      placeholderTextColor="#64748B"
                      value={form.name}
                      onChangeText={(t) => setForm({ ...form, name: t })}
                      style={styles.textInput}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address (Login ID) *</Text>
                    <TextInput
                      placeholder="e.g. samuel.tech@clean.et"
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={form.email}
                      onChangeText={(t) => setForm({ ...form, email: t })}
                      style={styles.textInput}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      placeholder="e.g. +251922..."
                      placeholderTextColor="#64748B"
                      keyboardType="phone-pad"
                      value={form.phone}
                      onChangeText={(t) => setForm({ ...form, phone: t })}
                      style={styles.textInput}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Initial Account Password *</Text>
                    <TextInput
                      placeholder="Enter password (default: password123)"
                      placeholderTextColor="#64748B"
                      secureTextEntry
                      value={form.password}
                      onChangeText={(t) => setForm({ ...form, password: t })}
                      style={styles.textInput}
                    />
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role Title / Designation *</Text>
                <TextInput
                  placeholder="e.g. Lead Auto Detailer / High-Rise Window Rope Specialist"
                  placeholderTextColor="#64748B"
                  value={form.role_title}
                  onChangeText={(t) => setForm({ ...form, role_title: t })}
                  style={styles.textInput}
                />
              </View>

              {/* Authorized Sector Qualifications (Auto-assigned for single sector tenants) */}
              {(!isSuperAdmin && availableQualifications.length <= 1) ? (
                <View style={{ marginBottom: 14, backgroundColor: "#0F172A", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#334155" }}>
                  <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700" }}>DUTY QUALIFICATION</Text>
                  <Text style={{ color: "#34D399", fontSize: 13, fontWeight: "800", marginTop: 2 }}>
                    ⚡ {availableQualifications[0]?.label || "Car Washing & Auto Detailing"}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Authorized Sector Qualifications *</Text>
                  <View style={{ gap: 8, marginBottom: 14 }}>
                    {availableQualifications.map((sq) => {
                      const isSel = form.qualifications.includes(sq.id);
                      return (
                        <TouchableOpacity
                          key={sq.id}
                          onPress={() => toggleQualification(sq.id)}
                          style={[styles.qualSelectItem, isSel && styles.qualSelectItemActive]}
                        >
                          <Ionicons
                            name={isSel ? "checkbox" : "square-outline"}
                            size={20}
                            color={isSel ? "#10B981" : "#64748B"}
                          />
                          <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "700", marginLeft: 8 }}>{sq.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, !isSuperAdmin && { backgroundColor: "#059669" }, isSubmitting && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    {editingStaff ? "Update Qualifications" : "Register Technician"}
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
                This technician will be removed from company duty roster.
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
  heroCard: { padding: 18, borderRadius: 16, marginBottom: 16 },
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
  cardHeader: { flexDirection: "row", alignItems: "center" },
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
  staffMeta: { color: "#CBD5E1", fontSize: 11, marginTop: 2 },
  dutyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B98122",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#10B98155",
    gap: 4,
  },
  dutyText: { color: "#34D399", fontSize: 10, fontWeight: "700" },
  qualRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  qualTag: { backgroundColor: "#0F172A", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#334155" },
  qualTagText: { color: "#94A3B8", fontSize: 10, fontWeight: "700" },
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
  qualSelectItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  qualSelectItemActive: { borderColor: "#10B981", backgroundColor: "#10B98115" },
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  deleteModalBtn: { flex: 1, backgroundColor: "#EF4444", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
});
