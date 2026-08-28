import React, { useState } from "react";
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
  Switch,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useSuperAdmin,
  Tenant,
  CreateTenantPayload,
  TenantPayout,
} from "../../hooks/useSuperAdmin";

type ActiveTab = "overview" | "divisions" | "payouts";

interface SectorCategoryOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

const DEFAULT_SECTOR_OPTIONS: SectorCategoryOption[] = [
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
];

export default function SuperAdminTenants() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    analytics,
    tenants,
    payouts,
    loading,
    refreshing,
    onRefresh,
    createTenant,
    updateTenantStatus,
    impersonateTenant,
    stopImpersonation,
    impersonatingId,
    generatePayouts,
    processPayout,
  } = useSuperAdmin();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "suspended">("ALL");

  // Create Division Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    admin_password: "",
    categories_enabled: ["car-washing"],
  });

  // Inspect Division Modal
  const [inspectTenant, setInspectTenant] = useState<Tenant | null>(null);

  /* ─── TOGGLE SECTOR ─── */
  const toggleSector = (sectorId: string) => {
    setForm((prev) => {
      const exists = prev.categories_enabled.includes(sectorId);
      let updated: string[];
      if (exists) {
        if (prev.categories_enabled.length === 1) {
          Alert.alert("Requirement", "At least one cleaning sector must be assigned.");
          return prev;
        }
        updated = prev.categories_enabled.filter((id) => id !== sectorId);
      } else {
        updated = [...prev.categories_enabled, sectorId];
      }
      return { ...prev, categories_enabled: updated };
    });
  };

  /* ─── SAVE DIVISION ─── */
  const handleCreateDivision = async () => {
    if (!form.business_name.trim()) {
      return Alert.alert("Required", "Division Name is required.");
    }
    if (!form.admin_name.trim() || !form.admin_email.trim() || !form.admin_password.trim()) {
      return Alert.alert("Required", "Division Manager Name, Email, and Initial Password are required.");
    }

    setIsSubmitting(true);
    try {
      const payload: CreateTenantPayload = {
        business_name: form.business_name.trim(),
        plan: "enterprise",
        categories_enabled: form.categories_enabled,
        admin_name: form.admin_name.trim(),
        admin_email: form.admin_email.trim(),
        admin_phone: form.admin_phone.trim() || undefined,
        admin_password: form.admin_password.trim(),
      };

      await createTenant(payload);
      Alert.alert(
        "🎉 Success",
        `New Cleaning Division "${form.business_name}" created!\n\nManager Account Credentials:\nEmail: ${form.admin_email}\nPassword: ${form.admin_password}`
      );

      setModalVisible(false);
      setForm({
        business_name: "",
        admin_name: "",
        admin_email: "",
        admin_phone: "",
        admin_password: "",
        categories_enabled: ["car-washing"],
      });
    } catch (e: any) {
      Alert.alert("Creation Error", e?.response?.data?.message || e.message || "Failed to create division.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── TOGGLE STATUS ─── */
  const handleToggleStatus = async (tenant: Tenant) => {
    const nextStatus = tenant.status === "active" ? "suspended" : "active";
    Alert.alert(
      "Confirm Status Update",
      `Are you sure you want to change "${tenant.business_name}" status to ${nextStatus.toUpperCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Update",
          onPress: async () => {
            try {
              await updateTenantStatus(tenant.id, nextStatus);
              Alert.alert("Updated", `Division status changed to ${nextStatus}.`);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to update status.");
            }
          },
        },
      ]
    );
  };

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = t.business_name.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesQuery && matchesStatus;
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
          <Text style={styles.headerTitle}>👑 Super Admin Governance</Text>
          <Text style={styles.headerSubtitle}>
            Clean.et Enterprise Cleaning Divisions & Financial Settlement
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      {/* Impersonation Alert Banner */}
      {impersonatingId && (
        <View style={styles.impersonateBanner}>
          <Ionicons name="eye-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.impersonateText}>
            Currently Inspecting Division #{impersonatingId}
          </Text>
          <TouchableOpacity style={styles.exitImpersonateBtn} onPress={stopImpersonation}>
            <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>Exit View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── TOP NAV TABS ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "overview" && styles.tabItemActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Ionicons name="stats-chart" size={16} color={activeTab === "overview" ? "#60A5FA" : "#94A3B8"} />
          <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "divisions" && styles.tabItemActive]}
          onPress={() => setActiveTab("divisions")}
        >
          <Ionicons name="business" size={16} color={activeTab === "divisions" ? "#60A5FA" : "#94A3B8"} />
          <Text style={[styles.tabText, activeTab === "divisions" && styles.tabTextActive]}>
            Divisions ({tenants.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "payouts" && styles.tabItemActive]}
          onPress={() => setActiveTab("payouts")}
        >
          <Ionicons name="cash" size={16} color={activeTab === "payouts" ? "#60A5FA" : "#94A3B8"} />
          <Text style={[styles.tabText, activeTab === "payouts" && styles.tabTextActive]}>Payouts</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === "overview" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* HERO EXECUTIVE SUMMARY */}
            <LinearGradient colors={["#1E1B4B", "#312E81"]} style={styles.heroCard}>
              <Text style={styles.heroLabel}>ENTERPRISE GROSS MERCHANDISE VALUE</Text>
              <Text style={styles.heroValue}>
                ETB {Number(analytics?.gmv || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
              </Text>
              <View style={{ flexDirection: "row", marginTop: 12, gap: 10 }}>
                <View style={styles.heroMiniStat}>
                  <Text style={styles.heroMiniLabel}>DIVISIONS ACTIVE</Text>
                  <Text style={styles.heroMiniVal}>{analytics?.tenants?.active ?? tenants.length}</Text>
                </View>
                <View style={styles.heroMiniStat}>
                  <Text style={styles.heroMiniLabel}>FIELD CREW</Text>
                  <Text style={styles.heroMiniVal}>{analytics?.total_staff ?? 0}</Text>
                </View>
                <View style={styles.heroMiniStat}>
                  <Text style={styles.heroMiniLabel}>TOTAL CLIENTS</Text>
                  <Text style={styles.heroMiniVal}>{analytics?.total_customers ?? 0}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Quick Actions Grid */}
            <View style={{ flexDirection: "row", gap: 10, marginVertical: 14 }}>
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: "#059669" }]}
                onPress={() => {
                  setModalVisible(true);
                  setActiveTab("divisions");
                }}
              >
                <Ionicons name="add-circle" size={24} color="#FFF" />
                <Text style={styles.quickActionText}>+ Add Cleaning Division</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: "#2563EB" }]}
                onPress={() => setActiveTab("payouts")}
              >
                <Ionicons name="calculator-outline" size={24} color="#FFF" />
                <Text style={styles.quickActionText}>View Payout Reports</Text>
              </TouchableOpacity>
            </View>

            {/* System Divisions List Preview */}
            <Text style={styles.sectionHeaderTitle}>🏢 Enterprise Service Divisions</Text>
            {tenants.map((tenant) => (
              <View key={tenant.id} style={styles.divisionPreviewCard}>
                <View style={styles.divisionIconBox}>
                  <Ionicons name="business" size={20} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 14 }}>
                    {tenant.business_name}
                  </Text>
                  <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                    Sectors: {(tenant.categories_enabled || ["car-washing"]).join(", ")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: tenant.status === "active" ? "#10B98122" : "#EF444422" },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: tenant.status === "active" ? "#34D399" : "#F87171",
                    }}
                  >
                    {tenant.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── TAB 2: DIVISIONS ── */}
        {activeTab === "divisions" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Search & Action Bar */}
            <View style={styles.actionBar}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search division by name..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addBtnText}>+ Division</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {(["ALL", "active", "suspended"] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setStatusFilter(st)}
                  style={[
                    styles.filterChip,
                    statusFilter === st && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === st && styles.filterChipTextActive,
                    ]}
                  >
                    {st.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Divisions Roster Cards */}
            {filteredTenants.map((t, idx) => {
              const manager = t.users && t.users.length > 0 ? t.users[0] : null;

              return (
                <Animated.View key={t.id} entering={FadeInRight.delay(idx * 50)}>
                  <View style={styles.card}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={styles.avatarBox}>
                          <Ionicons name="business" size={20} color="#60A5FA" />
                        </View>
                        <View>
                          <Text style={styles.cardTitle}>{t.business_name}</Text>
                          <Text style={styles.cardSub}>Division ID #{t.id}</Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: t.status === "active" ? "#10B98122" : "#EF444422" },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: t.status === "active" ? "#34D399" : "#F87171",
                          }}
                        >
                          {t.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Manager Contact Details */}
                    <View style={styles.managerDetailsRow}>
                      <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700" }}>
                        DEPARTMENT DIVISION MANAGER
                      </Text>
                      <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "800", marginTop: 2 }}>
                        👤 {manager ? manager.name : "Unassigned"}
                      </Text>
                      <Text style={{ color: "#CBD5E1", fontSize: 11, marginTop: 1 }}>
                        📧 {manager ? manager.email : "No Email"} {manager?.phone ? `• 📞 ${manager.phone}` : ""}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F655" }]}
                        onPress={() => setInspectTenant(t)}
                      >
                        <Ionicons name="eye-outline" size={14} color="#60A5FA" />
                        <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                          Inspect
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: t.status === "active" ? "#EF444422" : "#10B98122",
                            borderColor: t.status === "active" ? "#EF444455" : "#10B98155",
                          },
                        ]}
                        onPress={() => handleToggleStatus(t)}
                      >
                        <Ionicons
                          name={t.status === "active" ? "pause-circle-outline" : "play-circle-outline"}
                          size={14}
                          color={t.status === "active" ? "#F87171" : "#34D399"}
                        />
                        <Text
                          style={{
                            color: t.status === "active" ? "#F87171" : "#34D399",
                            fontSize: 11,
                            fontWeight: "700",
                            marginLeft: 4,
                          }}
                        >
                          {t.status === "active" ? "Suspend" : "Activate"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {/* ── TAB 3: PAYOUTS ── */}
        {activeTab === "payouts" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <View>
                <Text style={styles.sectionHeaderTitle}>💰 Division Financial Settlements</Text>
                <Text style={{ color: "#94A3B8", fontSize: 11 }}>
                  Monthly Gross Merchandise Value & Commission Settlements
                </Text>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                onPress={async () => {
                  try {
                    await generatePayouts();
                    Alert.alert("Generated", "Monthly payout reports generated.");
                  } catch (e: any) {
                    Alert.alert("Error", e.message || "Failed to generate payouts.");
                  }
                }}
              >
                <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>+ Generate Reports</Text>
              </TouchableOpacity>
            </View>

            {payouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>No Payout Reports Generated</Text>
                <Text style={styles.emptySub}>
                  Tap "+ Generate Reports" to process division monthly settlements.
                </Text>
              </View>
            ) : (
              payouts.map((p) => (
                <View key={p.id} style={styles.payoutCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 14 }}>
                      {p.tenant?.business_name || `Division #${p.tenant_id}`}
                    </Text>
                    <Text style={{ color: "#34D399", fontWeight: "800", fontSize: 14 }}>
                      ETB {Number(p.net_payout).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                    <Text style={{ color: "#94A3B8", fontSize: 11 }}>
                      Gross: ETB {Number(p.gross_amount).toLocaleString()}
                    </Text>
                    <Text style={{ color: "#94A3B8", fontSize: 11 }}>
                      Rate: {p.commission_rate}%
                    </Text>
                    <Text style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700" }}>
                      Status: {p.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* ── 👁️ INSPECT DIVISION MODAL ── */}
      <Modal visible={!!inspectTenant} transparent animationType="fade" onRequestClose={() => setInspectTenant(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{inspectTenant?.business_name}</Text>
                <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Division ID #{inspectTenant?.id}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectTenant(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Division Operating Status</Text>
                <Text
                  style={{
                    color: inspectTenant?.status === "active" ? "#34D399" : "#F87171",
                    fontSize: 15,
                    fontWeight: "800",
                    marginTop: 2,
                  }}
                >
                  🟢 {inspectTenant?.status.toUpperCase()}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Authorized Cleaning Sectors</Text>
                <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "700", marginTop: 2 }}>
                  {(inspectTenant?.categories_enabled || ["car-washing"]).join(", ")}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Department Manager Credentials</Text>
                {inspectTenant?.users && inspectTenant.users.length > 0 ? (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                      👤 {inspectTenant.users[0].name}
                    </Text>
                    <Text style={{ color: "#CBD5E1", fontSize: 12, marginTop: 2 }}>
                      📧 Email: {inspectTenant.users[0].email}
                    </Text>
                    {inspectTenant.users[0].phone && (
                      <Text style={{ color: "#CBD5E1", fontSize: 12, marginTop: 1 }}>
                        📞 Phone: {inspectTenant.users[0].phone}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>No manager assigned.</Text>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setInspectTenant(null)}>
              <Text style={styles.closeBtnText}>Close Inspection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── ➕ REGISTER CLEANING DIVISION MODAL ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>+ Register Cleaning Division</Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  Set up new internal department and assign primary Division Manager credentials
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Division Business Name *</Text>
                <TextInput
                  placeholder="e.g. Clean.et Car Washing Division"
                  placeholderTextColor="#64748B"
                  value={form.business_name}
                  onChangeText={(t) => setForm({ ...form, business_name: t })}
                  style={styles.textInput}
                />
              </View>

              <Text style={styles.inputLabel}>Select Authorized Cleaning Sectors *</Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                {DEFAULT_SECTOR_OPTIONS.map((sec) => {
                  const isSel = form.categories_enabled.includes(sec.id);
                  return (
                    <TouchableOpacity
                      key={sec.id}
                      onPress={() => toggleSector(sec.id)}
                      style={[
                        styles.sectorOptionCard,
                        isSel && { borderColor: sec.color, backgroundColor: `${sec.color}15` },
                      ]}
                    >
                      <Ionicons name={sec.icon as any} size={20} color={sec.color} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}>{sec.title}</Text>
                        <Text style={{ color: "#94A3B8", fontSize: 10, marginTop: 1 }}>{sec.subtitle}</Text>
                      </View>
                      <Ionicons
                        name={isSel ? "checkbox" : "square-outline"}
                        size={20}
                        color={isSel ? sec.color : "#64748B"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Manager Credentials Form */}
              <View style={styles.managerFormSection}>
                <Text style={styles.managerSectionTitle}>
                  👤 DEPARTMENT DIVISION MANAGER CREDENTIALS
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Manager Full Name *</Text>
                  <TextInput
                    placeholder="e.g. Abebe Bikila"
                    placeholderTextColor="#64748B"
                    value={form.admin_name}
                    onChangeText={(t) => setForm({ ...form, admin_name: t })}
                    style={styles.textInput}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Manager Email *</Text>
                    <TextInput
                      placeholder="manager@clean.et"
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={form.admin_email}
                      onChangeText={(t) => setForm({ ...form, admin_email: t })}
                      style={styles.textInput}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      placeholder="+251911223344"
                      placeholderTextColor="#64748B"
                      keyboardType="phone-pad"
                      value={form.admin_phone}
                      onChangeText={(t) => setForm({ ...form, admin_phone: t })}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { marginTop: 10 }]}>
                  <Text style={styles.inputLabel}>Initial Account Password *</Text>
                  <TextInput
                    placeholder="Enter initial login password"
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    value={form.admin_password}
                    onChangeText={(t) => setForm({ ...form, admin_password: t })}
                    style={styles.textInput}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleCreateDivision}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                    Register Division
                  </Text>
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#F8FAFC" },
  headerSubtitle: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  refreshBtn: { padding: 6 },
  impersonateBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  impersonateText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  exitImpersonateBtn: { backgroundColor: "#1D4ED8", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    gap: 8,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabItemActive: { backgroundColor: "#334155" },
  tabText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#FFF" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 16, borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: "#4338CA" },
  heroLabel: { fontSize: 11, fontWeight: "800", color: "#A5B4FC", textTransform: "uppercase" },
  heroValue: { fontSize: 24, fontWeight: "900", color: "#FFF", marginTop: 4 },
  heroMiniStat: { flex: 1, backgroundColor: "rgba(255, 255, 255, 0.08)", padding: 8, borderRadius: 8 },
  heroMiniLabel: { fontSize: 9, fontWeight: "700", color: "#C7D2FE" },
  heroMiniVal: { fontSize: 14, fontWeight: "800", color: "#FFF", marginTop: 2 },
  quickActionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  quickActionText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: "800", color: "#FFF", marginBottom: 10 },
  divisionPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  divisionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#3B82F622",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actionBar: { flexDirection: "row", marginBottom: 12, gap: 10 },
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
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  addBtnText: { color: "#FFF", fontWeight: "700", marginLeft: 4, fontSize: 13 },
  filterChip: { backgroundColor: "#1E293B", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  filterChipActive: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  filterChipText: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  filterChipTextActive: { color: "#FFF" },
  card: { backgroundColor: "#1E293B", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#334155" },
  avatarBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#3B82F622", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  cardSub: { color: "#94A3B8", fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  managerDetailsRow: { backgroundColor: "#0F172A", padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: "#334155" },
  cardActions: { flexDirection: "row", marginTop: 10, gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  payoutCard: { backgroundColor: "#1E293B", padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { color: "#FFF", fontSize: 16, fontWeight: "800", marginTop: 10 },
  emptySub: { color: "#94A3B8", fontSize: 12, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 20, maxHeight: "90%", borderWidth: 1, borderColor: "#334155" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#F8FAFC" },
  detailSection: { backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  detailLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase" },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#CBD5E1", marginBottom: 6 },
  textInput: { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155" },
  sectorOptionCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#334155" },
  managerFormSection: { marginTop: 10, backgroundColor: "#0F172A", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#334155" },
  managerSectionTitle: { fontSize: 11, fontWeight: "800", color: "#34D399", marginBottom: 10 },
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#059669", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
});
