import React, { useState, useEffect, useCallback } from "react";
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
import API, { apiFetch } from "../../src/api/client";

type SuperCategory = "ALL" | "DIVISIONS" | "BOOKINGS" | "PAYMENTS" | "SYSTEM";
type SectorCategory = "ALL" | "BOOKINGS" | "DISPATCH" | "CUSTOMERS" | "SYSTEM";

interface NotificationItem {
  id: string;
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

export default function AdminNotifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { auditLogs, isLoading: superLoading, onRefresh: superRefresh } = useSuperAdmin();

  const isSuperAdmin = user?.role === "super_admin";
  const divisionTitle = user?.tenant?.business_name || "Sector Division";

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      if (isSuperAdmin) {
        // Super Admin Global Notifications & System Logs
        const baseNotifications: NotificationItem[] = [
          {
            id: "sys-1",
            category: "DIVISIONS",
            title: "New Division Onboarding Request",
            message: "Addis Ababa Downtown Division registered and requested sector licensing.",
            senderRole: "Division Admin",
            senderName: "Kaleb Tadesse",
            time: "10 mins ago",
            unread: true,
            icon: "business",
            iconColor: "#60A5FA",
            actionRoute: "/(admin)/tenants",
          },
          {
            id: "sys-2",
            category: "BOOKINGS",
            title: "High-Value Corporate Fleet Order",
            message: "Commercial Fleet Division requested 15-vehicle sanitization package.",
            senderRole: "Corporate Account",
            senderName: "Abebe Bikila",
            time: "25 mins ago",
            unread: true,
            icon: "calendar",
            iconColor: "#34D399",
            actionRoute: "/(admin)/(tabs)/bookings",
          },
          {
            id: "sys-3",
            category: "PAYMENTS",
            title: "Monthly Settlement Payout Disbursed",
            message: "Settlement generated for Division #4 (ETB 45,200.00).",
            senderRole: "Automated Payroll",
            senderName: "Finance Gateway",
            time: "1 hour ago",
            unread: false,
            icon: "cash",
            iconColor: "#FBBF24",
            actionRoute: "/(admin)/invoices",
          },
          {
            id: "sys-4",
            category: "SYSTEM",
            title: "Global Platform Commission Updated",
            message: "Executive updated base commission fee structure to 10%.",
            senderRole: "Super Admin",
            senderName: "Executive Governance",
            time: "3 hours ago",
            unread: false,
            icon: "options",
            iconColor: "#EC4899",
            actionRoute: "/(admin)/system",
          },
        ];

        const auditNotifs: NotificationItem[] = auditLogs.map((log) => ({
          id: `audit-${log.id}`,
          category: log.action?.includes("TENANT")
            ? "DIVISIONS"
            : log.action?.includes("PAYOUT")
            ? "PAYMENTS"
            : "SYSTEM",
          title: log.action || "Administrative Audit Event",
          message: log.description || "Performed platform administrative action.",
          senderRole: "System Audit",
          senderName: log.user?.name || "Governance Engine",
          time: log.created_at
            ? new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Recent",
          unread: false,
          icon: "shield-checkmark",
          iconColor: "#60A5FA",
          actionRoute: "/(admin)/system",
        }));

        setNotificationsList([...baseNotifications, ...auditNotifs]);
      } else {
        // Sector Admin Real Live Operational Alerts
        const [bRes, stRes, cRes] = await Promise.allSettled([
          apiFetch<any>("/bookings"),
          apiFetch<any>("/staff"),
          apiFetch<any>("/customers"),
        ]);

        const bookings: any[] = bRes.status === "fulfilled" ? (bRes.value?.data ?? bRes.value ?? []) : [];
        const staff: any[] = stRes.status === "fulfilled" ? (stRes.value?.data ?? stRes.value ?? []) : [];
        const customers: any[] = cRes.status === "fulfilled" ? (cRes.value?.data ?? cRes.value ?? []) : [];

        const generatedNotifs: NotificationItem[] = [];

        // 1. Booking alerts for this sector
        bookings.forEach((b: any) => {
          const isPending = b.status === "pending";
          const isCompleted = b.status === "completed";
          const clientName = b.customer?.name || b.customer?.user?.name || "Client Account";

          if (isPending) {
            generatedNotifs.push({
              id: `b-pending-${b.id}`,
              category: "BOOKINGS",
              title: `⚡ New Booking Dispatch Request #${b.id}`,
              message: `${clientName} booked ${b.service?.name || "Clean Service"} for ${b.booking_date || "Today"}. Crew unassigned.`,
              senderRole: "Customer Booking",
              senderName: clientName,
              time: b.booking_time ? `${b.booking_date} at ${b.booking_time}` : "Recently",
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

        // 3. System / Division operational notices
        generatedNotifs.push({
          id: `sec-system-1`,
          category: "SYSTEM",
          title: `🏢 ${divisionTitle} Operations Status`,
          message: `Roster active with ${staff.length} field technicians and ${bookings.length} recorded orders.`,
          senderRole: "Sector Engine",
          senderName: divisionTitle,
          time: "System Notice",
          unread: false,
          icon: "business",
          iconColor: "#A78BFA",
          actionRoute: "/(admin)/reports",
        });

        setNotificationsList(generatedNotifs);
      }
    } catch (e) {
      console.log("Error loading notifications:", e);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, divisionTitle, auditLogs]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (isSuperAdmin) await superRefresh();
    await loadNotifications();
    setRefreshing(false);
  };

  const markAllRead = () => {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const categories = isSuperAdmin
    ? (["ALL", "DIVISIONS", "BOOKINGS", "PAYMENTS", "SYSTEM"] as SuperCategory[])
    : (["ALL", "BOOKINGS", "DISPATCH", "CUSTOMERS", "SYSTEM"] as SectorCategory[]);

  const filteredNotifications = notificationsList.filter((n) => {
    const matchesCategory = activeCategory === "ALL" || n.category === activeCategory;
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.senderName.toLowerCase().includes(searchQuery.toLowerCase());
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
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isSuperAdmin
              ? "🔔 Enterprise Governance Alerts"
              : `🔔 ${divisionTitle} Notifications`}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? "Global Broadcast Notices, Division Onboarding & System Log Alerts"
              : `Real-time Operational Alerts, Bookings & Dispatch Updates for ${divisionTitle}`}
          </Text>
        </View>

        {isSuperAdmin ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B55" }]}
            onPress={() => router.push("/(admin)/broadcast")}
          >
            <Ionicons name="megaphone" size={14} color="#FBBF24" />
            <Text style={{ color: "#FBBF24", fontSize: 10, fontWeight: "800", marginLeft: 4 }}>Broadcast</Text>
          </TouchableOpacity>
        ) : (
          unreadCount > 0 && (
            <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead}>
              <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700" }}>Mark Read</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing || superLoading} onRefresh={onRefresh} tintColor="#60A5FA" />}
      >
        {/* ── HERO BANNER ── */}
        <LinearGradient
          colors={isSuperAdmin ? ["#1E1B4B", "#312E81"] : ["#064E3B", "#047857"]}
          style={styles.heroCard}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>
                {isSuperAdmin ? "SYSTEM PRIORITY ALERTS" : `${divisionTitle.toUpperCase()} ALERTS`}
              </Text>
              <Text style={styles.heroValue}>{unreadCount} Unread Priority Updates</Text>
            </View>

            <View style={styles.unreadBadgePill}>
              <Ionicons name="notifications" size={14} color={isSuperAdmin ? "#F472B6" : "#34D399"} />
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
                  {cat.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── SEARCH BAR ── */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            placeholder={`Filter ${isSuperAdmin ? "global notices" : divisionTitle + " alerts"} by keyword...`}
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* ── NOTIFICATIONS FEED LIST ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={{ color: "#94A3B8", marginTop: 10, fontSize: 12 }}>Fetching live alerts...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={44} color="#475569" />
            <Text style={styles.emptyTitle}>No Notifications Found</Text>
            <Text style={styles.emptySub}>
              {isSuperAdmin
                ? "All incoming governance alerts and system notices will appear here."
                : `Incoming order, dispatch, and customer alerts for ${divisionTitle} will appear here.`}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((item, idx) => (
            <Animated.View key={item.id || idx} entering={FadeInRight.delay(idx * 30)}>
              <TouchableOpacity
                style={[styles.notifCard, item.unread && styles.notifCardUnread]}
                onPress={() => {
                  if (item.actionRoute) router.push(item.actionRoute as any);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View style={[styles.iconBox, { backgroundColor: `${item.iconColor}22` }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      {item.unread && <View style={styles.unreadDot} />}
                    </View>

                    <Text style={styles.notifMessage}>{item.message}</Text>

                    <View style={styles.notifFooter}>
                      <Text style={styles.notifSender}>
                        👤 {item.senderName} ({item.senderRole})
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
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#F8FAFC" },
  headerSubtitle: { fontSize: 10, color: "#94A3B8", marginTop: 1 },
  markReadBtn: { backgroundColor: "#334155", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 16, borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  heroLabel: { fontSize: 9, fontWeight: "800", color: "#DBEAFE", textTransform: "uppercase" },
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
  filterChip: { backgroundColor: "#1E293B", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  filterChipActive: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  filterChipText: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  filterChipTextActive: { color: "#FFF" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 10, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: "#334155", marginBottom: 12 },
  searchInput: { flex: 1, color: "#F8FAFC", marginLeft: 8, fontSize: 12 },
  loadingBox: { padding: 40, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { color: "#FFF", fontSize: 16, fontWeight: "800", marginTop: 10 },
  emptySub: { color: "#94A3B8", fontSize: 12, marginTop: 4, textAlign: "center", paddingHorizontal: 20 },
  notifCard: { backgroundColor: "#1E293B", padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  notifCardUnread: { backgroundColor: "#1E293B", borderColor: "#3B82F6" },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notifTitle: { color: "#FFF", fontWeight: "800", fontSize: 13, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6", marginLeft: 6 },
  notifMessage: { color: "#CBD5E1", fontSize: 12, marginTop: 4, lineHeight: 16 },
  notifFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#334155" },
  notifSender: { color: "#94A3B8", fontSize: 10, fontWeight: "700" },
  notifTime: { color: "#64748B", fontSize: 10 },
});
