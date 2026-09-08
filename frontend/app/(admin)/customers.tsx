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
interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string;
  bookings_count?: number;
}

/* ================= COMPONENT ================= */
export default function AdminCustomers() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerBookingsMap, setCustomerBookingsMap] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [inspectCustomer, setInspectCustomer] = useState<Customer | null>(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [notification, setNotification] = useState<{ message: string; type: "success" | "danger" } | null>(null);

  const triggerNotification = (message: string, type: "success" | "danger" = "success") => {
    setNotification({ message, type });
    Alert.alert(type === "success" ? "Success" : "Notification", message);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  /* ================= LOAD ================= */
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.allSettled([
        API.get("/customers"),
        API.get("/bookings"),
      ]);

      const cData = cRes.status === "fulfilled"
        ? (Array.isArray(cRes.value.data) ? cRes.value.data : (cRes.value.data?.data ?? []))
        : [];
      const bData = bRes.status === "fulfilled"
        ? (Array.isArray(bRes.value.data) ? bRes.value.data : (bRes.value.data?.data ?? []))
        : [];

      const map: Record<number, any[]> = {};
      bData.forEach((b: any) => {
        const cid = b.customer?.id || b.customer_id;
        if (cid) {
          if (!map[cid]) map[cid] = [];
          map[cid].push(b);
        }
      });

      setCustomerBookingsMap(map);
      setCustomers(cData);
    } catch (e) {
      console.log("Error loading customers:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      triggerNotification("Client Full Name is required (minimum 2 characters).", "danger");
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
      if (editingCustomer) {
        await API.put(`/customers/${editingCustomer.id}`, {
          name: form.name.trim(),
          email: form.email ? form.email.trim().toLowerCase() : undefined,
          phone: form.phone ? form.phone.trim() : undefined,
        });
        triggerNotification(`✨ Client profile "${form.name.trim()}" updated successfully!`, "success");
      } else {
        await API.post("/customers", {
          name: form.name.trim(),
          email: form.email ? form.email.trim().toLowerCase() : undefined,
          phone: form.phone ? form.phone.trim() : undefined,
          password: form.password ? form.password.trim() : "password123",
        });
        triggerNotification(`🎉 Client account "${form.name.trim()}" created successfully!`, "success");
      }

      setModalVisible(false);
      setEditingCustomer(null);
      setForm({ name: "", email: "", phone: "", password: "" });
      loadCustomers();
    } catch (e: any) {
      const errorMsg = e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join("\n")
        : e?.response?.data?.message || "Failed to save client.";
      triggerNotification(`Error: ${errorMsg}`, "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================= DELETE ================= */
  const confirmDelete = async () => {
    if (!selectedDeleteId) return;

    setIsDeleting(true);
    try {
      await API.delete(`/customers/${selectedDeleteId}`);
      setDeleteModal(false);
      setSelectedDeleteId(null);
      triggerNotification("🗑️ Client account removed from directory.", "danger");
      loadCustomers();
    } catch (e: any) {
      triggerNotification(`Delete Error: ${e?.response?.data?.message || "Failed to delete client."}`, "danger");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (item: Customer) => {
    setEditingCustomer(item);
    setForm({
      name: item.name,
      email: item.email,
      phone: item.phone || "",
      password: "",
    });
    setModalVisible(true);
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const name = c.name.toLowerCase();
    const email = c.email.toLowerCase();
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
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isSuperAdmin ? "Global Customer Directory" : "🏢 Company Client Directory"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? `${customers.length} Platform Customer Accounts`
              : `${customers.length} Registered Clients for ${user?.tenant?.business_name || "Company"}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadCustomers}>
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
                {isSuperAdmin ? "Platform Customers Overview" : "Company Clients & Walk-in Records"}
              </Text>
              <Text style={styles.heroValue}>{customers.length} Registered Clients</Text>
            </View>
            <View style={[styles.heroIconBox, !isSuperAdmin && { backgroundColor: "rgba(52, 211, 153, 0.2)", borderColor: "rgba(52, 211, 153, 0.4)" }]}>
              <Ionicons name="people" size={24} color="#34D399" />
            </View>
          </View>

          <View style={styles.heroSubRow}>
            <View style={styles.subStatPill}>
              <Text style={styles.subStatLabel}>Client Status:</Text>
              <Text style={styles.subStatValue}>100% Active Client Profiles</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── SEARCH & ACTION BAR ── */}
        <View style={styles.actionBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search client by name, email, or phone..."
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
              setEditingCustomer(null);
              setForm({ name: "", email: "", phone: "", password: "" });
              setModalVisible(true);
            }}
          >
            <Ionicons name="person-add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>{isSuperAdmin ? "+ Add Customer" : "+ Register Walk-in"}</Text>
          </TouchableOpacity>
        </View>

        {/* ── CUSTOMER LIST ── */}
        {loading && customers.length === 0 ? (
          <ActivityIndicator color={isSuperAdmin ? "#3B82F6" : "#10B981"} size="large" style={{ marginTop: 40 }} />
        ) : filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>No Clients Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? "Try refining your search term." : 'Tap "+ Register Walk-in" to add a new client record.'}
            </Text>
          </View>
        ) : (
          filteredCustomers.map((c, index) => {
            const customerJobs = customerBookingsMap[c.id] || [];
            const ordersCount = customerJobs.length || c.bookings_count || 0;

            return (
              <Animated.View key={c.id} entering={FadeInDown.delay(index * 40)}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setInspectCustomer(c)}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.avatarBox, !isSuperAdmin && { backgroundColor: "#10B98122", borderColor: "#10B98155" }]}>
                      <Text style={[styles.avatarText, !isSuperAdmin && { color: "#34D399" }]}>
                        {c.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.customerName}>{c.name}</Text>
                        {ordersCount > 0 && (
                          <View style={{ backgroundColor: "#3B82F622", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: "#60A5FA", fontSize: 10, fontWeight: "800" }}>{ordersCount} Orders</Text>
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
                      onPress={() => openEdit(c)}
                    >
                      <Ionicons name="create-outline" size={14} color="#FBBF24" />
                      <Text style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.miniActionBtn, { backgroundColor: "#EF444422", borderColor: "#EF444455" }]}
                      onPress={() => {
                        setSelectedDeleteId(c.id);
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
      </ScrollView>

      {/* ── 👁️ INSPECT CLIENT & ORDER HISTORY MODAL ── */}
      <Modal visible={!!inspectCustomer} transparent animationType="fade" onRequestClose={() => setInspectCustomer(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{inspectCustomer?.name}</Text>
                <Text style={{ color: isSuperAdmin ? "#60A5FA" : "#34D399", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
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
              const totalSpent = completedJobs.reduce((sum, b) => sum + Number(b.price || b.service?.price || 0), 0);

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
                    <View style={{ flex: 1, backgroundColor: "#0F172A", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#334155" }}>
                      <Text style={{ color: "#94A3B8", fontSize: 10, fontWeight: "800" }}>TOTAL SPENT</Text>
                      <Text style={{ color: "#34D399", fontSize: 15, fontWeight: "800", marginTop: 4 }}>
                        ETB {totalSpent.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    <View style={{ flex: 1, backgroundColor: "#0F172A", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#334155" }}>
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
                      <View key={b.id} style={{ backgroundColor: "#0F172A", padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: "#334155" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 12 }}>#{b.id} · {b.service?.name || "Clean Service"}</Text>
                          <Text style={{ color: "#34D399", fontWeight: "800", fontSize: 12 }}>
                            ETB {Number(b.price || b.service?.price || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                          <Text style={{ color: "#94A3B8", fontSize: 10 }}>🗓️ {b.booking_date || "Today"}</Text>
                          <Text style={{ color: "#60A5FA", fontSize: 10, fontWeight: "800" }}>{(b.status || "pending").toUpperCase()}</Text>
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

      {/* ── ✏️ ADD / EDIT CLIENT MODAL ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingCustomer
                    ? "Edit Client Profile"
                    : isSuperAdmin
                    ? "Add Customer Account"
                    : "Register Walk-in Client"}
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  {isSuperAdmin
                    ? "Register platform customer profile details"
                    : `Register walk-in client for ${user?.tenant?.business_name || "Company"}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Client Full Name *</Text>
                <TextInput
                  placeholder="e.g. Abebe Bikila"
                  placeholderTextColor="#64748B"
                  value={form.name}
                  onChangeText={(t) => setForm({ ...form, name: t })}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  placeholder="e.g. abebe@gmail.com"
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
                  placeholder="e.g. +251911..."
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={(t) => setForm({ ...form, phone: t })}
                  style={styles.textInput}
                />
              </View>

              {!editingCustomer && (
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
                    {editingCustomer ? "Save Updates" : "Register Client"}
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
                Delete Client Account?
              </Text>
              <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 4 }}>
                This will permanently erase this client account from records.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDeleteModal(false)} disabled={isDeleting}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteModalBtn} onPress={confirmDelete} disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: "800" }}>🗑️ Yes, Delete</Text>}
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
  customerName: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  customerEmail: { color: "#CBD5E1", fontSize: 12, marginTop: 1 },
  customerPhone: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  verifiedBadge: {
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
  verifiedText: { color: "#34D399", fontSize: 10, fontWeight: "700" },
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
  closeBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  deleteModalBtn: { flex: 1, backgroundColor: "#EF4444", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
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
});
