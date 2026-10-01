import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import API from "../../../src/api/client";
import { useAuth } from "../../../contexts/AuthContext";
import { useColors } from "../../../hooks/useColors";
import { useLanguage } from "../../../contexts/LanguageContext";

/* ─── TYPES ─────────────────────────────────────────────────────────────── */
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
  currency: string;
  booking_date?: string;
  booking_time?: string;
  address?: string;
  service?: { name: string; price: number; sub_center?: string };
  tenant?: { id: number; business_name: string; plan?: string };
  customer?: { name?: string; email?: string; phone?: string; user?: { name?: string; phone?: string; email?: string } };
  staff?: { id: number; role_title: string; name?: string; phone?: string; user?: { name: string } };
}

interface StaffMember {
  id: number;
  role_title: string;
  availability_status?: string;
  user?: { name: string; email?: string; phone?: string };
}

const LIFECYCLE_KEYS: { key: BookingStatus; labelKey: string; icon: string; color: string }[] = [
  { key: "pending", labelKey: "stage_received", icon: "time-outline", color: "#FBBF24" },
  { key: "confirmed", labelKey: "stage_confirmed", icon: "checkmark-circle-outline", color: "#60A5FA" },
  { key: "driver_assigned", labelKey: "stage_assigned", icon: "person-add-outline", color: "#818CF8" },
  { key: "in_progress", labelKey: "stage_cleaning", icon: "play-circle-outline", color: "#C084FC" },
  { key: "completed", labelKey: "stage_completed", icon: "checkmark-done-circle-outline", color: "#34D399" },
  { key: "invoiced", labelKey: "stage_invoiced", icon: "document-text-outline", color: "#2DD4BF" },
];

function getNextStepAction(currentStatus: string, t: (k: string) => string): { next: BookingStatus; label: string; icon: string; color: string } | null {
  switch (currentStatus) {
    case "pending":
      return { next: "confirmed", label: t("confirm_order_action"), icon: "checkmark-circle", color: "#3B82F6" };
    case "confirmed":
      return { next: "driver_assigned", label: t("dispatch_crew_action"), icon: "flash", color: "#6366F1" };
    case "driver_assigned":
    case "picked_up":
      return { next: "in_progress", label: t("start_cleaning_action"), icon: "play", color: "#A855F7" };
    case "in_progress":
      return { next: "completed", label: t("mark_completed_action"), icon: "checkmark-done", color: "#10B981" };
    case "completed":
      return { next: "invoiced", label: t("generate_invoice_action"), icon: "document-text", color: "#14B8A6" };
    default:
      return null;
  }
}

function formatBookingDate(dateStr?: string): string {
  if (!dateStr) return "Today";
  try {
    const raw = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = raw.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);

      const today = new Date();
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const isTomorrow =
        tomorrow.getFullYear() === year &&
        tomorrow.getMonth() === month &&
        tomorrow.getDate() === day;

      const formatted = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      if (isToday) return `Today (${formatted})`;
      if (isTomorrow) return `Tomorrow (${formatted})`;
      return formatted;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export default function AdminBookings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colors = useColors();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const isSuperAdmin = user?.role === "super_admin";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [subCenterFilter, setSubCenterFilter] = useState<string>("ALL");
  const [assignModal, setAssignModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "danger" } | null>(null);
  const [inspectBooking, setInspectBooking] = useState<Booking | null>(null);

  const triggerNotification = (message: string, type: "success" | "danger" = "success") => {
    setNotification({ message, type });
    Alert.alert(type === "success" ? "Success" : "Notification", message);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.allSettled([
        API.get("/bookings"),
        API.get("/staff"),
      ]);

      if (bRes.status === "fulfilled") setBookings(bRes.value.data?.data ?? bRes.value.data ?? []);
      if (sRes.status === "fulfilled") setStaff(sRes.value.data?.data ?? sRes.value.data ?? []);
    } catch (e) {
      console.log("Error loading bookings data:", e);
    } finally {
      setLoading(false);
    }
  };

  const refreshStaff = async () => {
    setLoadingStaff(true);
    try {
      const sRes = await API.get("/staff");
      setStaff(sRes.data?.data ?? sRes.data ?? []);
    } catch (e) {
      console.log("Error refreshing staff:", e);
    } finally {
      setLoadingStaff(false);
    }
  };

  const openAssignModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedStaffId(booking.staff?.id || null);
    setAssignModal(true);
    refreshStaff();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAssignCrew = async () => {
    if (!selectedBooking || !selectedStaffId) {
      triggerNotification("Please select a field technician from roster.", "danger");
      return;
    }

    setAssigning(true);
    try {
      await API.post(`/bookings/${selectedBooking.id}/assign`, { staff_id: selectedStaffId });
      await API.patch(`/bookings/${selectedBooking.id}/status`, { status: "driver_assigned" });
      const assignedTech = staff.find((s) => s.id === selectedStaffId);
      const techName = assignedTech?.user?.name || `Tech #${selectedStaffId}`;
      triggerNotification(`⚡ Crew "${techName}" dispatched & status set to DRIVER ASSIGNED for Booking #${selectedBooking.id}!`, "success");
      setAssignModal(false);
      setSelectedBooking(null);
      setSelectedStaffId(null);
      loadData();
    } catch (e: any) {
      triggerNotification(`Assignment Error: ${e?.response?.data?.message || "Failed to assign crew member."}`, "danger");
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (bookingId: number, newStatus: string) => {
    try {
      await API.patch(`/bookings/${bookingId}/status`, { status: newStatus });
      triggerNotification(`Status updated: Job #${bookingId} is now ${newStatus.toUpperCase().replace("_", " ")}!`, "success");
      loadData();
    } catch (e: any) {
      triggerNotification(`Status Error: ${e?.response?.data?.message || "Failed to update job status."}`, "danger");
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const statusMatch = filterStatus === "ALL" || (b.status || "").toLowerCase() === filterStatus.toLowerCase();
    const subCenter = (b.service as any)?.sub_center || "";
    const subCenterMatch = subCenterFilter === "ALL" || subCenter === subCenterFilter;
    return statusMatch && subCenterMatch;
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
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isSuperAdmin ? `👑 ${t("platform_global_dispatch")}` : `⚡ ${t("company_dispatch_center")}`}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? `${bookings.length} ${t("multi_tenant_bookings_count")}`
              : `${bookings.length} ${t("incoming_jobs_for")} ${user?.tenant?.business_name || "Company"}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Ionicons name="refresh" size={18} color={isSuperAdmin ? "#3B82F6" : "#10B981"} />
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
        {/* ── HERO BANNER ── */}
        <LinearGradient
          colors={isSuperAdmin ? ["#1E1B4B", "#312E81"] : ["#064E3B", "#047857"]}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>
                {isSuperAdmin ? t("platform_dispatch_command_queue") : t("company_field_dispatch")}
              </Text>
              <Text style={styles.heroValue}>{bookings.length} {t("total_job_orders")}</Text>
            </View>
            <View style={[styles.heroIconBox, !isSuperAdmin && { backgroundColor: "rgba(52, 211, 153, 0.2)", borderColor: "rgba(52, 211, 153, 0.4)" }]}>
              <Ionicons name="calendar" size={24} color="#34D399" />
            </View>
          </View>
        </LinearGradient>

        {/* ── 🏢 SUB-CENTER BRANCH FILTERS ── */}
        {!isSuperAdmin && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[
                { id: "ALL", label: t("all_sub_centers") },
                { id: "corporate-fleet", label: "🚛 Fleet Wash" },
                { id: "mobile-doorstep", label: "🏠 Doorstep Rig" },
                { id: "valet-pickup", label: "🚗 Valet Pickup" },
                { id: "bay-wash", label: "🧼 Station Bay" },
                { id: "exterior-facade", label: "🏙️ Facade Glass" },
                { id: "interior-deep", label: "🧹 Deep Sanitizer" },
              ].map((sub) => {
                const isSel = subCenterFilter === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => setSubCenterFilter(sub.id)}
                    style={[
                      styles.subCenterTab,
                      isSel && styles.subCenterTabActive,
                    ]}
                  >
                    <Text style={[styles.subCenterTabText, isSel && styles.subCenterTabTextActive]}>
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ── STATUS FILTER TABS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { id: "ALL", label: t("filter_all") },
              { id: "pending", label: t("filter_received") },
              { id: "in_progress", label: t("filter_in_progress") },
              { id: "completed", label: t("filter_completed") },
              { id: "cancelled", label: t("cancel_action") },
            ].map((st) => {
              const isSel = filterStatus === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  onPress={() => setFilterStatus(st.id)}
                  style={[
                    styles.filterTab,
                    isSel && styles.filterTabActive,
                    isSel && !isSuperAdmin && { backgroundColor: "#059669", borderColor: "#10B981" },
                  ]}
                >
                  <Text style={[styles.filterTabText, isSel && styles.filterTabTextActive]}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ── BOOKINGS LIST ── */}
        {loading && bookings.length === 0 ? (
          <ActivityIndicator color={isSuperAdmin ? "#3B82F6" : "#10B981"} size="large" style={{ marginTop: 40 }} />
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.subtext} />
            <Text style={styles.emptyTitle}>{t("no_orders_matching")}</Text>
            <Text style={styles.emptySub}>{t("no_orders_matching_sub")}</Text>
          </View>
        ) : (
          filteredBookings.map((b, index) => {
            const customerName = b.customer?.name || b.customer?.user?.name || "Client";
            const customerPhone = b.customer?.phone || b.customer?.user?.phone || "";
            const staffName = b.staff?.name || b.staff?.user?.name || t("unassigned_label");
            const serviceName = b.service?.name || "Service Clean";
            const price = b.price || b.service?.price || 0;
            const subCenterTag = (b.service as any)?.sub_center ? (b.service as any).sub_center.replace("-", " ").toUpperCase() : null;

            return (
              <Animated.View key={b.id} entering={FadeInDown.delay(index * 30)}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => setInspectBooking(b)} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobTitle}>#{b.id} · {serviceName}</Text>
                      {subCenterTag && (
                        <View style={{ alignSelf: "flex-start", backgroundColor: "#10B98122", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginVertical: 4, borderWidth: 1, borderColor: "#10B98155" }}>
                          <Text style={{ color: "#34D399", fontSize: 9, fontWeight: "800" }}>🏢 {subCenterTag}</Text>
                        </View>
                      )}
                      <Text style={styles.jobCustomer}>👤 {customerName} {customerPhone ? `(📞 ${customerPhone})` : ""}</Text>
                      {b.address && <Text style={styles.jobAddress}>📍 {b.address}</Text>}
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.jobPrice}>ETB {Number(price).toLocaleString("en-ET", { minimumFractionDigits: 2 })}</Text>
                      <View style={[styles.statusPill, !isSuperAdmin && { backgroundColor: "#10B98122", borderColor: "#10B98155" }]}>
                        <Text style={[styles.statusPillText, !isSuperAdmin && { color: "#34D399" }]}>{(b.status || "pending").toUpperCase().replace("_", " ")}</Text>
                      </View>
                    </View>
                  </View>

                  {/* ── SCHEDULE & DISPATCH METADATA (FULL WIDTH) ── */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Ionicons name="calendar-outline" size={13} color="#60A5FA" />
                      <Text style={styles.metaDateText} numberOfLines={1}>
                        {formatBookingDate(b.booking_date)}{b.booking_time ? ` at ${b.booking_time}` : ""}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.miniBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F655" }]}
                        onPress={() => setInspectBooking(b)}
                      >
                        <Ionicons name="eye-outline" size={14} color="#60A5FA" />
                        <Text style={[styles.miniBtnText, { color: "#60A5FA" }]}>Inspect</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.miniBtn, !isSuperAdmin && { backgroundColor: "#059669" }]}
                        onPress={() => openAssignModal(b)}
                      >
                        <Ionicons name="flash" size={14} color="#FFF" />
                        <Text style={styles.miniBtnText}>Dispatch</Text>
                      </TouchableOpacity>

                      {(() => {
                        const stepAction = getNextStepAction(b.status || "pending", t);
                        if (!stepAction) return null;
                        return (
                          <TouchableOpacity
                            style={[styles.miniBtn, { backgroundColor: stepAction.color }]}
                            onPress={() => {
                              if (stepAction.next === "driver_assigned") {
                                openAssignModal(b);
                              } else {
                                handleUpdateStatus(b.id, stepAction.next);
                              }
                            }}
                          >
                            <Ionicons name={stepAction.icon as any} size={14} color="#FFF" />
                            <Text style={styles.miniBtnText}>{stepAction.label}</Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                  </View>

                  {/* ── ACTION BUTTONS TOOLBAR (ORDERED HORIZONTALLY) ── */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.miniBtn, { backgroundColor: colors.isDark ? "#3B82F622" : "#DBEAFE", borderColor: "#3B82F655", borderWidth: 1 }]}
                      onPress={() => setInspectBooking(b)}
                    >
                      <Ionicons name="eye-outline" size={13} color="#3B82F6" />
                      <Text style={[styles.miniBtnText, { color: "#3B82F6" }]} numberOfLines={1}>
                        {t("view_details")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.miniBtn, { backgroundColor: isSuperAdmin ? "#2563EB" : "#059669" }]}
                      onPress={() => {
                        setSelectedBooking(b);
                        setSelectedStaffId(b.staff?.id || null);
                        setAssignModal(true);
                      }}
                    >
                      <Ionicons name="flash" size={13} color="#FFF" />
                      <Text style={styles.miniBtnText} numberOfLines={1}>
                        {t("assign_crew")}
                      </Text>
                    </TouchableOpacity>

                    {(() => {
                      const stepAction = getNextStepAction(b.status || "pending", t);
                      if (!stepAction) return null;
                      return (
                        <TouchableOpacity
                          style={[styles.miniBtn, { backgroundColor: stepAction.color }]}
                          onPress={() => {
                            if (stepAction.next === "driver_assigned") {
                              setSelectedBooking(b);
                              setSelectedStaffId(b.staff?.id || null);
                              setAssignModal(true);
                            } else {
                              handleUpdateStatus(b.id, stepAction.next);
                            }
                          }}
                        >
                          <Ionicons name={stepAction.icon as any} size={13} color="#FFF" />
                          <Text style={styles.miniBtnText} numberOfLines={1}>
                            {stepAction.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* ── 🔍 INSPECT BOOKING MODAL ── */}
      <Modal visible={!!inspectBooking} transparent animationType="slide" onRequestClose={() => setInspectBooking(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t("booking_record_title")} #{inspectBooking?.id}</Text>
                <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 2 }}>
                  🏢 {inspectBooking?.tenant?.business_name || "Platform Direct"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectBooking(null)}>
                <Ionicons name="close" size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {/* Lifecycle Interactive Bar */}
              <View style={[styles.detailSection, { backgroundColor: colors.isDark ? "#0F172A" : colors.surface }]}>
                <Text style={styles.detailLabel}>{t("job_lifecycle_stage")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
                    {LIFECYCLE_KEYS.map((step, idx) => {
                      const isCurrent = inspectBooking?.status === step.key;
                      const currentIdx = LIFECYCLE_KEYS.findIndex((s) => s.key === inspectBooking?.status);
                      const isPast = currentIdx !== -1 && idx < currentIdx;

                      return (
                        <TouchableOpacity
                          key={step.key}
                          onPress={() => {
                            if (!inspectBooking) return;
                            handleUpdateStatus(inspectBooking.id, step.key);
                            setInspectBooking({ ...inspectBooking, status: step.key });
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: isCurrent ? step.color + "33" : isPast ? (colors.isDark ? "#1E293B" : "#E2E8F0") : (colors.isDark ? "#0F172A" : colors.card),
                            borderColor: isCurrent ? step.color : isPast ? "#34D39955" : colors.cardBorder,
                            borderWidth: 1.5,
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 16,
                            gap: 4,
                          }}
                        >
                          <Ionicons
                            name={isPast ? "checkmark-circle" : (step.icon as any)}
                            size={12}
                            color={isCurrent ? step.color : isPast ? "#34D399" : colors.subtext}
                          />
                          <Text
                            style={{
                              color: isCurrent ? colors.text : isPast ? colors.text : colors.subtext,
                              fontSize: 10,
                              fontWeight: isCurrent ? "800" : "600",
                            }}
                          >
                            {t(step.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t("service_scope")}</Text>
                <Text style={styles.detailValue}>{inspectBooking?.service?.name || "Service Clean"}</Text>
                {(inspectBooking?.service as any)?.sub_center && (
                  <Text style={{ color: "#34D399", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                    🏢 Sub-Center: {(inspectBooking?.service as any).sub_center.replace("-", " ").toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t("customer_details")}</Text>
                <Text style={styles.detailValue}>
                  👤 {inspectBooking?.customer?.name || inspectBooking?.customer?.user?.name || "Client Account"}
                </Text>
                <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>
                  📞 {inspectBooking?.customer?.phone || inspectBooking?.customer?.user?.phone || "No phone listed"}
                </Text>
                <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 1 }}>
                  ✉️ {inspectBooking?.customer?.email || inspectBooking?.customer?.user?.email || "No email listed"}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Schedule & Location</Text>
                <Text style={styles.detailValue}>
                  🗓️ {formatBookingDate(inspectBooking?.booking_date)} {inspectBooking?.booking_time ? `at ${inspectBooking?.booking_time}` : ""}
                </Text>
                <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2 }}>
                  📍 {inspectBooking?.address || "On-Site Service Station"}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t("assigned_dispatch_crew")}</Text>
                <Text style={styles.detailValue}>
                  👷 {inspectBooking?.staff?.name || inspectBooking?.staff?.user?.name || t("unassigned_label")}
                </Text>
                {inspectBooking?.staff?.role_title && (
                  <Text style={{ color: "#A78BFA", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                    💼 Designation: {inspectBooking.staff.role_title}
                  </Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>{t("total_booking_amount")}</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#34D399", marginTop: 2 }}>
                  ETB {Number(inspectBooking?.price || inspectBooking?.service?.price || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setInspectBooking(null)}>
                <Text style={styles.closeBtnText}>{t("cancel_action")}</Text>
              </TouchableOpacity>

              {(() => {
                const stepAction = inspectBooking ? getNextStepAction(inspectBooking.status || "pending", t) : null;
                if (!stepAction) return null;
                return (
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: stepAction.color }]}
                    onPress={() => {
                      if (!inspectBooking) return;
                      if (stepAction.next === "driver_assigned") {
                        setInspectBooking(null);
                        openAssignModal(inspectBooking);
                      } else {
                        handleUpdateStatus(inspectBooking.id, stepAction.next);
                        setInspectBooking({ ...inspectBooking, status: stepAction.next });
                      }
                    }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 12 }}>
                      ⚡ {stepAction.label}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── ⚡ CREW ASSIGNMENT MODAL ── */}
      <Modal visible={assignModal} transparent animationType="slide" onRequestClose={() => setAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t("dispatch_field_crew")}</Text>
                <Text style={{ color: isSuperAdmin ? "#60A5FA" : "#34D399", fontSize: 12, marginTop: 2, fontWeight: "700" }}>
                  Booking #{selectedBooking?.id} · {selectedBooking?.service?.name}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  onPress={refreshStaff}
                  disabled={loadingStaff}
                  style={{ padding: 6, backgroundColor: "#0F172A", borderRadius: 8, borderWidth: 1, borderColor: "#334155" }}
                >
                  {loadingStaff
                    ? <ActivityIndicator size={16} color="#34D399" />
                    : <Ionicons name="refresh" size={18} color="#34D399" />
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAssignModal(false)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={{ color: colors.subtext, fontSize: 12, marginBottom: 10 }}>
              {t("select_technician_dispatch")}
            </Text>

            <ScrollView style={{ maxHeight: 280 }}>
              {loadingStaff ? (
                <View style={{ alignItems: "center", paddingVertical: 30 }}>
                  <ActivityIndicator color="#34D399" size="large" />
                  <Text style={{ color: "#94A3B8", marginTop: 10, fontSize: 12 }}>Loading roster...</Text>
                </View>
              ) : staff.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 20 }}>
                  No technicians on roster. Go to Staff screen to register crew.
                </Text>
              ) : (
                staff.map((s) => {
                  const staffName = s.user?.name || `Tech #${s.id}`;
                  const isSelected = selectedStaffId === s.id;
                  const avail = (s as any).availability_status || "available";
                  const availLabel = avail === "on_job" ? "🔵 On Job" : avail === "off_duty" ? "🔴 Off Duty" : "🟢 Available";
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedStaffId(s.id)}
                      style={[styles.staffSelectItem, isSelected && styles.staffSelectItemActive]}
                    >
                      <View style={styles.staffAvatarBox}>
                        <Text style={{ color: "#A78BFA", fontWeight: "800" }}>{staffName.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{staffName}</Text>
                          <Text style={{ fontSize: 9, fontWeight: "800", color: avail === "off_duty" ? "#F87171" : avail === "on_job" ? "#60A5FA" : "#34D399" }}>
                            {availLabel}
                          </Text>
                        </View>
                        <Text style={{ color: colors.subtext, fontSize: 11 }}>💼 {s.role_title || t("field_tech_fallback")}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={isSelected ? "#10B981" : colors.subtext}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setAssignModal(false)} disabled={assigning}>
                <Text style={styles.closeBtnText}>{t("cancel_action")}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitBtn, !isSuperAdmin && { backgroundColor: "#059669" }]} onPress={handleAssignCrew} disabled={assigning}>
                {assigning ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: "800" }}>{t("confirm_crew_dispatch")}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */
const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      gap: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.isDark ? "#334155" : colors.cardBorder,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    headerSubtitle: { fontSize: 11, color: colors.subtext, marginTop: 1 },
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
    filterTab: {
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterTabActive: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
    filterTabText: { color: colors.subtext, fontSize: 11, fontWeight: "700" },
    filterTabTextActive: { color: "#FFF" },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    jobTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
    jobCustomer: { fontSize: 12, color: colors.subtext, marginTop: 2 },
    jobAddress: { fontSize: 11, color: colors.subtext, marginTop: 2 },
    jobPrice: { fontSize: 15, fontWeight: "800", color: "#34D399" },
    statusPill: {
      backgroundColor: "#3B82F622",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
      borderWidth: 1,
      borderColor: "#3B82F655",
    },
    statusPillText: { fontSize: 10, color: "#60A5FA", fontWeight: "800" },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      gap: 8,
    },
    metaBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 6,
    },
    metaDateText: { fontSize: 11, fontWeight: "700", color: colors.text },
    metaCrewText: { fontSize: 11, fontWeight: "500", color: colors.subtext },
    cardActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      marginTop: 10,
      width: "100%",
    },
    jobMeta: { fontSize: 11, color: colors.subtext },
    miniBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#2563EB",
      paddingHorizontal: 4,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    miniBtnText: { color: "#FFF", fontSize: 10.5, fontWeight: "800", textAlign: "center" },
    emptyState: { alignItems: "center", paddingVertical: 50 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 10 },
    emptySub: { fontSize: 12, color: colors.subtext, marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)", justifyContent: "center", padding: 16 },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      maxHeight: "90%",
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    staffSelectItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 10,
    },
    staffSelectItemActive: { borderColor: "#10B981", backgroundColor: "#10B98115" },
    staffAvatarBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#A78BFA22", alignItems: "center", justifyContent: "center" },
    closeBtn: {
      flex: 1,
      backgroundColor: colors.isDark ? "#334155" : colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    closeBtnText: { color: colors.text, fontWeight: "700" },
    submitBtn: { flex: 1, backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
    subCenterTab: {
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    subCenterTabActive: { backgroundColor: "#059669", borderColor: "#34D399" },
    subCenterTabText: { color: colors.subtext, fontSize: 10, fontWeight: "700" },
    subCenterTabTextActive: { color: "#FFF", fontWeight: "800" },
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
    toastBannerSuccess: { backgroundColor: "#059669" },
    toastBannerDanger: { backgroundColor: "#DC2626" },
    toastText: { flex: 1, color: "#FFF", fontWeight: "700", fontSize: 12 },
    detailSection: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    detailLabel: { fontSize: 10, color: colors.subtext, fontWeight: "700", textTransform: "uppercase" },
    detailValue: { fontSize: 13, fontWeight: "700", color: colors.text, marginTop: 2 },
  });
