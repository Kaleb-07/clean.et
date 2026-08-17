import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";

import API from "../../src/api/client";

/* ─── TYPES ─────────────────────────────────────────────────────────────── */
interface Invoice {
  id: number;
  booking_id: number | null;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  issued_at: string | null;
  due_at: string | null;
  booking?: {
    sector?: { name: string };
    customer?: { user?: { name: string; email?: string; phone?: string }; name?: string };
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#64748B",
  sent: "#3B82F6",
  paid: "#10B981",
  overdue: "#EF4444",
  cancelled: "#475569",
};

/* ─── INVOICE CARD ───────────────────────────────────────────────────────── */
function InvoiceCard({
  invoice,
  onInspect,
  onQuickPay,
}: {
  invoice: Invoice;
  onInspect: () => void;
  onQuickPay: () => void;
}) {
  const color = STATUS_COLORS[invoice.status] ?? "#64748B";
  const formattedDate = invoice.issued_at
    ? new Date(invoice.issued_at).toLocaleDateString("en-ET", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not Issued";

  const customerName =
    invoice.booking?.customer?.user?.name ||
    invoice.booking?.customer?.name ||
    "Customer Account";

  const isPaid = invoice.status === "paid";

  return (
    <Animated.View entering={FadeInDown}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onInspect}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.invoiceNum}>
                INV-{String(invoice.id).padStart(4, "0")}
              </Text>
              {invoice.booking?.sector && (
                <View style={styles.sectorBadge}>
                  <Text style={styles.sectorBadgeText}>
                    {invoice.booking.sector.name}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.customerText}>{customerName}</Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: `${color}22`, borderColor: `${color}55` },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusText, { color }]}>
                {invoice.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.amountText}>
              {invoice.currency || "ETB"}{" "}
              {Number(invoice.amount).toLocaleString("en-ET", {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
            <Text style={styles.dateText}>Issued: {formattedDate}</Text>
            {invoice.due_at && (
              <Text style={styles.dateText}>
                · Due: {new Date(invoice.due_at).toLocaleDateString("en-ET")}
              </Text>
            )}
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.miniActionBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F655" }]}
              onPress={onInspect}
            >
              <Ionicons name="eye-outline" size={14} color="#60A5FA" />
              <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                Inspect
              </Text>
            </TouchableOpacity>

            {!isPaid && (
              <TouchableOpacity
                style={[styles.miniActionBtn, { backgroundColor: "#10B98122", borderColor: "#10B98155" }]}
                onPress={onQuickPay}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color="#34D399" />
                <Text style={{ color: "#34D399", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                  Mark Paid
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function AdminInvoices() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  // Selected Invoice Modal State
  const [inspectInvoice, setInspectInvoice] = useState<Invoice | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await API.get("/invoices");
      setInvoices(res.data.data ?? []);
    } catch (e) {
      console.log("Invoice load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (invoiceId: number, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await API.put(`/admin/invoices/${invoiceId}/status`, { status: newStatus });
      setInvoices((prev) =>
        prev.map((i) => (i.id === invoiceId ? { ...i, status: newStatus as any } : i))
      );
      if (inspectInvoice && inspectInvoice.id === invoiceId) {
        setInspectInvoice((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
      Alert.alert("Updated", `Invoice #${invoiceId} status marked as ${newStatus.toUpperCase()}.`);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to update invoice status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const FILTER_KEYS = ["all", "paid", "sent", "draft", "overdue", "cancelled"];

  const filteredInvoices = invoices.filter((inv) => {
    const matchesFilter = filter === "all" || inv.status === filter;
    const invNum = `INV-${String(inv.id).padStart(4, "0")}`.toLowerCase();
    const custName = (
      inv.booking?.customer?.user?.name ||
      inv.booking?.customer?.name ||
      ""
    ).toLowerCase();
    const sector = (inv.booking?.sector?.name || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      invNum.includes(query) || custName.includes(query) || sector.includes(query);

    return matchesFilter && matchesSearch;
  });

  const totalCollected = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const pendingAmount = invoices
    .filter((i) => i.status === "sent" || i.status === "draft" || i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
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
          <Text style={styles.title}>Invoicing & Billing</Text>
          <Text style={styles.subtitle}>
            {invoices.length} Total Platform Invoices Recorded
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadInvoices}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Revenue Financial Summary Hero */}
        <LinearGradient
          colors={["#1E1B4B", "#312E81"]}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Total Revenue Collected</Text>
              <Text style={styles.heroValue}>
                ETB {totalCollected.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="receipt" size={24} color="#10B981" />
            </View>
          </View>

          <View style={styles.heroSubRow}>
            <View style={styles.subStatPill}>
              <Text style={styles.subStatLabel}>Pending Balance:</Text>
              <Text style={styles.subStatValue}>
                ETB {pendingAmount.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {overdueCount > 0 && (
              <View style={[styles.subStatPill, { backgroundColor: "#EF444422", borderColor: "#EF444455" }]}>
                <Text style={[styles.subStatLabel, { color: "#F87171" }]}>
                  ⚠️ {overdueCount} Overdue
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Search & Filter Section */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Invoice #, Customer, or Sector..."
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

        {/* Status Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_KEYS.map((key) => {
            const isActive = filter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {key.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Invoices List */}
        {loading && invoices.length === 0 ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} size="large" />
        ) : filteredInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>No Invoices Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? "Try refining your search term." : "No invoices registered under this status."}
            </Text>
          </View>
        ) : (
          filteredInvoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onInspect={() => setInspectInvoice(inv)}
              onQuickPay={() => handleUpdateStatus(inv.id, "paid")}
            />
          ))
        )}
      </ScrollView>

      {/* ─── 👁️ INVOICE INSPECTION & PAYMENT STATUS MODAL ─── */}
      <Modal
        visible={!!inspectInvoice}
        animationType="fade"
        transparent
        onRequestClose={() => setInspectInvoice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Invoice #INV-{String(inspectInvoice?.id ?? 0).padStart(4, "0")}
                </Text>
                <Text style={{ color: "#60A5FA", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Official Billing Receipt
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectInvoice(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {inspectInvoice && (
              <ScrollView style={{ maxHeight: 440 }}>
                {/* Status Indicator Banner */}
                <View
                  style={[
                    styles.statusBanner,
                    {
                      backgroundColor: `${STATUS_COLORS[inspectInvoice.status]}22`,
                      borderColor: `${STATUS_COLORS[inspectInvoice.status]}55`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBannerText,
                      { color: STATUS_COLORS[inspectInvoice.status] },
                    ]}
                  >
                    ● STATUS: {inspectInvoice.status.toUpperCase()}
                  </Text>
                </View>

                {/* Amount Box */}
                <View style={styles.detailCardSection}>
                  <Text style={styles.detailLabel}>Invoice Total Amount</Text>
                  <Text style={styles.detailAmount}>
                    {inspectInvoice.currency || "ETB"}{" "}
                    {Number(inspectInvoice.amount).toLocaleString("en-ET", {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>

                {/* Customer Account Info */}
                <View style={styles.detailCardSection}>
                  <Text style={styles.detailLabel}>Billed Customer Account</Text>
                  <View style={styles.infoBox}>
                    <Ionicons name="person" size={20} color="#60A5FA" style={{ marginRight: 8 }} />
                    <View>
                      <Text style={styles.infoName}>
                        {inspectInvoice.booking?.customer?.user?.name ||
                          inspectInvoice.booking?.customer?.name ||
                          "Customer Account"}
                      </Text>
                      <Text style={styles.infoSub}>
                        {inspectInvoice.booking?.customer?.user?.email || "No email available"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Booking & Service Sector Info */}
                <View style={styles.detailCardSection}>
                  <Text style={styles.detailLabel}>Service Dispatch Reference</Text>
                  <Text style={{ color: "#F8FAFC", fontSize: 13, fontWeight: "600" }}>
                    Sector: {inspectInvoice.booking?.sector?.name || "Standard Clean"}
                  </Text>
                  <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                    Booking Reference ID #{inspectInvoice.booking_id || "N/A"}
                  </Text>
                </View>

                {/* Date Breakdown */}
                <View style={styles.detailCardSection}>
                  <Text style={styles.detailLabel}>Issuance & Due Dates</Text>
                  <Text style={{ color: "#E2E8F0", fontSize: 12 }}>
                    Issued: {inspectInvoice.issued_at ? new Date(inspectInvoice.issued_at).toLocaleString() : "N/A"}
                  </Text>
                  <Text style={{ color: "#E2E8F0", fontSize: 12, marginTop: 2 }}>
                    Due Date: {inspectInvoice.due_at ? new Date(inspectInvoice.due_at).toLocaleDateString() : "N/A"}
                  </Text>
                </View>

                {/* Status Update Actions */}
                <Text style={[styles.detailLabel, { marginTop: 10 }]}>Update Invoice Payment Status:</Text>
                <View style={styles.statusActionRow}>
                  <TouchableOpacity
                    style={[styles.statusOptionBtn, { backgroundColor: "#10B98122", borderColor: "#10B981" }]}
                    onPress={() => handleUpdateStatus(inspectInvoice.id, "paid")}
                    disabled={isUpdatingStatus}
                  >
                    <Text style={{ color: "#34D399", fontWeight: "700", fontSize: 11 }}>Paid</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statusOptionBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F6" }]}
                    onPress={() => handleUpdateStatus(inspectInvoice.id, "sent")}
                    disabled={isUpdatingStatus}
                  >
                    <Text style={{ color: "#60A5FA", fontWeight: "700", fontSize: 11 }}>Sent</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statusOptionBtn, { backgroundColor: "#EF444422", borderColor: "#EF4444" }]}
                    onPress={() => handleUpdateStatus(inspectInvoice.id, "overdue")}
                    disabled={isUpdatingStatus}
                  >
                    <Text style={{ color: "#F87171", fontWeight: "700", fontSize: 11 }}>Overdue</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statusOptionBtn, { backgroundColor: "#47556922", borderColor: "#475569" }]}
                    onPress={() => handleUpdateStatus(inspectInvoice.id, "cancelled")}
                    disabled={isUpdatingStatus}
                  >
                    <Text style={{ color: "#94A3B8", fontWeight: "700", fontSize: 11 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                {/* Send Payment Reminder Button */}
                <TouchableOpacity
                  style={styles.reminderBtn}
                  onPress={() => Alert.alert("Reminder Sent", `Payment reminder email sent to customer.`)}
                >
                  <Ionicons name="mail-unread-outline" size={16} color="#FFF" />
                  <Text style={{ color: "#FFF", fontWeight: "700", marginLeft: 6, fontSize: 12 }}>
                    Send Payment Reminder Email
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setInspectInvoice(null)}
            >
              <Text style={styles.closeBtnText}>Close Inspection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  subtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  refreshBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 13,
    color: "#DBEAFE",
    fontWeight: "500",
  },
  heroValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  heroSubRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  subStatPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subStatLabel: {
    fontSize: 11,
    color: "#CBD5E1",
    marginRight: 4,
  },
  subStatValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchInput: {
    flex: 1,
    color: "#F8FAFC",
    marginLeft: 8,
    fontSize: 13,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#3B82F6",
  },
  filterText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#FFF",
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  invoiceNum: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
  sectorBadge: {
    backgroundColor: "#334155",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectorBadgeText: {
    fontSize: 10,
    color: "#60A5FA",
    fontWeight: "700",
  },
  customerText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  amountText: {
    color: "#F8FAFC",
    fontWeight: "800",
    fontSize: 15,
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    color: "#94A3B8",
    fontSize: 11,
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  miniActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 20,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  statusBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: "center",
  },
  statusBannerText: {
    fontWeight: "800",
    fontSize: 12,
  },
  detailCardSection: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  detailLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: "#10B981",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  infoName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  infoSub: {
    fontSize: 11,
    color: "#94A3B8",
  },
  statusActionRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    marginTop: 4,
  },
  statusOptionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  reminderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 12,
  },
  closeBtn: {
    backgroundColor: "#334155",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  closeBtnText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
