import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Building2,
  Plus,
  Trash2,
  ChevronLeft,
  Layers,
} from "lucide-react-native";
import { router } from "expo-router";
import {
  useBuildingProfiles,
  CreateBuildingProfilePayload,
} from "../../hooks/useBuildingProfiles";
import { useColors } from "../../hooks/useColors";

// ─── Tier badge ────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  low_rise: { color: "#10b981", label: "Low-rise (≤3F)", bg: "rgba(16,185,129,0.15)" },
  mid_rise: { color: "#f59e0b", label: "Mid-rise (4–6F)", bg: "rgba(245,158,11,0.15)" },
  high_rise: { color: "#ef4444", label: "High-rise (7F+)", bg: "rgba(239,68,68,0.15)" },
};

// ─── Blank form ────────────────────────────────────────────────────────────────

const blank = (): CreateBuildingProfilePayload => ({
  name: "",
  area_sqm: 0,
  floor_count: 1,
  access_notes: "",
  room_inventory: {},
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function BuildingProfilesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { profiles, isLoading, reload, addProfile, removeProfile } =
    useBuildingProfiles();

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank());

  const openAdd = () => {
    setForm(blank());
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Validation", "Please enter a building name.");
      return;
    }
    if (form.area_sqm <= 0) {
      Alert.alert("Validation", "Please enter a valid area (sqm).");
      return;
    }
    setSaving(true);
    try {
      await addProfile({
        ...form,
        area_sqm: Number(form.area_sqm),
        floor_count: Number(form.floor_count),
      });
      setShowModal(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save building profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number, activeCount: number) => {
    if (activeCount > 0) {
      Alert.alert(
        "Cannot Delete",
        "This building profile has active bookings. Cancel or complete them first."
      );
      return;
    }
    Alert.alert(
      "Delete Building Profile?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeProfile(id);
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not delete profile.");
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 56) }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Building Profiles</Text>
        <Pressable onPress={openAdd} style={styles.addBtn}>
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>

      {/* ── List ── */}
      <FlatList
        data={profiles}
        keyExtractor={(p) => String(p.id)}
        refreshing={isLoading}
        onRefresh={reload}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 32 },
        ]}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Building2 size={40} color={colors.subtext} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No buildings yet</Text>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                Save a building profile to pre-fill your cleaning bookings.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const tier = TIER_CONFIG[item.exterior_access_tier];
          return (
            <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <Building2 size={20} color="#6366f1" />
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View
                    style={[
                      styles.tierBadge,
                      { backgroundColor: tier.bg, borderColor: tier.color },
                    ]}
                  >
                    <Text style={[styles.tierText, { color: tier.color }]}>
                      {tier.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={[styles.meta, { color: colors.subtext }]}>
                    {item.area_sqm.toLocaleString()} sqm
                  </Text>
                  <Text style={[styles.metaDot, { color: colors.subtext }]}>·</Text>
                  <Text style={[styles.meta, { color: colors.subtext }]}>{item.floor_count} floor{item.floor_count !== 1 ? "s" : ""}</Text>
                  <Text style={[styles.metaDot, { color: colors.subtext }]}>·</Text>
                  <Text style={[styles.meta, { color: colors.subtext }]}>
                    {item.booking_count} booking{item.booking_count !== 1 ? "s" : ""}
                  </Text>
                </View>

                {item.access_notes ? (
                  <Text style={[styles.notes, { color: colors.subtext }]} numberOfLines={2}>
                    {item.access_notes}
                  </Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => handleDelete(item.id, item.booking_count)}
                style={styles.deleteBtn}
              >
                <Trash2 size={18} color="#ef4444" />
              </Pressable>
            </BlurView>
          );
        }}
      />

      {/* ── Add Modal ── */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView>
            <BlurView intensity={60} tint={colors.isDark ? "dark" : "light"} style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Building</Text>

              <Text style={[styles.label, { color: colors.text }]}>Building Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderWidth: 0, borderColor: "transparent", color: colors.text }]}
                placeholder="e.g. Atlas Tower, Home"
                placeholderTextColor={colors.placeholder}
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.label, { color: colors.text }]}>Area (sqm) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, borderWidth: 0, borderColor: "transparent", color: colors.text }]}
                    placeholder="500"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numeric"
                    value={form.area_sqm ? String(form.area_sqm) : ""}
                    onChangeText={(t) =>
                      setForm((f) => ({
                        ...f,
                        area_sqm: t ? Number(t) : 0,
                      }))
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.text }]}>Floors *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, borderWidth: 0, borderColor: "transparent", color: colors.text }]}
                    placeholder="5"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numeric"
                    value={form.floor_count ? String(form.floor_count) : ""}
                    onChangeText={(t) =>
                      setForm((f) => ({
                        ...f,
                        floor_count: t ? Number(t) : 1,
                      }))
                    }
                  />
                </View>
              </View>

              {/* Live tier preview */}
              {form.floor_count > 0 && (() => {
                const tier =
                  form.floor_count <= 3
                    ? TIER_CONFIG.low_rise
                    : form.floor_count <= 6
                    ? TIER_CONFIG.mid_rise
                    : TIER_CONFIG.high_rise;
                return (
                  <View
                    style={[
                      styles.tierPreview,
                      { backgroundColor: tier.bg, borderColor: tier.color },
                    ]}
                  >
                    <Layers size={14} color={tier.color} />
                    <Text style={[styles.tierPreviewText, { color: tier.color }]}>
                      Access tier: {tier.label}
                    </Text>
                  </View>
                );
              })()}

              <Text style={[styles.label, { color: colors.text }]}>Access Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top", backgroundColor: colors.inputBg, borderWidth: 0, borderColor: "transparent", color: colors.text }]}
                placeholder="Gate code, parking info, etc."
                placeholderTextColor={colors.placeholder}
                multiline
                value={form.access_notes ?? ""}
                onChangeText={(t) =>
                  setForm((f) => ({ ...f, access_notes: t }))
                }
              />

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setShowModal(false)}
                  style={[styles.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </BlurView>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 8, marginRight: 4 },
  title: { flex: 1, color: "#fff", fontSize: 22, fontWeight: "700" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  cardBody: { flex: 1 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierText: { fontSize: 11, fontWeight: "600" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  meta: { color: "#a3a3a3", fontSize: 13 },
  metaDot: { color: "#555", fontSize: 13 },
  notes: { color: "#6b7280", fontSize: 13, marginTop: 6 },
  deleteBtn: { padding: 8 },
  empty: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  emptyText: {
    color: "#a3a3a3",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  label: { color: "#a3a3a3", fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
    borderWidth: 0,
    borderColor: "transparent",
  },
  row: { flexDirection: "row" },
  tierPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierPreviewText: { fontSize: 13, fontWeight: "600" },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  cancelBtnText: { color: "#a3a3a3", fontSize: 15, fontWeight: "600" },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#4f46e5",
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
