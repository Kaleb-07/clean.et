import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
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
    customer?: { user?: { name: string } };
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft:     "#64748b",
  sent:      "#3b82f6",
  paid:      "#10b981",
  overdue:   "#ef4444",
  cancelled: "#475569",
};

/* ─── INVOICE CARD ───────────────────────────────────────────────────────── */
function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const color = STATUS_COLORS[invoice.status] ?? "#64748b";
  const formattedDate = invoice.issued_at
    ? new Date(invoice.issued_at).toLocaleDateString("en-ET", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <Animated.View entering={FadeInDown}>
      <BlurView intensity={30} tint="dark" style={styles.card}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.invoiceNum}>INV-{String(invoice.id).padStart(4, "0")}</Text>
            {invoice.booking?.sector && (
              <Text style={styles.sectorText}>{invoice.booking.sector.name}</Text>
            )}
            {invoice.booking?.customer?.user && (
              <Text style={styles.customerText}>
                {invoice.booking.customer.user.name}
              </Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <View style={[styles.statusPill, { borderColor: `${color}55` }]}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusText, { color }]}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Text>
            </View>
            <Text style={styles.amountText}>
              {invoice.currency} {Number(invoice.amount).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color="#475569" />
          <Text style={styles.dateText}>Issued: {formattedDate}</Text>
          {invoice.due_at && (
            <Text style={styles.dateText}>
              · Due: {new Date(invoice.due_at).toLocaleDateString("en-ET")}
            </Text>
          )}
        </View>
      </BlurView>
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
  const [filter, setFilter] = useState("all");

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

  const FILTER_KEYS = ["all", "draft", "sent", "paid", "overdue"];
  const filtered =
    filter === "all" ? invoices : invoices.filter((i) => i.status === filter);

  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <LinearGradient colors={["#07070f", "#0f1028", "#1a1445"]} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Invoices</Text>
            <Text style={styles.subtitle}>{invoices.length} total</Text>
          </View>
        </View>

        {/* Revenue Summary */}
        <BlurView intensity={30} tint="dark" style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total Collected (ETB)</Text>
            <Text style={styles.summaryValue}>
              ETB {totalRevenue.toLocaleString("en-ET")}
            </Text>
          </View>
          <View style={styles.summaryIcon}>
            <Ionicons name="receipt-outline" size={24} color="#a78bfa" />
          </View>
        </BlurView>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[
                styles.filterChip,
                filter === key && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === key && styles.filterTextActive,
                ]}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Invoice List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
          />
        }
      >
        {loading && invoices.length === 0 && (
          <ActivityIndicator color="#8b5cf6" style={{ marginTop: 40 }} />
        )}

        {!loading && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#1e293b" />
            <Text style={styles.emptyText}>No invoices found</Text>
          </View>
        )}

        {filtered.map((inv) => (
          <InvoiceCard key={inv.id} invoice={inv} />
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  subtitle: { color: "#64748b", fontSize: 12, marginTop: 2 },

  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  summaryLabel: { color: "#94a3b8", fontSize: 12 },
  summaryValue: { color: "#fff", fontSize: 24, fontWeight: "bold", marginTop: 4 },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  filterChipActive: {
    backgroundColor: "rgba(139,92,246,0.25)",
    borderColor: "rgba(139,92,246,0.5)",
  },
  filterText: { color: "#64748b", fontSize: 13 },
  filterTextActive: { color: "#c4b5fd", fontWeight: "600" },

  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  invoiceNum: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sectorText: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  customerText: { color: "#64748b", fontSize: 11, marginTop: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },
  amountText: { color: "#a78bfa", fontWeight: "700", fontSize: 14 },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { color: "#475569", fontSize: 11 },

  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { color: "#334155", fontSize: 15 },
});
