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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Car,
  Plus,
  Trash2,
  Edit3,
  ChevronLeft,
} from "lucide-react-native";
import { router } from "expo-router";
import { useVehicles, VehicleClass, CreateVehiclePayload } from "../../hooks/useVehicles";
import { useColors } from "../../hooks/useColors";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_OPTIONS: { value: VehicleClass; label: string; emoji: string }[] = [
  { value: "sedan",      label: "Sedan",      emoji: "🚗" },
  { value: "suv",        label: "SUV",        emoji: "🚙" },
  { value: "van",        label: "Van",        emoji: "🚐" },
  { value: "truck",      label: "Truck",      emoji: "🚚" },
  { value: "bus",        label: "Bus",        emoji: "🚌" },
  { value: "motorcycle", label: "Motorcycle", emoji: "🏍️" },
  { value: "other",      label: "Other",      emoji: "🚘" },
];

// ─── Blank form ────────────────────────────────────────────────────────────────

const blankForm = (): Omit<CreateVehiclePayload, "fleet_account_id"> => ({
  vehicle_class: "sedan",
  plate_number: "",
  color: "",
  make: "",
  model: "",
  year: null,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehiclesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { vehicles, isLoading, reload, addVehicle, removeVehicle } = useVehicles();

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankForm());

  const openAdd = () => {
    setForm(blankForm());
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.vehicle_class) return;
    setSaving(true);
    try {
      await addVehicle({
        ...form,
        fleet_account_id: null,
        year: form.year ? Number(form.year) : null,
      });
      setShowModal(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save vehicle.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number, hasActive: boolean) => {
    if (hasActive) {
      Alert.alert(
        "Cannot Delete",
        "This vehicle has active bookings. Cancel or complete them first."
      );
      return;
    }
    Alert.alert("Delete Vehicle?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeVehicle(id);
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not delete vehicle.");
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 56) }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>My Vehicles</Text>
        <Pressable onPress={openAdd} style={styles.addBtn}>
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>

      {/* ── List ── */}
      <FlatList
        data={vehicles}
        keyExtractor={(v) => String(v.id)}
        refreshing={isLoading}
        onRefresh={reload}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 32 },
        ]}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Car size={40} color={colors.subtext} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No vehicles yet</Text>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                Tap the + button to add your first vehicle.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const cls = CLASS_OPTIONS.find((c) => c.value === item.vehicle_class);
          return (
            <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.cardLeft}>
                <Text style={styles.emoji}>{cls?.emoji ?? "🚘"}</Text>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {[item.make, item.model].filter(Boolean).join(" ") ||
                      cls?.label}
                  </Text>
                  <Text style={[styles.cardSub, { color: colors.subtext }]}>
                    {[
                      item.plate_number,
                      item.year,
                      item.color,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No details"}
                  </Text>
                  <Text style={[styles.bookingCount, { color: colors.primary }]}>
                    {item.booking_count} booking
                    {item.booking_count !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => handleDelete(item.id, item.booking_count > 0)}
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
          <BlurView intensity={60} tint={colors.isDark ? "dark" : "light"} style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Vehicle</Text>

            {/* Class picker */}
            <Text style={[styles.label, { color: colors.text }]}>Type</Text>
            <View style={styles.classPicker}>
              {CLASS_OPTIONS.map((c) => (
                <Pressable
                  key={c.value}
                  onPress={() => setForm((f) => ({ ...f, vehicle_class: c.value }))}
                  style={[
                    styles.classChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    form.vehicle_class === c.value && styles.classChipActive,
                  ]}
                >
                  <Text style={[styles.classChipText, form.vehicle_class === c.value && { color: "#ffffff" }]}>
                    {c.emoji} {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Make (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="e.g. Toyota"
              placeholderTextColor={colors.placeholder}
              value={form.make ?? ""}
              onChangeText={(t) => setForm((f) => ({ ...f, make: t }))}
            />

            <Text style={[styles.label, { color: colors.text }]}>Model (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="e.g. Corolla"
              placeholderTextColor={colors.placeholder}
              value={form.model ?? ""}
              onChangeText={(t) => setForm((f) => ({ ...f, model: t }))}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.label, { color: colors.text }]}>Year</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="2022"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  value={form.year ? String(form.year) : ""}
                  onChangeText={(t) =>
                    setForm((f) => ({ ...f, year: t ? Number(t) : null }))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>Color</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="White"
                  placeholderTextColor={colors.placeholder}
                  value={form.color ?? ""}
                  onChangeText={(t) => setForm((f) => ({ ...f, color: t }))}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Plate Number (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="AA 12345"
              placeholderTextColor={colors.placeholder}
              value={form.plate_number ?? ""}
              autoCapitalize="characters"
              onChangeText={(t) =>
                setForm((f) => ({ ...f, plate_number: t }))
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
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  emoji: { fontSize: 30 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cardSub: { color: "#a3a3a3", fontSize: 13, marginTop: 2 },
  bookingCount: { color: "#6366f1", fontSize: 12, marginTop: 4 },
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  classPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  classChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  classChipActive: {
    backgroundColor: "rgba(99,102,241,0.3)",
    borderColor: "#6366f1",
  },
  classChipText: { color: "#fff", fontSize: 13 },
  row: { flexDirection: "row" },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
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
