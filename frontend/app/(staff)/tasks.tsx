import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import API from "../../src/api/client";
import { useAuth } from "../../contexts/AuthContext";

/* ─── TYPES ──────────────────────────────────────────────────────────────── */
type BookingStatus =
  | "pending"
  | "confirmed"
  | "driver_assigned"
  | "picked_up"
  | "in_progress"
  | "completed"
  | "invoiced"
  | "cancelled";

interface Booking {
  id: number;
  status: BookingStatus;
  price: number | null;
  booking_date?: string;
  booking_time?: string;
  address?: string;
  notes?: string;
  service?: { name: string; price?: number; sub_center?: string };
  customer?: {
    name?: string;
    phone?: string;
    user?: { name?: string; phone?: string; email?: string };
  };
  staff?: { id: number; role_title: string; user?: { name: string } };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  pending:         { label: "Pending",         color: "#FBBF24", bg: "#FBBF2418", icon: "time-outline" },
  confirmed:       { label: "Confirmed",       color: "#60A5FA", bg: "#60A5FA18", icon: "checkmark-circle-outline" },
  driver_assigned: { label: "Assigned to You", color: "#A78BFA", bg: "#A78BFA18", icon: "person-outline" },
  picked_up:       { label: "Picked Up",       color: "#818CF8", bg: "#818CF818", icon: "car-outline" },
  in_progress:     { label: "In Progress",     color: "#C084FC", bg: "#C084FC18", icon: "play-circle-outline" },
  completed:       { label: "Completed",       color: "#34D399", bg: "#34D39918", icon: "checkmark-done-circle-outline" },
  invoiced:        { label: "Invoiced",        color: "#2DD4BF", bg: "#2DD4BF18", icon: "document-text-outline" },
  cancelled:       { label: "Cancelled",       color: "#F87171", bg: "#F8717118", icon: "close-circle-outline" },
};

const FILTERS = ["ALL", "driver_assigned", "in_progress", "completed", "cancelled"];

/* ─── COMPONENT ──────────────────────────────────────────────────────────── */
export default function StaffTasks() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [inspectBooking, setInspectBooking] = useState<Booking | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      // Load bookings and staff profile in parallel
      const [bRes, stRes] = await Promise.allSettled([
        API.get("/bookings"),
        API.get("/staff"),
      ]);

      // Get all bookings assigned to this user
      const allBookings: Booking[] =
        bRes.status === "fulfilled"
          ? bRes.value.data?.data ?? bRes.value.data ?? []
          : [];

      // Filter to only this staff member's assigned bookings
      const myBookings = allBookings.filter((b) => {
        const staffUserId = b.staff?.user
          ? (b.staff as any)?.user?.id
          : (b as any).staff_user_id;
        const staffProfileId = b.staff?.id;
        // Match by user id OR staff profile id
        return (
          staffUserId === user?.id ||
          (b as any).staff_id === staffProfile?.id ||
          staffProfileId === staffProfile?.id
        );
      });

      setBookings(myBookings);

      // Find this user's staff profile
      if (stRes.status === "fulfilled") {
        const staffList: any[] =
          stRes.value.data?.data ?? stRes.value.data ?? [];
        const mine = staffList.find(
          (s: any) => s.user?.id === user?.id || s.user_id === user?.id
        );
        setStaffProfile(mine ?? null);
      }
    } catch (e) {
      console.log("Error loading staff tasks:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, staffProfile?.id]);

  useEffect(() => {
    loadTasks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const filtered = bookings.filter(
    (b) =>
      filterStatus === "ALL" ||
      (b.status || "").toLowerCase() === filterStatus.toLowerCase()
  );

  const completedCount = bookings.filter((b) => b.status === "completed" || b.status === "invoiced").length;
  const activeCount    = bookings.filter((b) => b.status === "in_progress" || b.status === "driver_assigned").length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>
            {(user?.name || "T").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Task Board</Text>
          <Text style={styles.headerSub}>
            {user?.name || "Technician"} · {staffProfile?.role_title || "Field Tech"}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadTasks}>
          <Ionicons name="refresh" size={18} color="#A78BFA" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A78BFA" />
        }
      >
        {/* ── HERO ── */}
        <LinearGradient colors={["#2D1B69", "#4C1D95"]} style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Your Assigned Jobs</Text>
              <Text style={styles.heroValue}>{bookings.length} Total Tasks</Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="construct" size={24} color="#A78BFA" />
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatNum, { color: "#A78BFA" }]}>{activeCount}</Text>
              <Text style={styles.heroStatLabel}>Active Now</Text>
            </View>
            <View style={[styles.heroStatDivider]} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatNum, { color: "#34D399" }]}>{completedCount}</Text>
              <Text style={styles.heroStatLabel}>Completed</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatNum, { color: "#FBBF24" }]}>
                {bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length}
              </Text>
              <Text style={styles.heroStatLabel}>Upcoming</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── QUALIFICATIONS ── */}
        {staffProfile?.sector_qualifications?.length > 0 && (
          <View style={styles.qualCard}>
            <Text style={styles.qualTitle}>🏅 Your Certifications</Text>
            <View style={styles.qualRow}>
              {staffProfile.sector_qualifications.map((q: string) => (
                <View key={q} style={styles.qualTag}>
                  <Text style={styles.qualTagText}>
                    {q.replace(/-/g, " ").toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── FILTER CHIPS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 2 }}>
            {FILTERS.map((f) => {
              const isActive = filterStatus === f;
              const conf = STATUS_CONFIG[f];
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilterStatus(f)}
                  style={[
                    styles.filterChip,
                    isActive && {
                      backgroundColor: conf ? conf.bg : "rgba(167,139,250,0.15)",
                      borderColor: conf ? conf.color : "#A78BFA",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && { color: conf ? conf.color : "#A78BFA", fontWeight: "800" },
                    ]}
                  >
                    {f === "ALL"
                      ? "ALL TASKS"
                      : (conf?.label || f).toUpperCase().replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ── TASK LIST ── */}
        {loading ? (
          <ActivityIndicator color="#A78BFA" size="large" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={52} color="#475569" />
            <Text style={styles.emptyTitle}>
              {filterStatus === "ALL" ? "No tasks assigned yet" : "No tasks in this category"}
            </Text>
            <Text style={styles.emptySub}>
              Pull down to refresh or check back later.
            </Text>
          </View>
        ) : (
          filtered.map((b, i) => {
            const conf = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
            const customerName =
              b.customer?.name ||
              b.customer?.user?.name ||
              "Client";
            const customerPhone =
              b.customer?.phone ||
              b.customer?.user?.phone ||
              "";
            const serviceName = b.service?.name || "Cleaning Service";
            const price = Number(b.price || b.service?.price || 0);

            return (
              <Animated.View key={b.id} entering={FadeInDown.delay(i * 40)}>
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => setInspectBooking(b)}
                >
                  {/* Status stripe */}
                  <View style={[styles.statusStripe, { backgroundColor: conf.color }]} />

                  <View style={styles.cardBody}>
                    {/* Top row */}
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.jobId}>Job #{b.id}</Text>
                        <Text style={styles.serviceName}>{serviceName}</Text>
                        {b.service?.sub_center && (
                          <View style={styles.subCenterPill}>
                            <Text style={styles.subCenterText}>
                              🏢 {b.service.sub_center.replace(/-/g, " ").toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: conf.bg, borderColor: conf.color + "55" }]}>
                        <Ionicons name={conf.icon as any} size={12} color={conf.color} />
                        <Text style={[styles.statusBadgeText, { color: conf.color }]}>
                          {conf.label}
                        </Text>
                      </View>
                    </View>

                    {/* Details */}
                    <View style={styles.detailRows}>
                      <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={13} color="#64748B" />
                        <Text style={styles.detailText}>
                          {customerName}
                          {customerPhone ? `  ·  📞 ${customerPhone}` : ""}
                        </Text>
                      </View>
                      {b.booking_date && (
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={13} color="#64748B" />
                          <Text style={styles.detailText}>
                            {b.booking_date}
                            {b.booking_time ? `  at  ${b.booking_time}` : ""}
                          </Text>
                        </View>
                      )}
                      {b.address && (
                        <View style={styles.detailRow}>
                          <Ionicons name="location-outline" size={13} color="#64748B" />
                          <Text style={styles.detailText} numberOfLines={1}>
                            {b.address}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.price}>
                        ETB {price.toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                      </Text>
                      <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() => setInspectBooking(b)}
                      >
                        <Ionicons name="eye-outline" size={14} color="#A78BFA" />
                        <Text style={styles.viewBtnText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* ── TASK DETAIL MODAL ── */}
      <Modal
        visible={!!inspectBooking}
        transparent
        animationType="slide"
        onRequestClose={() => setInspectBooking(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Job #{inspectBooking?.id}</Text>
                {(() => {
                  const conf = STATUS_CONFIG[inspectBooking?.status || "pending"];
                  return (
                    <View style={[styles.statusBadge, { backgroundColor: conf.bg, borderColor: conf.color + "55", marginTop: 4 }]}>
                      <Ionicons name={conf.icon as any} size={12} color={conf.color} />
                      <Text style={[styles.statusBadgeText, { color: conf.color }]}>
                        {conf.label}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <TouchableOpacity onPress={() => setInspectBooking(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {/* Service */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>SERVICE</Text>
                <Text style={styles.sectionValue}>
                  {inspectBooking?.service?.name || "Cleaning Service"}
                </Text>
                {inspectBooking?.service?.sub_center && (
                  <Text style={{ color: "#A78BFA", fontSize: 12, marginTop: 3, fontWeight: "700" }}>
                    🏢 {inspectBooking.service.sub_center.replace(/-/g, " ").toUpperCase()}
                  </Text>
                )}
              </View>

              {/* Client */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>CLIENT</Text>
                <Text style={styles.sectionValue}>
                  👤 {inspectBooking?.customer?.name || inspectBooking?.customer?.user?.name || "Client"}
                </Text>
                {(inspectBooking?.customer?.phone || inspectBooking?.customer?.user?.phone) && (
                  <Text style={{ color: "#CBD5E1", fontSize: 13, marginTop: 3 }}>
                    📞 {inspectBooking?.customer?.phone || inspectBooking?.customer?.user?.phone}
                  </Text>
                )}
                {inspectBooking?.customer?.user?.email && (
                  <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
                    ✉️ {inspectBooking.customer.user.email}
                  </Text>
                )}
              </View>

              {/* Schedule */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>SCHEDULE & LOCATION</Text>
                <Text style={styles.sectionValue}>
                  🗓️ {inspectBooking?.booking_date || "TBD"}
                  {inspectBooking?.booking_time ? `  at  ${inspectBooking.booking_time}` : ""}
                </Text>
                {inspectBooking?.address && (
                  <Text style={{ color: "#CBD5E1", fontSize: 13, marginTop: 3 }}>
                    📍 {inspectBooking.address}
                  </Text>
                )}
              </View>

              {/* Notes */}
              {inspectBooking?.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>NOTES</Text>
                  <Text style={{ color: "#CBD5E1", fontSize: 13, lineHeight: 20 }}>
                    {inspectBooking.notes}
                  </Text>
                </View>
              )}

              {/* Payment */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>JOB VALUE</Text>
                <Text style={{ fontSize: 22, fontWeight: "800", color: "#34D399", marginTop: 2 }}>
                  ETB{" "}
                  {Number(
                    inspectBooking?.price || inspectBooking?.service?.price || 0
                  ).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setInspectBooking(null)}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── STYLES ──────────────────────────────────────────────────────────────── */
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
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(167,139,250,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.4)",
  },
  avatarText: { color: "#A78BFA", fontWeight: "800", fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#F8FAFC" },
  headerSub: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  refreshBtn: { padding: 6 },

  scroll: { padding: 16, paddingBottom: 40 },

  hero: { borderRadius: 16, padding: 18, marginBottom: 14 },
  heroRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  heroLabel: { fontSize: 12, color: "#C4B5FD", fontWeight: "500" },
  heroValue: { fontSize: 24, fontWeight: "800", color: "#FFF", marginTop: 2 },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(167,139,250,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.35)",
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    padding: 12,
  },
  heroStatItem: { flex: 1, alignItems: "center" },
  heroStatNum: { fontSize: 20, fontWeight: "800" },
  heroStatLabel: { fontSize: 10, color: "#C4B5FD", marginTop: 2, fontWeight: "600" },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 4 },

  qualCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  qualTitle: { color: "#F8FAFC", fontSize: 13, fontWeight: "700", marginBottom: 10 },
  qualRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  qualTag: {
    backgroundColor: "rgba(167,139,250,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
  },
  qualTagText: { color: "#C4B5FD", fontSize: 10, fontWeight: "700" },

  filterChip: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterChipText: { color: "#64748B", fontSize: 11, fontWeight: "700" },

  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "row",
    overflow: "hidden",
  },
  statusStripe: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  jobId: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  serviceName: { color: "#F8FAFC", fontSize: 15, fontWeight: "800", marginTop: 2 },
  subCenterPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(167,139,250,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
  },
  subCenterText: { color: "#C4B5FD", fontSize: 9, fontWeight: "800" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },

  detailRows: { gap: 5, marginBottom: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { color: "#94A3B8", fontSize: 12, flex: 1 },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  price: { color: "#34D399", fontWeight: "800", fontSize: 14 },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(167,139,250,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
  },
  viewBtnText: { color: "#A78BFA", fontSize: 11, fontWeight: "700" },

  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#F8FAFC", marginTop: 14 },
  emptySub: { fontSize: 12, color: "#64748B", marginTop: 6, textAlign: "center" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#F8FAFC" },
  detailSection: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionValue: { fontSize: 14, fontWeight: "700", color: "#F8FAFC" },
  closeModalBtn: {
    backgroundColor: "#334155",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  closeModalBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});
