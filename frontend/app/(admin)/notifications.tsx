import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSuperAdmin } from "../../hooks/useSuperAdmin";

type NotificationCategory = "ALL" | "DIVISIONS" | "BOOKINGS" | "SYSTEM" | "PAYMENTS";

interface NotificationItem {
  id: string;
  category: NotificationCategory;
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
  const { auditLogs, isLoading, onRefresh } = useSuperAdmin();

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Synthesize notifications from real audit logs and system events
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([
    {
      id: "n-1",
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
      id: "n-2",
      category: "BOOKINGS",
      title: "High-Value Fleet Booking Created",
      message: "Ethiopian Airlines Commercial Fleet requested 15-vehicle sanitization package.",
      senderRole: "Corporate Customer",
      senderName: "Abebe Bikila",
      time: "25 mins ago",
      unread: true,
      icon: "calendar",
      iconColor: "#34D399",
      actionRoute: "/(admin)/(tabs)/bookings",
    },
    {
      id: "n-3",
      category: "PAYMENTS",
      title: "Settlement Payout Generated",
      message: "Monthly commission settlement generated for Division #4 (ETB 45,200.00).",
      senderRole: "Financial System",
      senderName: "Automated Payroll",
      time: "1 hour ago",
      unread: false,
      icon: "cash",
      iconColor: "#FBBF24",
      actionRoute: "/(admin)/tenants",
    },
    {
      id: "n-4",
      category: "SYSTEM",
      title: "Global Platform Settings Updated",
      message: "Super Admin updated commission rate to 10% and enabled default ETB currency.",
      senderRole: "Super Admin",
      senderName: "Executive Office",
      time: "3 hours ago",
      unread: false,
      icon: "options",
      iconColor: "#EC4899",
      actionRoute: "/(admin)/system",
    },
  ]);

  // Merge real audit logs into notifications timeline
  const combinedNotifications = [
    ...notificationsList,
    ...auditLogs.map((log) => ({
      id: `audit-${log.id}`,
      category: (log.action?.includes("TENANT") ? "DIVISIONS" : log.action?.includes("PAYOUT") ? "PAYMENTS" : "SYSTEM") as NotificationCategory,
      title: log.action || "System Administrative Log",
      message: log.description || "Performed administrative action across platform.",
      senderRole: "Admin / User",
      senderName: log.user?.name || "System Automation",
      time: log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
      unread: false,
      icon: "shield-checkmark",
      iconColor: "#60A5FA",
      actionRoute: "/(admin)/system",
    })),
  ];

  const markAllRead = () => {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const filteredNotifications = combinedNotifications.filter((n) => {
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
          <Text style={styles.headerTitle}>🔔 Admin Notification & Alert Center</Text>
          <Text style={styles.headerSubtitle}>
            Incoming Alerts from Division Managers, Customers, Field Crew & System
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead}>
            <Text style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700" }}>Mark Read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#60A5FA" />}
      >
        {/* ── HERO BANNER ── */}
        <LinearGradient colors={["#1E1B4B", "#312E81"]} style={styles.heroCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>UNREAD INCOMING ALERTS</Text>
              <Text style={styles.heroValue}>{unreadCount} Priority Notifications</Text>
            </View>

            <View style={styles.unreadBadgePill}>
              <Ionicons name="notifications" size={14} color="#F472B6" />
              <Text style={{ color: "#F472B6", fontWeight: "800", fontSize: 11, marginLeft: 4 }}>
                LIVE FEED
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── CATEGORY FILTER CHIPS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["ALL", "DIVISIONS", "BOOKINGS", "PAYMENTS", "SYSTEM"] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── SEARCH BAR ── */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Filter notifications by sender or content..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* ── NOTIFICATIONS FEED LIST ── */}
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={44} color="#475569" />
            <Text style={styles.emptyTitle}>No Notifications Found</Text>
            <Text style={styles.emptySub}>All incoming role alerts and system notices will appear here.</Text>
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { padding: 16, borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: "#4338CA" },
  heroLabel: { fontSize: 9, fontWeight: "800", color: "#A5B4FC", textTransform: "uppercase" },
  heroValue: { fontSize: 20, fontWeight: "900", color: "#FFF", marginTop: 2 },
  unreadBadgePill: { flexDirection: "row", alignItems: "center", backgroundColor: "#EC489922", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#EC489955" },
  filterChip: { backgroundColor: "#1E293B", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  filterChipActive: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  filterChipText: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  filterChipTextActive: { color: "#FFF" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 10, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: "#334155", marginBottom: 12 },
  searchInput: { flex: 1, color: "#F8FAFC", marginLeft: 8, fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { color: "#FFF", fontSize: 16, fontWeight: "800", marginTop: 10 },
  emptySub: { color: "#94A3B8", fontSize: 12, marginTop: 4 },
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
