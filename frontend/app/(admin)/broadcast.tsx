import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInRight,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSuperAdmin, BroadcastPayload } from "../../hooks/useSuperAdmin";
import { useColors } from "../../hooks/useColors";
import { useLanguage } from "../../contexts/LanguageContext";

type TargetGroup = "all" | "tenant_admins" | "staff" | "customers";
type MessagePriority = "normal" | "urgent" | "emergency" | "promo";

interface BroadcastHistoryItem {
  id: string;
  title: string;
  message: string;
  target: TargetGroup;
  priority: MessagePriority;
  channels: { push: boolean; email: boolean; sms: boolean };
  sentAt: string;
  recipientsCount: number;
}

const BROADCAST_STORAGE_KEY = "@clean_et_broadcast_history";

export default function SuperAdminBroadcast() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const { analytics, tenants, sendBroadcast, isLoading, onRefresh } =
    useSuperAdmin();

  /* ─── TOAST NOTIFICATION ─── */
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  /* ─── COMPOSER FORM STATE ─── */
  const [targetGroup, setTargetGroup] = useState<TargetGroup>("all");
  const [priority, setPriority] = useState<MessagePriority>("normal");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [channels, setChannels] = useState({
    push: true,
    email: true,
    sms: false,
  });
  const [isSending, setIsSending] = useState(false);

  /* ─── BROADCAST HISTORY STATE ─── */
  const [history, setHistory] = useState<BroadcastHistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState("");

  // Load past broadcast history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(BROADCAST_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setHistory(parsed);
        }
      } catch (e) {
        console.warn("Failed to load broadcast history:", e);
      }
    };
    loadHistory();
  }, []);

  const saveHistoryToStorage = async (updated: BroadcastHistoryItem[]) => {
    try {
      await AsyncStorage.setItem(
        BROADCAST_STORAGE_KEY,
        JSON.stringify(updated),
      );
    } catch (e) {
      console.warn("Failed to save broadcast history:", e);
    }
  };

  /* ─── CALCULATE ESTIMATED REACH ─── */
  const getEstimatedReach = () => {
    switch (targetGroup) {
      case "all":
        return (
          (analytics?.total_customers ?? 120) +
          (analytics?.total_staff ?? 25) +
          tenants.length
        );
      case "tenant_admins":
        return tenants.length || 5;
      case "staff":
        return analytics?.total_staff ?? 25;
      case "customers":
        return analytics?.total_customers ?? 120;
      default:
        return 100;
    }
  };

  /* ─── HANDLE SEND BROADCAST ─── */
  const handleDispatch = async () => {
    if (!title.trim()) {
      showToast("error", "Broadcast Headline Title is required.");
      return;
    }
    if (!message.trim()) {
      showToast("error", "Announcement Body message is required.");
      return;
    }

    setIsSending(true);
    try {
      const payload: BroadcastPayload = {
        title: title.trim(),
        message: message.trim(),
        target: targetGroup,
      };

      const result = await sendBroadcast(payload);
      const reach = result?.user_count || getEstimatedReach();

      const newItem: BroadcastHistoryItem = {
        id: String(Date.now()),
        title: title.trim(),
        message: message.trim(),
        target: targetGroup,
        priority,
        channels: { ...channels },
        sentAt: new Date().toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        recipientsCount: reach,
      };

      const updated = [newItem, ...history];
      setHistory(updated);
      await saveHistoryToStorage(updated);

      showToast(
        "success",
        `🚀 ${t("broadcast_sent_success")} (${reach} reach)`
      );

      // Reset Form
      setTitle("");
      setMessage("");
      setActionUrl("");
    } catch (err: any) {
      showToast(
        "error",
        err?.message || "Failed to dispatch broadcast. Try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear Broadcast Log",
      "Are you sure you want to clear your local broadcast history? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setHistory([]);
            await AsyncStorage.removeItem(BROADCAST_STORAGE_KEY);
            showToast("info", "Broadcast history cleared.");
          },
        },
      ]
    );
  };

  const filteredHistory = history.filter(
    (item) =>
      item.title.toLowerCase().includes(searchHistory.toLowerCase()) ||
      item.message.toLowerCase().includes(searchHistory.toLowerCase()) ||
      item.target.toLowerCase().includes(searchHistory.toLowerCase())
  );

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
          <Text style={styles.headerTitle}>{t("broadcast_center_title")}</Text>
          <Text style={styles.headerSubtitle}>
            {t("broadcast_center_sub")}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          disabled={isLoading}
        >
          <Ionicons
            name="refresh"
            size={18}
            color={isLoading ? colors.subtext : "#3B82F6"}
          />
        </TouchableOpacity>
      </View>

      {/* ── TOAST ALERT ── */}
      {toast && (
        <Animated.View
          entering={FadeInDown}
          style={[
            styles.toast,
            toast.type === "success"
              ? styles.toastSuccess
              : toast.type === "error"
              ? styles.toastError
              : styles.toastInfo,
          ]}
        >
          <Ionicons
            name={
              toast.type === "success"
                ? "checkmark-circle"
                : toast.type === "error"
                ? "alert-circle"
                : "information-circle"
            }
            size={18}
            color="#FFF"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
          <TouchableOpacity onPress={() => setToast(null)}>
            <Ionicons name="close" size={16} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {/* ── BROADCAST HERO BANNER ── */}
        <LinearGradient
          colors={["#1E1B4B", "#312E81"]}
          style={styles.heroCard}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={styles.heroPreLabel}>GLOBAL COMMS ENGINE</Text>
              <Text style={styles.heroTitle}>{t("compose_broadcast")}</Text>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.livePulseDot} />
              <Text
                style={{
                  color: "#34D399",
                  fontWeight: "800",
                  fontSize: 11,
                  marginLeft: 4,
                }}
              >
                LIVE
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <View style={styles.miniStatPill}>
              <Text style={styles.miniStatLabel}>TOTAL DISPATCHES</Text>
              <Text style={styles.miniStatVal}>{history.length} Sent</Text>
            </View>

            <View style={styles.miniStatPill}>
              <Text style={styles.miniStatLabel}>ACTIVE CHANNELS</Text>
              <Text style={styles.miniStatVal}>
                {[
                  channels.push && "PUSH",
                  channels.email && "EMAIL",
                  channels.sms && "SMS",
                ]
                  .filter(Boolean)
                  .join(" • ") || "NONE"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── SECTION 1: TARGET AUDIENCE SELECTOR ── */}
        <Text style={styles.sectionTitle}>
          🎯 {t("target_audience")} *
        </Text>
        <View style={styles.targetGrid}>
          {[
            {
              key: "all",
              title: t("target_all"),
              sub: "All Users, Managers & Staff",
              icon: "globe-outline",
              color: "#3B82F6",
            },
            {
              key: "tenant_admins",
              title: t("target_admins"),
              sub: "Department Division Heads",
              icon: "business-outline",
              color: "#10B981",
            },
            {
              key: "staff",
              title: t("target_staff"),
              sub: "Service Technicians & Drivers",
              icon: "construct-outline",
              color: "#A855F7",
            },
            {
              key: "customers",
              title: t("target_customers"),
              sub: "Retail & Fleet Account Holders",
              icon: "people-outline",
              color: "#EC4899",
            },
          ].map((tg) => {
            const isSel = targetGroup === tg.key;
            return (
              <TouchableOpacity
                key={tg.key}
                onPress={() => setTargetGroup(tg.key as TargetGroup)}
                style={[
                  styles.targetCard,
                  isSel && {
                    borderColor: tg.color,
                    backgroundColor: `${tg.color}15`,
                  },
                ]}
              >
                <Ionicons
                  name={tg.icon as any}
                  size={22}
                  color={isSel ? tg.color : colors.subtext}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.targetTitle, isSel && { color: tg.color }]}
                  >
                    {tg.title}
                  </Text>
                  <Text style={styles.targetSub}>{tg.sub}</Text>
                </View>
                {isSel && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={tg.color}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── SECTION 2: PRIORITY & MULTI-CHANNEL DISPATCH ── */}
        <Text style={styles.sectionTitle}>
          ⚡ {t("priority_level")} & {t("delivery_channels")}
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          {[
            { key: "normal", label: t("priority_normal"), color: "#3B82F6" },
            { key: "urgent", label: t("priority_urgent"), color: "#F59E0B" },
            { key: "emergency", label: t("priority_emergency"), color: "#EF4444" },
            { key: "promo", label: t("priority_promo"), color: "#10B981" },
          ].map((p) => {
            const isSel = priority === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPriority(p.key as MessagePriority)}
                style={[
                  styles.priorityChip,
                  isSel && {
                    backgroundColor: `${p.color}25`,
                    borderColor: p.color,
                  },
                ]}
              >
                <Text
                  style={[styles.priorityChipText, isSel && { color: p.color }]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Channels Toggles */}
        <View style={styles.channelRow}>
          <TouchableOpacity
            style={[
              styles.channelBtn,
              channels.push && styles.channelBtnActive,
            ]}
            onPress={() => setChannels({ ...channels, push: !channels.push })}
          >
            <Ionicons
              name="notifications"
              size={16}
              color={channels.push ? "#60A5FA" : colors.subtext}
            />
            <Text
              style={[
                styles.channelText,
                channels.push && styles.channelTextActive,
              ]}
            >
              {t("push_notification")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.channelBtn,
              channels.email && styles.channelBtnActive,
            ]}
            onPress={() => setChannels({ ...channels, email: !channels.email })}
          >
            <Ionicons
              name="mail"
              size={16}
              color={channels.email ? "#34D399" : colors.subtext}
            />
            <Text
              style={[
                styles.channelText,
                channels.email && styles.channelTextActive,
              ]}
            >
              {t("email_delivery")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.channelBtn, channels.sms && styles.channelBtnActive]}
            onPress={() => setChannels({ ...channels, sms: !channels.sms })}
          >
            <Ionicons
              name="chatbox"
              size={16}
              color={channels.sms ? "#FBBF24" : colors.subtext}
            />
            <Text
              style={[
                styles.channelText,
                channels.sms && styles.channelTextActive,
              ]}
            >
              {t("sms_broadcast")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── SECTION 3: MESSAGE COMPOSER ── */}
        <Text style={styles.sectionTitle}>✍️ {t("compose_broadcast")}</Text>
        <View style={styles.composerCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t("notification_title")} *</Text>
            <TextInput
              placeholder="e.g. System Maintenance & New Sector Launch"
              placeholderTextColor={colors.subtext}
              value={title}
              onChangeText={setTitle}
              style={styles.textInput}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t("broadcast_message")} *</Text>
            <TextInput
              placeholder="Type the full announcement message body to be dispatched to selected recipients..."
              placeholderTextColor={colors.subtext}
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
              style={[
                styles.textInput,
                { height: 100, textAlignVertical: "top" },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {t("action_url")}
            </Text>
            <TextInput
              placeholder="e.g. /(admin)/tenants or /booking"
              placeholderTextColor={colors.subtext}
              value={actionUrl}
              onChangeText={setActionUrl}
              style={styles.textInput}
            />
          </View>
        </View>

        {/* ── SECTION 4: LIVE DEVICE PREVIEW CARD ── */}
        {title.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>
              📱 Preview
            </Text>
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={styles.previewCard}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={styles.previewLogo}>
                  <Ionicons name="sparkles" size={14} color="#FFF" />
                </View>
                <Text
                  style={{ color: "#FFF", fontWeight: "800", fontSize: 12 }}
                >
                  CLEAN.ET ANNOUNCEMENT
                </Text>
                <Text
                  style={{ color: "#94A3B8", fontSize: 10, marginLeft: "auto" }}
                >
                  now
                </Text>
              </View>

              <Text
                style={{
                  color: "#FFF",
                  fontWeight: "800",
                  fontSize: 14,
                  marginTop: 8,
                }}
              >
                {title}
              </Text>
              <Text
                style={{
                  color: "#DBEAFE",
                  fontSize: 12,
                  marginTop: 4,
                  lineHeight: 16,
                }}
              >
                {message || "Message preview will appear here..."}
              </Text>

              {actionUrl ? (
                <View style={styles.previewActionBtn}>
                  <Text
                    style={{
                      color: "#60A5FA",
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    Tap to open {actionUrl}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color="#60A5FA" />
                </View>
              ) : null}
            </Animated.View>
          </View>
        )}

        {/* ── DISPATCH BUTTON ── */}
        <TouchableOpacity
          style={[styles.dispatchBtn, isSending && { opacity: 0.7 }]}
          onPress={handleDispatch}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons
                name="send"
                size={18}
                color="#FFF"
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 14 }}>
                {t("send_broadcast_now").toUpperCase()} (~{getEstimatedReach()})
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── SECTION 5: BROADCAST HISTORY & ANALYTICS ── */}
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={styles.sectionTitle}>
              📜 {t("broadcast_history")} ({history.length})
            </Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={handleClearHistory}>
                <Text
                  style={{ color: "#F87171", fontSize: 11, fontWeight: "700" }}
                >
                  Clear Log
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {history.length > 0 && (
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={colors.subtext} />
              <TextInput
                placeholder="Search history..."
                placeholderTextColor={colors.subtext}
                value={searchHistory}
                onChangeText={setSearchHistory}
                style={styles.searchInput}
              />
            </View>
          )}

          {filteredHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="megaphone-outline" size={44} color={colors.subtext} />
              <Text style={styles.emptyTitle}>No Dispatched Broadcasts</Text>
              <Text style={styles.emptySub}>
                Sent broadcasts and delivery logs will appear here.
              </Text>
            </View>
          ) : (
            filteredHistory.map((item, idx) => (
              <Animated.View
                key={item.id || idx}
                entering={FadeInRight.delay(idx * 40)}
              >
                <View style={styles.historyCard}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "800",
                          fontSize: 14,
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={{ color: colors.subtext, fontSize: 12, marginTop: 4 }}
                      >
                        {item.message}
                      </Text>
                    </View>

                    <View style={styles.deliveredPill}>
                      <Ionicons
                        name="checkmark-done"
                        size={12}
                        color="#34D399"
                      />
                      <Text
                        style={{
                          color: "#34D399",
                          fontSize: 10,
                          fontWeight: "800",
                          marginLeft: 4,
                        }}
                      >
                        DELIVERED
                      </Text>
                    </View>
                  </View>

                  <View style={styles.historyFooter}>
                    <Text
                      style={{
                        color: "#60A5FA",
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      Target: {item.target.toUpperCase()} •{" "}
                      {item.recipientsCount} Recipients
                    </Text>
                    <Text style={{ color: colors.subtext, fontSize: 10 }}>
                      {item.sentAt}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </View>
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
    headerTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    headerSubtitle: { fontSize: 11, color: colors.subtext, marginTop: 1 },
    refreshBtn: { padding: 6 },
    scrollContent: { padding: 16, paddingBottom: 50 },
    toast: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginTop: 8,
      padding: 12,
      borderRadius: 10,
      gap: 10,
    },
    toastSuccess: { backgroundColor: "#059669" },
    toastError: { backgroundColor: "#DC2626" },
    toastInfo: { backgroundColor: "#2563EB" },
    toastText: { flex: 1, color: "#FFF", fontWeight: "700", fontSize: 12 },
    heroCard: { padding: 18, borderRadius: 16, marginBottom: 20 },
    heroPreLabel: { fontSize: 11, fontWeight: "700", color: "#93C5FD", letterSpacing: 0.8 },
    heroTitle: { fontSize: 20, fontWeight: "900", color: "#FFF", marginTop: 2 },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(16, 185, 129, 0.3)",
    },
    livePulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
    miniStatPill: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.25)",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
    },
    miniStatLabel: { fontSize: 9, fontWeight: "700", color: "#93C5FD" },
    miniStatVal: { fontSize: 12, fontWeight: "800", color: "#FFF", marginTop: 2 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 10,
    },
    targetGrid: { gap: 8, marginBottom: 18 },
    targetCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 12,
    },
    targetTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
    targetSub: { fontSize: 10, color: colors.subtext, marginTop: 1 },
    priorityChip: {
      flex: 1,
      backgroundColor: colors.card,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    priorityChipText: { color: colors.subtext, fontSize: 11, fontWeight: "700" },
    channelRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    channelBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 6,
    },
    channelBtnActive: { backgroundColor: colors.isDark ? "#334155" : colors.surface, borderColor: "#60A5FA" },
    channelText: { color: colors.subtext, fontSize: 12, fontWeight: "700" },
    channelTextActive: { color: colors.text },
    composerCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 16,
    },
    inputGroup: { marginBottom: 12 },
    inputLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    previewCard: {
      backgroundColor: "#1E1B4B",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#6366F1",
    },
    previewLogo: {
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: "#2563EB",
      alignItems: "center",
      justifyContent: "center",
    },
    previewActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: "#312E81",
    },
    dispatchBtn: {
      flexDirection: "row",
      backgroundColor: "#2563EB",
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#2563EB",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 6,
    },
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
    emptyState: { alignItems: "center", paddingVertical: 30 },
    emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "800", marginTop: 8 },
    emptySub: { color: colors.subtext, fontSize: 12, marginTop: 4 },
    historyCard: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    deliveredPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#10B98122",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "#10B98155",
    },
    historyFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
  });
