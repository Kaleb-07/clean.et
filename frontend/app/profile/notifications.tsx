import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Bell,
  CheckCheck,
  Calendar,
  CreditCard,
  MessageSquare,
  Tag,
  Info,
  Trash2,
  BellOff,
  ShieldCheck,
  Car,
} from "lucide-react-native";
import Animated, { FadeInUp, FadeOutLeft, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useColors } from "../../hooks/useColors";
import API from "../../src/api/client";

// ── Types ──────────────────────────────────────────────────────────────────────
type NotifType =
  | "booking_update"
  | "payment"
  | "message"
  | "promo"
  | "system"
  | "booking_confirmed"
  | "profile";

interface AppNotification {
  id: number;
  type: NotifType;
  title: string;
  body: string;
  data?: Record<string, any>;
  is_unread: boolean;
  read_at: string | null;
  created_at: string;
}

// ── Icon config per type ───────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  NotifType,
  { Icon: any; iconColor: string; bgColor: string }
> = {
  booking_update: {
    Icon: Calendar,
    iconColor: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.12)",
  },
  booking_confirmed: {
    Icon: Calendar,
    iconColor: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.12)",
  },
  payment: {
    Icon: CreditCard,
    iconColor: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.12)",
  },
  message: {
    Icon: MessageSquare,
    iconColor: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.12)",
  },
  promo: {
    Icon: Tag,
    iconColor: "#8B5CF6",
    bgColor: "rgba(139, 92, 246, 0.12)",
  },
  system: {
    Icon: Info,
    iconColor: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.12)",
  },
  profile: {
    Icon: Bell,
    iconColor: "#64748B",
    bgColor: "rgba(100, 116, 139, 0.12)",
  },
};

// ── Time formatter ─────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data.data ?? []);
      setUnreadCount(res.data.unread_count ?? 0);
    } catch (e: any) {
      console.error("Failed to load notifications", e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh whenever the screen comes into focus (e.g. navigating back)
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchNotifications();
  }, [fetchNotifications]);

  // ── Mark one read ──────────────────────────────────────────────────────────
  const markRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_unread: false, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await API.post(`/notifications/${id}/read`);
    } catch {
      // silently revert if needed
    }
  };

  // ── Mark all read ──────────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_unread: false, read_at: now })));
    setUnreadCount(0);
    try {
      await API.post("/notifications/read-all");
    } catch {}
  };

  // ── Delete one ─────────────────────────────────────────────────────────────
  const deleteOne = async (id: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasUnread = notifications.find((n) => n.id === id)?.is_unread;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await API.delete(`/notifications/${id}`);
    } catch {}
  };

  // ── Clear all ──────────────────────────────────────────────────────────────
  const clearAll = () => {
    const confirm = () => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setNotifications([]);
      setUnreadCount(0);
      API.delete("/notifications").catch(() => {});
    };
    if (Platform.OS === "web") {
      if (window.confirm("Clear all notifications?")) confirm();
    } else {
      Alert.alert("Clear All", "Delete all notifications?", [
        { text: "Cancel", style: "cancel" },
        { text: "Clear All", style: "destructive", onPress: confirm },
      ]);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/home");
  };

  // ── Tap notification ──────────────────────────────────────────────────────
  const handleItemPress = (item: AppNotification) => {
    if (item.is_unread) {
      markRead(item.id);
    }
    if (item.data?.screen) {
      router.push(item.data.screen as any);
    } else if (item.data?.booking_id) {
      router.push(`/booking/status/${item.data.booking_id}` as any);
    } else if (item.data?.invoice_id) {
      router.push(`/invoices/${item.data.invoice_id}` as any);
    } else if (item.type === "profile") {
      router.push("/(tabs)/profile" as any);
    }
  };

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = (item: AppNotification, index: number) => {
    const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
    const { Icon, iconColor, bgColor } = config;

    return (
      <Animated.View
        key={item.id}
        entering={FadeInUp.delay(index * 40)}
        exiting={FadeOutLeft}
        layout={Layout.springify()}
      >
        <Pressable
          onPress={() => handleItemPress(item)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              borderLeftColor: item.is_unread ? "#EF4444" : colors.cardBorder,
              borderLeftWidth: item.is_unread ? 4 : 1,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          {/* Pastel Icon Box */}
          <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
            <Icon size={22} color={iconColor} strokeWidth={1.8} />
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: colors.text,
                    fontWeight: item.is_unread ? "700" : "600",
                  },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {item.is_unread && <View style={styles.unreadDot} />}
            </View>
            <Text
              style={[styles.cardBody, { color: colors.subtext }]}
              numberOfLines={2}
            >
              {item.body}
            </Text>
            <Text style={[styles.cardTime, { color: colors.subtext }]}>
              {timeAgo(item.created_at)}
            </Text>
          </View>

          {/* Delete button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              deleteOne(item.id);
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
          >
            <Trash2 size={15} color={colors.subtext} />
          </Pressable>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={handleBack}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <ChevronLeft color={colors.text} size={22} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} style={styles.markAllBtn}>
            <CheckCheck size={15} color="#EF4444" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 95 }} />
        )}
      </View>

      {/* ── Body ── */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 30 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            /* ── Empty state ── */
            <Animated.View entering={FadeInUp} style={styles.emptyState}>
              <LinearGradient
                colors={["rgba(59,130,246,0.15)", "rgba(59,130,246,0.05)"]}
                style={styles.emptyIconBg}
              >
                <BellOff size={40} color={colors.primary} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up!</Text>
              <Text style={[styles.emptyDesc, { color: colors.subtext }]}>
                No notifications yet. We'll notify you when something important happens.
              </Text>
            </Animated.View>
          ) : (
            <>
              {/* Unread section */}
              {notifications.some((n) => n.is_unread) && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.subtext }]}>UNREAD</Text>
                  {notifications.filter((n) => n.is_unread).map((item, i) => renderItem(item, i))}
                </>
              )}

              {/* Read section */}
              {notifications.some((n) => !n.is_unread) && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.subtext, marginTop: 20 }]}>
                    EARLIER
                  </Text>
                  {notifications.filter((n) => !n.is_unread).map((item, i) => renderItem(item, i))}
                </>
              )}

              {/* Clear all */}
              <Pressable
                onPress={clearAll}
                style={({ pressed }) => [
                  styles.clearAllBtn,
                  { borderColor: colors.cardBorder },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Trash2 size={15} color={colors.danger} />
                <Text style={[styles.clearAllText, { color: colors.danger }]}>
                  Clear all notifications
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },

  // ── List ──────────────────────────────────────────────────────────────────
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
    marginLeft: 4,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    overflow: "hidden",
    position: "relative",
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 15,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    flexShrink: 0,
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 5,
  },
  cardTime: {
    fontSize: 11,
    fontWeight: "500",
  },
  deleteBtn: {
    padding: 6,
    flexShrink: 0,
  },

  // ── Clear all ─────────────────────────────────────────────────────────────
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
