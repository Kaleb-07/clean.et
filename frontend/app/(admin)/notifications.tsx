import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInRight, FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSuperAdmin } from "../../hooks/useSuperAdmin";
import { useAuth } from "../../contexts/AuthContext";
import { useColors } from "../../hooks/useColors";
import { useLanguage } from "../../contexts/LanguageContext";
import API, { apiFetch } from "../../src/api/client";

type SuperCategory = "ALL" | "DIVISIONS" | "BOOKINGS" | "PAYMENTS" | "SYSTEM";
type SectorCategory =
  | "ALL"
  | "BOOKINGS"
  | "DISPATCH"
  | "CUSTOMERS"
  | "PAYMENTS"
  | "SYSTEM";

interface NotificationItem {
  id: string;
  realId?: number;
  category: string;
  title: string;
  message: string;
  senderRole: string;
  senderName: string;
  time: string;
  unread: boolean;
  icon: string;
  iconColor: string;
  actionRoute?: string;
}

const TYPE_MAP: Record<
  string,
  { category: string; icon: string; iconColor: string }
> = {
  booking_update: {
    category: "BOOKINGS",
    icon: "calendar",
    iconColor: "#F59E0B",
  },
  booking_confirmed: {
    category: "BOOKINGS",
    icon: "checkmark-circle",
    iconColor: "#34D399",
  },
  payment: { category: "PAYMENTS", icon: "cash", iconColor: "#FBBF24" },
  system: { category: "SYSTEM", icon: "megaphone", iconColor: "#F472B6" },
  profile: { category: "SYSTEM", icon: "person-circle", iconColor: "#60A5FA" },
};

function mapRealNotification(n: any): NotificationItem {
  const meta = TYPE_MAP[n.type] || TYPE_MAP.system;
  return {
    id: `real-${n.id}`,
    realId: n.id,
    category: meta.category,
    title: n.title,
    message: n.body,
    senderRole: "Platform Notification",
    senderName: "Clean.et",
    time: n.created_at
      ? new Date(n.created_at).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Recent",
    unread: n.is_unread,
    icon: meta.icon,
    iconColor: meta.iconColor,
    actionRoute: n.data?.screen,
  };
}

export default function AdminNotifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colors = useColors();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const {
    auditLogs,
    isLoading: superLoading,
    onRefresh: superRefresh,
  } = useSuperAdmin();

  const isSuperAdmin = user?.role === "super_admin";
  const divisionTitle = user?.tenant?.business_name || "Sector Division";

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsList, setNotificationsList] = useState<
    NotificationItem[]
  >([]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      if (isSuperAdmin) {
        let realNotifs: NotificationItem[] = [];
        try {
          const res = await apiFetch<any>("/notifications");
          const items = res?.data ?? [];
          realNotifs = items.map(mapRealNotification);
        } catch (e) {
          console.log("Failed to load real notifications:", e);
        }

        const auditNotifs: NotificationItem[] = auditLogs.map((log) => ({
          id: `audit-${log.id}`,
          category: log.action?.includes("TENANT")
            ? "DIVISIONS"
            : log.action?.includes("PAYOUT")
              ? "PAYMENTS"
              : "SYSTEM",
          title: log.action || "Administrative Audit Event",
          message:
            log.description || "Performed platform administrative action.",
          senderRole: "System Audit",
          senderName: log.user?.name || "Governance Engine",
          time: log.created_at
            ? new Date(log.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Recent",
          unread: false,
          icon: "shield-checkmark",
          iconColor: "#60A5FA",
          actionRoute: "/(admin)/tenants",
        }));

        setNotificationsList([...realNotifs, ...auditNotifs]);
      } else {
        const [nRes, bRes, stRes, cRes] = await Promise.allSettled([
          apiFetch<any>("/notifications"),
          apiFetch<any>("/bookings"),
          apiFetch<any>("/staff"),
          apiFetch<any>("/customers"),
        ]);

        const realNotifs: NotificationItem[] =
          nRes.status === "fulfilled"
            ? (nRes.value?.data ?? []).map(mapRealNotification)
            : [];
        const bookings: any[] =
          bRes.status === "fulfilled"
            ? (bRes.value?.data ?? bRes.value ?? [])
            : [];
        const staff: any[] =
          stRes.status === "fulfilled"
            ? (stRes.value?.data ?? stRes.value ?? [])
            : [];
        const customers: any[] =
          cRes.status === "fulfilled"
            ? (cRes.value?.data ?? cRes.value ?? [])
            : [];

        const generatedNotifs: NotificationItem[] = [...realNotifs];

        // 1. Booking alerts for this sector
        bookings.forEach((b: any) => {
          const isPending = b.status === "pending";
          const isCompleted = b.status === "completed";
          const clientName =
            b.customer?.name || b.customer?.user?.name || "Client Account";

          if (isPending) {
            generatedNotifs.push({
              id: `b-pending-${b.id}`,
              category: "BOOKINGS",
              title: `⚡ New Booking Dispatch Request #${b.id}`,
              message: `${clientName} booked ${b.service?.name || "Clean Service"} for ${b.booking_date || "Today"}. Crew unassigned.`,
              senderRole: "Customer Booking",
              senderName: clientName,
              time: b.booking_time
                ? `${b.booking_date} at ${b.booking_time}`
                : "Recently",
              unread: true,
              icon: "calendar",
              iconColor: "#F59E0B",
              actionRoute: "/(admin)/(tabs)/bookings",
            });
          }

          if (b.staff) {
            generatedNotifs.push({
              id: `b-crew-${b.id}`,
              category: "DISPATCH",
              title: `👷 Technician Dispatched to Job #${b.id}`,
              message: `${b.staff?.name || "Field Tech"} assigned to fulfill ${b.service?.name || "Service Clean"}.`,
              senderRole: "Dispatch Control",
              senderName: b.staff?.name || "Technician",
              time: b.booking_date || "Today",
              unread: false,
              icon: "construct",
              iconColor: "#34D399",
              actionRoute: "/(admin)/(tabs)/bookings",
            });
          }

          if (isCompleted) {
            generatedNotifs.push({
              id: `b-completed-${b.id}`,
              category: "BOOKINGS",
              title: `✅ Job #${b.id} Completed & Verified`,
              message: `Service finished successfully. Gross value: ETB ${Number(b.price || b.service?.price || 0).toLocaleString()}.`,
              senderRole: "Field Service",
              senderName: clientName,
              time: b.booking_date || "Today",
              unread: false,
              icon: "checkmark-circle",
              iconColor: "#10B981",
              actionRoute: "/(admin)/(tabs)/bookings",
            });
          }
        });

        // 2. Customer alerts for this sector
        customers.slice(0, 3).forEach((c: any) => {
          generatedNotifs.push({
            id: `c-reg-${c.id}`,
            category: "CUSTOMERS",
            title: `👤 Account Activity: ${c.name || "Customer"}`,
            message: `Account active in ${divisionTitle}. Phone: ${c.phone || c.user?.phone || "N/A"}.`,
            senderRole: "Customer Directory",
            senderName: c.name || "Customer",
            time: "Active Account",
            unread: false,
            icon: "people",
            iconColor: "#60A5FA",
            actionRoute: "/(admin)/customers",
          });
        });

        setNotificationsList(generatedNotifs);
      }
    } catch (e) {
      console.log("Error loading notifications:", e);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, auditLogs, divisionTitle]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    if (isSuperAdmin) await superRefresh();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    setNotificationsList((prev) =>
      prev.map((item) => ({ ...item, unread: false }))
    );
    try {
      await API.post("/notifications/read-all");
    } catch (e) {
      console.log("Error marking notifications as read:", e);
    }
  };

  const categories: string[] = isSuperAdmin
    ? ["ALL", "DIVISIONS", "BOOKINGS", "PAYMENTS", "SYSTEM"]
    : ["ALL", "BOOKINGS", "DISPATCH", "CUSTOMERS", "PAYMENTS", "SYSTEM"];

  const filtered = notificationsList.filter((item) => {
    const matchesCategory =
      activeCategory === "ALL" || item.category === activeCategory;
    const matchesSearch =
      searchQuery.length === 0 ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.senderName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const unreadCount = notificationsList.filter((n) => n.unread).length;

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
            {isSuperAdmin
              ? `👑 ${t("notifications_alert_center")}`
              : `⚡ ${divisionTitle} ${t("notifications")}`}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? t("notifications_sub_title")
              : `${divisionTitle} · Live Operational Feed`}
          </Text>
        </View>

        {isSuperAdmin ? (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" },
            ]}
            onPress={() => router.push("/(admin)/broadcast")}
          >
            <Ionicons name="megaphone" size={14} color="#FBBF24" />
            <Text
              style={{
                color: "#FBBF24",
                fontSize: 10,
                fontWeight: "800",
                marginLeft: 4,
              }}
            >
              Broadcast
            </Text>
          </TouchableOpacity>
        ) : (
          unreadCount > 0 && (
            <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead}>
              <Text
                style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700" }}
              >
                {t("mark_all_read")}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || superLoading}
            onRefresh={onRefresh}
            tintColor="#60A5FA"
          />
        }
      >
        {/* ── HERO BANNER ── */}
        <LinearGradient
          colors={
            isSuperAdmin ? ["#1E1B4B", "#312E81"] : ["#064E3B", "#047857"]
          }
          style={styles.heroCard}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>
                {isSuperAdmin
                  ? "SYSTEM PRIORITY ALERTS"
                  : `${divisionTitle.toUpperCase()} ALERTS`}
              </Text>
              <Text style={styles.heroValue}>
                {unreadCount} Unread Priority Updates
              </Text>
            </View>

            <View style={styles.unreadBadgePill}>
              <Ionicons
                name="notifications"
                size={14}
                color={isSuperAdmin ? "#F472B6" : "#34D399"}
              />
              <Text
                style={{
                  color: isSuperAdmin ? "#F472B6" : "#34D399",
                  fontWeight: "800",
                  fontSize: 11,
                  marginLeft: 4,
                }}
              >
                LIVE FEED
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── CATEGORY FILTER CHIPS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 14 }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.filterChip,
                  activeCategory === cat && styles.filterChipActive,
                  activeCategory === cat &&
                    !isSuperAdmin && {
                      backgroundColor: "#059669",
                      borderColor: "#10B981",
                    },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeCategory === cat && styles.filterChipTextActive,
                  ]}
                >
                  {cat === "ALL" ? t("filter_all") : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── SEARCH BOX ── */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.subtext} />
          <TextInput
            placeholder="Search alerts, events, dispatch..."
            placeholderTextColor={colors.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* ── NOTIFICATIONS STREAM ── */}
        {loading && notificationsList.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color={isSuperAdmin ? "#60A5FA" : "#34D399"}
            />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color={colors.subtext}
            />
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptySub}>
              {t("no_notifications_msg")}
            </Text>
          </View>
        ) : (
          filtered.map((item, idx) => (
            <Animated.View
              key={item.id}
              entering={FadeInRight.delay(idx * 30)}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (item.actionRoute) {
                    router.push(item.actionRoute as any);
                  }
                }}
                style={[
                  styles.notifCard,
                  item.unread && styles.notifCardUnread,
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: `${item.iconColor}22` },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={item.iconColor}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      {item.unread && <View style={styles.unreadDot} />}
                    </View>

                    <Text style={styles.notifMessage}>{item.message}</Text>

                    <View style={styles.notifFooter}>
                      <Text style={styles.notifSender}>
                        {item.senderName} • {item.senderRole}
                      </Text>
                      <Text style={styles.notifTime}>{item.time}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
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
    headerTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    headerSubtitle: { fontSize: 10, color: colors.subtext, marginTop: 1 },
    markReadBtn: {
      backgroundColor: colors.isDark ? "#334155" : colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    scrollContent: { padding: 16, paddingBottom: 40 },
    heroCard: {
      padding: 16,
      borderRadius: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    heroLabel: {
      fontSize: 9,
      fontWeight: "800",
      color: "#DBEAFE",
      textTransform: "uppercase",
    },
    heroValue: { fontSize: 18, fontWeight: "900", color: "#FFF", marginTop: 2 },
    unreadBadgePill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.3)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    filterChip: {
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterChipActive: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
    filterChipText: { color: colors.subtext, fontSize: 11, fontWeight: "700" },
    filterChipTextActive: { color: "#FFF" },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 12,
    },
    searchInput: { flex: 1, color: colors.text, marginLeft: 8, fontSize: 12 },
    loadingBox: { padding: 40, alignItems: "center", justifyContent: "center" },
    emptyState: { alignItems: "center", paddingVertical: 40 },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 10 },
    emptySub: {
      color: colors.subtext,
      fontSize: 12,
      marginTop: 4,
      textAlign: "center",
      paddingHorizontal: 20,
    },
    notifCard: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    notifCardUnread: { backgroundColor: colors.card, borderColor: "#3B82F6" },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    notifTitle: { color: colors.text, fontWeight: "800", fontSize: 13, flex: 1 },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#3B82F6",
      marginLeft: 6,
    },
    notifMessage: {
      color: colors.subtext,
      fontSize: 12,
      marginTop: 4,
      lineHeight: 16,
    },
    notifFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    notifSender: { color: colors.subtext, fontSize: 10, fontWeight: "700" },
    notifTime: { color: colors.subtext, fontSize: 10 },
  });
