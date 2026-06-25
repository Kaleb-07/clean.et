import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
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
  user: {
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
  role_title: "",
  sector_qualifications: [] as number[],
};

/* ─── SECTOR QUALIFIER CHIP ─────────────────────────────────────────────── */
function SectorChip({
  sector,
  selected,
  onToggle,
}: {
  sector: Sector;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.sectorChip, selected && styles.sectorChipActive]}
    >
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={14}
        color={selected ? "#8b5cf6" : "#64748b"}
      />
      <Text style={[styles.sectorChipText, selected && styles.sectorChipTextActive]}>
        {sector.name}
      </Text>
    </Pressable>
  );
}

/* ─── STAFF CARD ─────────────────────────────────────────────────────────── */
function StaffCard({
  member,
  sectors,
  onDelete,
}: {
  member: StaffMember;
  sectors: Sector[];
  onDelete: () => void;
}) {
  const qualifiedSectors = sectors.filter((s) =>
    (member.sector_qualifications ?? []).includes(s.id)
  );

  return (
    <Animated.View entering={FadeInDown}>
      <BlurView intensity={30} tint="dark" style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {member.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.staffName}>{member.user?.name}</Text>
            <Text style={styles.staffRole}>{member.role_title}</Text>
          </View>
          <Pressable onPress={onDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
        </View>

        {/* Contact */}
        <View style={styles.contactRow}>
          {member.user?.phone && (
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={13} color="#94a3b8" />
              <Text style={styles.contactText}>{member.user.phone}</Text>
            </View>
          )}
          {member.user?.email && (
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={13} color="#94a3b8" />
              <Text style={styles.contactText}>{member.user.email}</Text>
            </View>
          )}
        </View>

        {/* Qualifications */}
        {qualifiedSectors.length > 0 && (
          <View style={styles.qualRow}>
            {qualifiedSectors.map((s) => (
              <View key={s.id} style={styles.qualChip}>
                <Text style={styles.qualChipText}>{s.name}</Text>
              </View>
            ))}
          </View>
        )}
      </BlurView>
    </Animated.View>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function StaffScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
        setSectors(cats.flatMap((c: any) => c.sectors ?? []));
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
    setFormError(null);
    if (!form.name.trim()) return setFormError("Name is required");
    if (!form.phone.trim()) return setFormError("Phone is required");
    if (!form.password.trim() || form.password.length < 6)
      return setFormError("Password must be at least 6 characters");
    if (!form.role_title.trim()) return setFormError("Role title is required");

    setSaving(true);
    try {
      await API.post("/staff", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        role_title: form.role_title.trim(),
        sector_qualifications: form.sector_qualifications,
      });
      setModalVisible(false);
      setForm({ ...EMPTY_FORM });
      await loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0] ||
        "Failed to create staff";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      // Delete the user associated with the staff profile
      const member = staff.find((s) => s.id === deleteId);
      if (member) {
        // Soft approach: we delete the staff profile's user
        await API.delete(`/staff/${deleteId}`);
      }
      setDeleteId(null);
      await loadData();
    } catch {
      Alert.alert("Error", "Could not delete staff member.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <LinearGradient colors={["#07070f", "#0f1028", "#1a1445"]} style={{ flex: 1 }}>
      {/* ── HEADER ── */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Animated.View entering={FadeInDown.delay(50)} style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <View>
            <Text style={styles.title}>Staff Management</Text>
            <Text style={styles.subtitle}>{staff.length} team members</Text>
          </View>
          <Pressable onPress={() => setModalVisible(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </Animated.View>
      </View>

      {/* ── LIST ── */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
          />
        }
      >
        {loading && staff.length === 0 && (
          <ActivityIndicator color="#8b5cf6" style={{ marginTop: 40 }} />
        )}

        {!loading && staff.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="person-add-outline" size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No Staff Yet</Text>
            <Text style={styles.emptyText}>
              Tap the + button to add your first team member.
            </Text>
          </View>
        )}

        {staff.map((member) => (
          <StaffCard
            key={member.id}
            member={member}
            sectors={sectors}
            onDelete={() => setDeleteId(member.id)}
          />
        ))}
      </ScrollView>

      {/* ── ADD STAFF MODAL ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={styles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Staff Member</Text>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#94a3b8" />
                </Pressable>
              </View>

              {/* Form Fields */}
              {formError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                placeholder="Abebe Kebede"
                placeholderTextColor="#475569"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Phone Number *</Text>
              <TextInput
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
                placeholder="+251911234567"
                placeholderTextColor="#475569"
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Email (optional)</Text>
              <TextInput
                value={form.email}
                onChangeText={(t) => setForm({ ...form, email: t })}
                placeholder="abebe@example.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Role Title *</Text>
              <TextInput
                value={form.role_title}
                onChangeText={(t) => setForm({ ...form, role_title: t })}
                placeholder="e.g. Senior Wash Technician"
                placeholderTextColor="#475569"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Password * (min 6 chars)</Text>
              <View style={styles.passWrap}>
                <TextInput
                  value={form.password}
                  onChangeText={(t) => setForm({ ...form, password: t })}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#64748b"
                  />
                </Pressable>
              </View>

              {/* Sector Qualifications */}
              {sectors.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                    Sector Qualifications
                  </Text>
                  <Text style={styles.fieldHint}>
                    Select the cleaning sectors this staff member is trained for.
                  </Text>
                  <View style={styles.sectorGrid}>
                    {sectors.map((s) => (
                      <SectorChip
                        key={s.id}
                        sector={s}
                        selected={form.sector_qualifications.includes(s.id)}
                        onToggle={() => toggleSector(s.id)}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* Save Button */}
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <LinearGradient
                  colors={["#7c3aed", "#4c1d95"]}
                  style={styles.saveBtnGradient}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Add Staff Member</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteId && (
        <View style={styles.deleteOverlay}>
          <BlurView intensity={50} tint="dark" style={styles.deleteCard}>
            <Ionicons name="warning-outline" size={40} color="#ef4444" />
            <Text style={styles.deleteTitle}>Remove Staff Member?</Text>
            <Text style={styles.deleteText}>
              This will permanently remove the staff member and their account.
            </Text>
            <View style={styles.deleteActions}>
              <Pressable
                onPress={() => setDeleteId(null)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleting}
                style={styles.confirmDeleteBtn}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Remove</Text>
                )}
              </Pressable>
            </View>
          </BlurView>
        </View>
      )}
    </LinearGradient>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 12,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Card */
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#a78bfa",
    fontSize: 18,
    fontWeight: "bold",
  },
  staffName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  staffRole: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  contactRow: {
    gap: 6,
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  qualRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  qualChip: {
    backgroundColor: "rgba(139,92,246,0.18)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
  },
  qualChipText: {
    color: "#a78bfa",
    fontSize: 11,
  },

  /* Empty state */
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    maxWidth: 240,
  },

  /* Add Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "92%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  fieldLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  fieldHint: {
    color: "#475569",
    fontSize: 12,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  passWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  eyeBtn: {
    padding: 10,
  },
  sectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sectorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sectorChipActive: {
    backgroundColor: "rgba(139,92,246,0.15)",
    borderColor: "rgba(139,92,246,0.4)",
  },
  sectorChipText: {
    color: "#64748b",
    fontSize: 13,
  },
  sectorChipTextActive: {
    color: "#c4b5fd",
  },
  saveBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 24,
  },
  saveBtnGradient: {
    padding: 16,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
  },

  /* Delete Modal */
  deleteOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteCard: {
    width: "82%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  deleteTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 12,
  },
  deleteText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  deleteActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cancelText: {
    color: "#94a3b8",
    fontWeight: "600",
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  confirmDeleteText: {
    color: "#fff",
    fontWeight: "700",
  },
});
