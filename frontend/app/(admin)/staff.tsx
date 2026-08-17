import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";

import API from "../../src/api/client";

/* ─── TYPES ─────────────────────────────────────────────────────────────── */
interface Sector {
  id: number;
  name: string;
}

interface StaffMember {
  id: number;
  role_title: string;
  sector_qualifications: number[];
  name?: string;
  phone?: string;
  email?: string;
  tenant_id?: number;
  tenant?: { business_name: string };
  user?: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
  };
}

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  password: "",
  role_title: "Field Technician",
  sector_qualifications: [] as number[],
};

/* ─── SECTOR CATEGORIES ─────────────────────────────────────────────────── */
const SECTOR_OPTIONS = [
  { id: 1, name: "Car Washing & Detailing", icon: "car-sport", color: "#3B82F6" },
  { id: 2, name: "High-Rise Window Clean", icon: "business", color: "#10B981" },
  { id: 3, name: "Commercial Laundry & Steam", icon: "shirt", color: "#F59E0B" },
  { id: 4, name: "Facility Maintenance & HVAC", icon: "construct", color: "#A78BFA" },
];

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function StaffScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [sectors, setSectors] = useState<Sector[]>(SECTOR_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [inspectStaff, setInspectStaff] = useState<StaffMember | null>(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stRes, catRes] = await Promise.allSettled([
        API.get("/staff"),
        API.get("/categories"),
      ]);

      if (stRes.status === "fulfilled") setStaff(stRes.value.data ?? []);
      if (catRes.status === "fulfilled") {
        const cats = catRes.value.data.data ?? [];
        const fetchedSectors = cats.flatMap((c: any) => c.sectors ?? []);
        if (fetchedSectors.length > 0) {
          setSectors(fetchedSectors);
        }
      }
    } catch (e) {
      console.log("Staff load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleSector = (id: number) => {
    setForm((prev) => {
      const has = prev.sector_qualifications.includes(id);
      return {
        ...prev,
        sector_qualifications: has
          ? prev.sector_qualifications.filter((s) => s !== id)
          : [...prev.sector_qualifications, id],
      };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.role_title.trim()) {
      return Alert.alert("Required", "Name, Email, and Role Title are required.");
    }

    setSaving(true);
    try {
      if (editingStaff) {
        // Backend update staff endpoint
        await API.put(`/staff/${editingStaff.id}`, {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          role_title: form.role_title.trim(),
          sector_qualifications: form.sector_qualifications,
        });
        Alert.alert("Saved", "Field technician profile updated successfully!");
      } else {
        await API.post("/staff", {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password.trim() ? form.password.trim() : "password123",
          role_title: form.role_title.trim(),
          sector_qualifications: form.sector_qualifications,
        });
        Alert.alert("🎉 Success", "New field technician added to crew roster!");
      }

      setModalVisible(false);
      setEditingStaff(null);
      setForm({ ...EMPTY_FORM });
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to save technician.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (member: StaffMember) => {
    setEditingStaff(member);
    const name = member.user?.name || member.name || "";
    const email = member.user?.email || member.email || "";
    const phone = member.user?.phone || member.phone || "";

    setForm({
      name,
      email,
      phone,
      password: "",
      role_title: member.role_title || "Field Technician",
      sector_qualifications: member.sector_qualifications ?? [],
    });
    setModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await API.delete(`/staff/${deleteId}`);
      setStaff((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteId(null);
      Alert.alert("Deleted", "Technician profile removed from roster.");
    } catch {
      Alert.alert("Error", "Failed to delete staff member.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredStaff = staff.filter((s) => {
    const q = searchQuery.toLowerCase();
    const name = (s.user?.name || s.name || "").toLowerCase();
    const email = (s.user?.email || s.email || "").toLowerCase();
    const role = (s.role_title || "").toLowerCase();
    const phone = (s.user?.phone || s.phone || "").toLowerCase();

    const matchesSearch = name.includes(q) || email.includes(q) || role.includes(q) || phone.includes(q);
    const matchesFilter = roleFilter === "all" || role.includes(roleFilter.toLowerCase());

    return matchesSearch && matchesFilter;
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
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Field Staff Roster</Text>
          <Text style={styles.headerSubtitle}>
            {staff.length} Active Technicians & Dispatch Crew
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* ── HERO METRICS BAR ── */}
        <LinearGradient colors={["#1E1B4B", "#312E81"]} style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Platform Technician Crew Management</Text>
              <Text style={styles.heroValue}>{staff.length} Technicians Roster</Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="construct" size={24} color="#A78BFA" />
            </View>
          </View>

          <View style={styles.heroSubRow}>
            <View style={styles.subStatPill}>
              <Text style={styles.subStatLabel}>Dispatch Status:</Text>
              <Text style={styles.subStatValue}>100% On-Duty Ready</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── SEARCH & ACTION BAR ── */}
        <View style={styles.actionBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search technician by name, role, or phone..."
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
              setEditingStaff(null);
              setForm({ ...EMPTY_FORM });
              setModalVisible(true);
            }}
          >
            <Ionicons name="person-add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>+ Add Tech</Text>
          </TouchableOpacity>
        </View>

        {/* ── STAFF LIST ── */}
        {loading && staff.length === 0 ? (
          <ActivityIndicator color="#3B82F6" size="large" style={{ marginTop: 40 }} />
        ) : filteredStaff.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>No Technicians Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? "Try refining your search query." : 'Tap "+ Add Tech" to register field crew.'}
            </Text>
          </View>
        ) : (
          filteredStaff.map((s, index) => {
            const staffName = s.user?.name || s.name || `Technician #${s.id}`;
            const staffEmail = s.user?.email || s.email || "No email";
            const staffPhone = s.user?.phone || s.phone || "No phone";
            const tenantName = s.tenant?.business_name || "Platform Direct";

            const qualifiedSectors = sectors.filter((sec) =>
              (s.sector_qualifications ?? []).includes(sec.id)
            );

            return (
              <Animated.View key={s.id} entering={FadeInDown.delay(index * 40)}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setInspectStaff(s)}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarBox}>
                      <Text style={styles.avatarText}>
                        {staffName.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.staffName}>{staffName}</Text>
                        <View style={styles.tenantBadge}>
                          <Text style={styles.tenantBadgeText}>{tenantName}</Text>
                        </View>
                      </View>

                      <Text style={styles.staffRole}>💼 {s.role_title || "Field Technician"}</Text>
                      <Text style={styles.staffContact}>📞 {staffPhone} · ✉️ {staffEmail}</Text>
                    </View>

                    <View style={styles.dutyPill}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981", marginRight: 4 }} />
                      <Text style={{ color: "#34D399", fontSize: 10, fontWeight: "800" }}>ON DUTY</Text>
                    </View>
                  </View>

                  {/* Qualified Sectors */}
                  {qualifiedSectors.length > 0 && (
                    <View style={styles.qualRow}>
                      <Text style={styles.qualLabel}>Qualifications:</Text>
                      {qualifiedSectors.map((sec) => (
                        <View key={sec.id} style={styles.qualChip}>
                          <Text style={styles.qualChipText}>✓ {sec.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.miniActionBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F655" }]}
                      onPress={() => setInspectStaff(s)}
                    >
                      <Ionicons name="eye-outline" size={14} color="#60A5FA" />
                      <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                        Inspect
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.miniActionBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}
                      onPress={() => openEdit(s)}
                    >
                      <Ionicons name="create-outline" size={14} color="#FBBF24" />
                      <Text style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.miniActionBtn, { backgroundColor: "#EF444422", borderColor: "#EF444455" }]}
                      onPress={() => setDeleteId(s.id)}
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
      </ScrollView>

      {/* ── 👁️ INSPECT STAFF MODAL ── */}
      <Modal visible={!!inspectStaff} transparent animationType="fade" onRequestClose={() => setInspectStaff(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{inspectStaff?.user?.name || inspectStaff?.name}</Text>
                <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Technician ID #{inspectStaff?.id} · {inspectStaff?.role_title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectStaff(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Assigned Company Tenant</Text>
                <Text style={styles.detailValue}>{inspectStaff?.tenant?.business_name || "Platform Direct Crew"}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Contact Credentials</Text>
                <Text style={{ color: "#F8FAFC", fontSize: 13, fontWeight: "600" }}>
                  Phone: {inspectStaff?.user?.phone || inspectStaff?.phone || "No phone registered"}
                </Text>
                <Text style={{ color: "#CBD5E1", fontSize: 12, marginTop: 2 }}>
                  Email: {inspectStaff?.user?.email || inspectStaff?.email || "No email registered"}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Authorized Service Sectors</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {sectors
                    .filter((sec) => (inspectStaff?.sector_qualifications ?? []).includes(sec.id))
                    .map((sec) => (
                      <View key={sec.id} style={styles.qualChip}>
                        <Text style={styles.qualChipText}>✓ {sec.name}</Text>
                      </View>
                    ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setInspectStaff(null)}>
              <Text style={styles.closeBtnText}>Close Inspection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── ✏️ ADD / EDIT TECHNICIAN MODAL ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingStaff ? "Edit Technician Profile" : "Add Field Technician"}
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  Assign role title, contact info, and qualified sectors
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Technician Full Name *</Text>
                <TextInput
                  placeholder="e.g. Samuel Kifle"
                  placeholderTextColor="#64748B"
                  value={form.name}
                  onChangeText={(t) => setForm({ ...form, name: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role Title / Qualification *</Text>
                <TextInput
                  placeholder="e.g. Lead Detailer / Rope Access Specialist"
                  placeholderTextColor="#64748B"
                  value={form.role_title}
                  onChangeText={(t) => setForm({ ...form, role_title: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address (Login ID) *</Text>
                <TextInput
                  placeholder="tech.crew@clean.et"
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
                  placeholder="+2519..."
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

              {/* Sector Qualifications Checkboxes */}
              <Text style={styles.inputLabel}>Authorized Service Sectors</Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                {SECTOR_OPTIONS.map((sec) => {
                  const isChecked = form.sector_qualifications.includes(sec.id);
                  return (
                    <TouchableOpacity
                      key={sec.id}
                      onPress={() => toggleSector(sec.id)}
                      style={[
                        styles.sectorCheckboxItem,
                        isChecked && { borderColor: sec.color, backgroundColor: `${sec.color}15` },
                      ]}
                    >
                      <Ionicons name={sec.icon as any} size={18} color={sec.color} style={{ marginRight: 8 }} />
                      <Text style={{ color: "#FFF", fontSize: 13, flex: 1, fontWeight: "600" }}>{sec.name}</Text>
                      <Ionicons
                        name={isChecked ? "checkbox" : "square-outline"}
                        size={20}
                        color={isChecked ? sec.color : "#64748B"}
                      />
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
                style={[styles.submitBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    {editingStaff ? "Save Updates" : "Add Technician"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 🗑️ DELETE CONFIRMATION MODAL ── */}
      <Modal visible={!!deleteId} transparent animationType="fade" onRequestClose={() => setDeleteId(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: "#EF4444" }]}>
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <Ionicons name="warning-outline" size={36} color="#EF4444" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#FFF", textAlign: "center" }}>
                Delete Technician Profile?
              </Text>
              <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                This will remove the technician profile and revoke their dispatch credentials.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDeleteId(null)} disabled={deleting}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteModalBtn} onPress={confirmDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: "800" }}>🗑️ Yes, Delete</Text>}
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
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#A78BFA22",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#A78BFA55",
  },
  avatarText: { color: "#A78BFA", fontWeight: "800", fontSize: 18 },
  staffName: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  tenantBadge: { backgroundColor: "#3B82F622", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: "#3B82F644" },
  tenantBadgeText: { fontSize: 10, color: "#60A5FA", fontWeight: "700" },
  staffRole: { color: "#CBD5E1", fontSize: 12, marginTop: 2, fontWeight: "600" },
  staffContact: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  dutyPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#10B98122", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "#10B98155" },
  qualRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 10, gap: 6 },
  qualLabel: { fontSize: 11, color: "#94A3B8" },
  qualChip: { backgroundColor: "#334155", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  qualChipText: { fontSize: 11, color: "#E2E8F0" },
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
  detailSection: { backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  detailLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase" },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#F8FAFC", marginTop: 2 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#CBD5E1", marginBottom: 6 },
  textInput: { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155" },
  sectorCheckboxItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#334155" },
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  deleteModalBtn: { flex: 1, backgroundColor: "#EF4444", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
});
