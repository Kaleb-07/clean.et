import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Briefcase,
  Plus,
  Trash2,
  ChevronLeft,
  Mail,
  Car,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react-native";
import { router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";

import API from "../../src/api/client";
import { useVehicles } from "../../hooks/useVehicles";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface FleetVehicle {
  id: number;
  vehicle_class: string;
  plate_number: string | null;
  make: string | null;
  model: string | null;
}

interface FleetAccount {
  id: number;
  company_name: string;
  billing_contact_email: string | null;
  vehicles: FleetVehicle[];
}

export default function FleetScreen() {
  const insets = useSafeAreaInsets();
  const { vehicles: allVehicles, reload: reloadAllVehicles } = useVehicles();

  const [fleets, setFleets] = useState<FleetAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail/Edit Modal
  const [selectedFleet, setSelectedFleet] = useState<FleetAccount | null>(null);
  
  // Create / Edit Form Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingFleet, setEditingFleet] = useState<FleetAccount | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Link vehicles modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<number[]>([]);
  const [linking, setLinking] = useState(false);

  const loadFleets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/fleet-accounts");
      setFleets(res.data?.data ?? []);
    } catch (e) {
      console.error("Failed to load fleet accounts", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFleets();
    reloadAllVehicles();
  }, [loadFleets, reloadAllVehicles]);

  const handleSave = async () => {
    if (!companyName.trim()) {
      Alert.alert("Required", "Company name is required.");
      return;
    }
    setSaving(true);
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const payload = {
        company_name: companyName,
        billing_contact_email: billingEmail || null,
      };

      if (editingFleet) {
        const res = await API.put(`/fleet-accounts/${editingFleet.id}`, payload);
        const updated = res.data?.data;
        setFleets((prev) => prev.map((f) => (f.id === editingFleet.id ? updated : f)));
        if (selectedFleet?.id === editingFleet.id) {
          setSelectedFleet(updated);
        }
      } else {
        const res = await API.post("/fleet-accounts", payload);
        setFleets((prev) => [res.data?.data, ...prev]);
      }
      setShowFormModal(false);
      setCompanyName("");
      setBillingEmail("");
      setEditingFleet(null);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Could not save fleet account.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Delete Fleet Account?",
      "Are you sure you want to delete this fleet? Associated vehicles will be unlinked.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await API.delete(`/fleet-accounts/${id}`);
              setFleets((prev) => prev.filter((f) => f.id !== id));
              if (selectedFleet?.id === id) {
                setSelectedFleet(null);
              }
            } catch (e: any) {
              Alert.alert("Error", e?.response?.data?.message ?? "Could not delete fleet account.");
            }
          },
        },
      ]
    );
  };

  const handleAddVehicles = async () => {
    if (selectedVehicleIds.length === 0 || !selectedFleet) return;
    setLinking(true);
    try {
      const res = await API.post(`/fleet-accounts/${selectedFleet.id}/vehicles`, {
        vehicle_ids: selectedVehicleIds,
      });
      const updated = res.data?.data;
      setFleets((prev) => prev.map((f) => (f.id === selectedFleet.id ? updated : f)));
      setSelectedFleet(updated);
      setShowLinkModal(false);
      setSelectedVehicleIds([]);
      reloadAllVehicles();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Could not add vehicles.");
    } finally {
      setLinking(false);
    }
  };

  const handleRemoveVehicle = (vehicleId: number) => {
    if (!selectedFleet) return;
    Alert.alert(
      "Remove Vehicle?",
      "Are you sure you want to remove this vehicle from the fleet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await API.delete(`/fleet-accounts/${selectedFleet.id}/vehicles/${vehicleId}`);
              const updated = res.data?.data;
              setFleets((prev) => prev.map((f) => (f.id === selectedFleet.id ? updated : f)));
              setSelectedFleet(updated);
              reloadAllVehicles();
            } catch (e: any) {
              Alert.alert("Error", e?.response?.data?.message ?? "Could not remove vehicle.");
            }
          },
        },
      ]
    );
  };

  // Vehicles that can be linked: belong to this customer but have no fleet_account_id
  const linkableVehicles = allVehicles.filter((v) => !v.fleet_account_id);

  const toggleVehicleSelect = (id: number) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={["#07070f", "#0f1028"]} style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#07070f", "#0f1028", "#120d2d"]} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Fleet Accounts</Text>
        <Pressable
          onPress={() => {
            setEditingFleet(null);
            setCompanyName("");
            setBillingEmail("");
            setShowFormModal(true);
          }}
          style={styles.addBtn}
        >
          <Plus size={20} color="#a78bfa" />
        </Pressable>
      </View>

      <FlatList
        data={fleets}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelectedFleet(item)}>
            <BlurView intensity={25} tint="dark" style={styles.fleetCard}>
              <View style={styles.fleetHeader}>
                <View style={styles.fleetIconContainer}>
                  <Briefcase size={22} color="#a78bfa" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fleetName}>{item.company_name}</Text>
                  {item.billing_contact_email ? (
                    <View style={styles.metaRow}>
                      <Mail size={12} color="#64748b" />
                      <Text style={styles.metaText}>{item.billing_contact_email}</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Trash2 size={16} color="#ef4444" />
                </Pressable>
              </View>
              <View style={styles.divider} />
              <View style={styles.fleetFooter}>
                <Text style={styles.vehicleCountText}>
                  {item.vehicles.length} Vehicle{item.vehicles.length === 1 ? "" : "s"} attached
                </Text>
              </View>
            </BlurView>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Briefcase size={48} color="#475569" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No Corporate Fleets</Text>
            <Text style={styles.emptyText}>
              Create a corporate fleet account to manage multi-vehicle billing and bookings.
            </Text>
          </View>
        }
      />

      {/* Fleet Details / Link Modal */}
      <Modal
        visible={!!selectedFleet}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedFleet(null)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={65} tint="dark" style={[styles.modalSheet, { height: "80%" }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedFleet?.company_name}</Text>
                {selectedFleet?.billing_contact_email && (
                  <Text style={styles.modalSubtitle}>{selectedFleet.billing_contact_email}</Text>
                )}
              </View>
              <Pressable
                onPress={() => {
                  if (selectedFleet) {
                    setEditingFleet(selectedFleet);
                    setCompanyName(selectedFleet.company_name);
                    setBillingEmail(selectedFleet.billing_contact_email ?? "");
                    setShowFormModal(true);
                  }
                }}
                style={styles.editLink}
              >
                <Text style={styles.editLinkText}>Edit Settings</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Attached Vehicles</Text>
              <Pressable onPress={() => setShowLinkModal(true)} style={styles.linkVehicleBtn}>
                <Plus size={14} color="#a78bfa" />
                <Text style={styles.linkVehicleText}>Attach Vehicle</Text>
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
              {selectedFleet?.vehicles.map((v) => (
                <BlurView key={v.id} intensity={15} tint="dark" style={styles.vehicleRow}>
                  <Car size={18} color="#6366f1" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleNameText}>
                      {v.make} {v.model}
                    </Text>
                    {v.plate_number ? (
                      <Text style={styles.vehiclePlateText}>{v.plate_number}</Text>
                    ) : null}
                  </View>
                  <Pressable onPress={() => handleRemoveVehicle(v.id)} style={styles.unlinkBtn}>
                    <XCircle size={16} color="#ef4444" />
                  </Pressable>
                </BlurView>
              ))}

              {selectedFleet?.vehicles.length === 0 && (
                <View style={styles.innerEmpty}>
                  <Car size={28} color="#334155" style={{ marginBottom: 8 }} />
                  <Text style={styles.innerEmptyText}>No vehicles attached to this fleet</Text>
                </View>
              )}
            </ScrollView>

            <Pressable onPress={() => setSelectedFleet(null)} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>Close</Text>
            </Pressable>
          </BlurView>
        </View>
      </Modal>

      {/* Create / Edit Fleet Form Modal */}
      <Modal
        visible={showFormModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFormModal(false)}
      >
        <View style={styles.centeredModal}>
          <BlurView intensity={70} tint="dark" style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingFleet ? "Edit Fleet Account" : "New Fleet Account"}
            </Text>

            <Text style={styles.inputLabel}>Company Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Acme Corp Addis"
              placeholderTextColor="#475569"
              value={companyName}
              onChangeText={setCompanyName}
            />

            <Text style={styles.inputLabel}>Billing Contact Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. billing@acme.com"
              placeholderTextColor="#475569"
              value={billingEmail}
              onChangeText={setBillingEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.formButtons}>
              <Pressable
                onPress={() => setShowFormModal(false)}
                style={[styles.formBtn, styles.cancelBtn]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={[styles.formBtn, styles.saveBtn]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Attach Vehicles Picker Modal */}
      <Modal
        visible={showLinkModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLinkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={65} tint="dark" style={[styles.modalSheet, { height: "70%" }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Attach Vehicles</Text>
            <Text style={styles.modalSubtitle}>
              Select from your registered vehicles without an active fleet.
            </Text>

            <ScrollView style={{ flex: 1, marginVertical: 14 }}>
              {linkableVehicles.map((v) => {
                const isSelected = selectedVehicleIds.includes(v.id);
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => toggleVehicleSelect(v.id)}
                    style={[
                      styles.pickRow,
                      isSelected && styles.pickRowSelected,
                    ]}
                  >
                    <Car size={18} color={isSelected ? "#a78bfa" : "#475569"} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickName, isSelected && { color: "#fff" }]}>
                        {v.make} {v.model}
                      </Text>
                      {v.plate_number && (
                        <Text style={styles.pickPlate}>{v.plate_number}</Text>
                      )}
                    </View>
                    <CheckCircle
                      size={20}
                      color={isSelected ? "#10b981" : "rgba(255,255,255,0.05)"}
                    />
                  </Pressable>
                );
              })}

              {linkableVehicles.length === 0 && (
                <View style={styles.innerEmpty}>
                  <AlertCircle size={28} color="#334155" style={{ marginBottom: 8 }} />
                  <Text style={styles.innerEmptyText}>All your vehicles are already attached to fleets</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.formButtons}>
              <Pressable
                onPress={() => {
                  setShowLinkModal(false);
                  setSelectedVehicleIds([]);
                }}
                style={[styles.formBtn, styles.cancelBtn]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAddVehicles}
                disabled={linking || selectedVehicleIds.length === 0}
                style={[
                  styles.formBtn,
                  styles.saveBtn,
                  selectedVehicleIds.length === 0 && styles.saveBtnDisabled,
                ]}
              >
                {linking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Attach ({selectedVehicleIds.length})</Text>
                )}
              </Pressable>
            </View>
          </BlurView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(167,139,250,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
  },

  fleetCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    marginBottom: 16,
  },
  fleetHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  fleetIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(167,139,250,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  fleetName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  metaText: { color: "#64748b", fontSize: 12 },
  deleteBtn: { padding: 6 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: 14 },
  fleetFooter: { flexDirection: "row", justifyContent: "space-between" },
  vehicleCountText: { color: "#94a3b8", fontSize: 12, fontWeight: "500" },

  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 120, paddingHorizontal: 40 },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  emptyText: { color: "#475569", fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Detail Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  modalSubtitle: { color: "#64748b", fontSize: 13, marginTop: 4 },
  editLink: { paddingVertical: 4 },
  editLinkText: { color: "#a78bfa", fontSize: 13, fontWeight: "600" },

  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  linkVehicleBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(167,139,250,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  linkVehicleText: { color: "#a78bfa", fontSize: 12, fontWeight: "700" },

  vehicleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", marginBottom: 8, overflow: "hidden" },
  vehicleNameText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  vehiclePlateText: { color: "#64748b", fontSize: 12, marginTop: 2 },
  unlinkBtn: { padding: 4 },

  innerEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  innerEmptyText: { color: "#475569", fontSize: 12, textAlign: "center" },
  confirmBtn: { backgroundColor: "#7c3aed", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 14 },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Center Modals
  centeredModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  formCard: { padding: 24, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  formTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  inputLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 8 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 14, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 16 },
  formButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  formBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  cancelBtn: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  cancelBtnText: { color: "#fff", fontWeight: "600" },
  saveBtn: { backgroundColor: "#7c3aed" },
  saveBtnDisabled: { backgroundColor: "rgba(124,58,237,0.3)" },
  saveBtnText: { color: "#fff", fontWeight: "600" },

  // Pick Rows
  pickRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(255,255,255,0.02)", marginBottom: 8 },
  pickRowSelected: { borderColor: "rgba(167,139,250,0.4)", backgroundColor: "rgba(167,139,250,0.1)" },
  pickName: { color: "#cbd5e1", fontSize: 14, fontWeight: "600" },
  pickPlate: { color: "#64748b", fontSize: 12, marginTop: 2 },
});
