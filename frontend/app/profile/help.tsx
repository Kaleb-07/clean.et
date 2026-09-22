import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  Pencil,
  User as UserIcon,
  FileText,
  Heart,
  MapPin,
  Settings as SettingsIcon,
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  LogOut,
} from "lucide-react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

interface HelpFAQ {
  id: string;
  q: string;
  a: string;
}

const CLEAN_ET_FAQS: HelpFAQ[] = [
  {
    id: "1",
    q: "How do I book an appointment?",
    a: "Select your desired cleaning service from the Home screen (such as Car Washing, Building Cleaning, or Detailing), choose your vehicle or address, pick an available date and time slot, and confirm your booking.",
  },
  {
    id: "2",
    q: "Can I cancel an appointment?",
    a: "Yes, you can cancel or reschedule an upcoming booking from your Bookings tab at any time before the crew is dispatched. Simply open the booking details and tap 'Cancel Booking'.",
  },
  {
    id: "3",
    q: "How do I make a payment?",
    a: "Clean.et supports secure mobile and card payments via Telebirr, CBE Birr, Chapa, and Cash on Delivery. When your service invoice is ready, you can pay directly in the app or choose your preferred method.",
  },
  {
    id: "4",
    q: "Is my data secure?",
    a: "All personal information, address records, and payment credentials are encrypted using industry-standard protocols. We never share your private data with unauthorized third parties.",
  },
  {
    id: "5",
    q: "How do I contact support?",
    a: "You can reach our customer support team 24/7 by emailing support@clean.et, calling our hotline, or tapping the 'Need Help?' card above to send us an email directly.",
  },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();

  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  const handleToggleFaq = (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const handleContactSupport = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("mailto:support@clean.et").catch(() => {
      Alert.alert("Contact Support", "Please email us at support@clean.et");
    });
  };

  const handleLogout = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleBack = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "AJ";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0B0F19" : "#F8FAFC" }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
      >
        {/* ── TOP RED BANNER (Matches Screenshot) ── */}
        <LinearGradient
          colors={["#EF4444", "#DC2626"]}
          style={[styles.headerBanner, { paddingTop: Math.max(insets.top + 8, 28) }]}
        >
          {/* Top Bar: Back, Title, Edit */}
          <View style={styles.topBar}>
            <Pressable onPress={handleBack} style={styles.headerIconButton}>
              <ChevronLeft size={22} color="#ffffff" strokeWidth={2.5} />
            </Pressable>

            <Text style={styles.topBarTitle}>My Profile</Text>

            <Pressable onPress={() => router.replace("/(tabs)/profile")} style={styles.headerIconButton}>
              <Pencil size={18} color="#ffffff" strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* User Profile Card within Banner */}
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              </View>
            </View>

            <View style={styles.profileInfoTextCol}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.name || "Alex Johnson"}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email || "alex.johnson@email.com"}
              </Text>
              <Text style={styles.profileMeta} numberOfLines={1}>
                {user?.phone || "+1 555-0199"} • Male, 32 yrs
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── 5 PILL TABS (Info, History, Saved, Address, Settings) ── */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[styles.tabPill, styles.tabPillInactive, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}
          >
            <UserIcon size={18} color={isDark ? "#94A3B8" : "#64748B"} strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: isDark ? "#94A3B8" : "#64748B" }]}>Info</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/booking")}
            style={[styles.tabPill, styles.tabPillInactive, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}
          >
            <FileText size={18} color={isDark ? "#94A3B8" : "#64748B"} strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: isDark ? "#94A3B8" : "#64748B" }]}>History</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/vehicles")}
            style={[styles.tabPill, styles.tabPillInactive, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}
          >
            <Heart size={18} color={isDark ? "#94A3B8" : "#64748B"} strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: isDark ? "#94A3B8" : "#64748B" }]}>Saved</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            style={[styles.tabPill, styles.tabPillInactive, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}
          >
            <MapPin size={18} color={isDark ? "#94A3B8" : "#64748B"} strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: isDark ? "#94A3B8" : "#64748B" }]}>Address</Text>
          </Pressable>

          {/* Active Settings Tab */}
          <Pressable style={[styles.tabPill, styles.tabPillActive]}>
            <SettingsIcon size={18} color="#ffffff" strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: "#ffffff" }]}>Settings</Text>
          </Pressable>
        </View>

        {/* ── SUBPAGE CONTENT (Matches Screenshot) ── */}
        <View style={styles.bodyContent}>
          {/* Header row: Back button & Title */}
          <View style={styles.subPageHeaderRow}>
            <Pressable
              onPress={handleBack}
              style={[
                styles.subPageBackBtn,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              <ArrowLeft size={18} color={isDark ? "#FFFFFF" : "#0F172A"} strokeWidth={2.4} />
            </Pressable>
            <Text style={[styles.subPageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
              Help Center
            </Text>
          </View>

          {/* Need Help Card (Matches screenshot) */}
          <Pressable
            onPress={handleContactSupport}
            style={({ pressed }) => [
              styles.needHelpCard,
              {
                backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#FFF1F2",
                borderColor: isDark ? "rgba(239, 68, 68, 0.25)" : "#FFE4E6",
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.needHelpIconContainer}>
              <HelpCircle size={32} color="#EF4444" strokeWidth={2.2} />
            </View>
            <View style={styles.needHelpTextCol}>
              <Text style={[styles.needHelpTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                Need Help?
              </Text>
              <Text style={[styles.needHelpEmail, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                support@clean.et
              </Text>
            </View>
          </Pressable>

          {/* FREQUENTLY ASKED QUESTIONS Heading */}
          <Text style={[styles.faqSectionHeading, { color: isDark ? "#94A3B8" : "#64748B" }]}>
            FREQUENTLY ASKED QUESTIONS
          </Text>

          {/* FAQ Accordion Card (Matches screenshot) */}
          <View
            style={[
              styles.faqCardBox,
              {
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderColor: isDark ? "#334155" : "#E2E8F0",
              },
            ]}
          >
            {CLEAN_ET_FAQS.map((faq, index) => {
              const isExpanded = expandedFaqId === faq.id;
              const isLast = index === CLEAN_ET_FAQS.length - 1;
              return (
                <View key={faq.id}>
                  <Pressable
                    onPress={() => handleToggleFaq(faq.id)}
                    style={({ pressed }) => [
                      styles.faqRowItem,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.faqQuestionText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      {faq.q}
                    </Text>
                    {isExpanded ? (
                      <ChevronUp size={18} color="#94A3B8" strokeWidth={2} />
                    ) : (
                      <ChevronDown size={18} color="#94A3B8" strokeWidth={2} />
                    )}
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.faqAnswerContainer}>
                      <Text style={[styles.faqAnswerText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        {faq.a}
                      </Text>
                    </View>
                  )}

                  {!isLast && (
                    <View
                      style={[
                        styles.settingsDivider,
                        { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* LOG OUT BUTTON (Matches screenshot) */}
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.screenshotLogoutBtn,
              pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
            ]}
          >
            <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
            <Text style={styles.screenshotLogoutText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  profileInfoTextCol: {
    flex: 1,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 3,
  },
  profileEmail: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 3,
  },
  profileMeta: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "400",
  },

  // ── 5 PILL TABS ──
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 20,
  },
  tabPill: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabPillActive: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  tabPillInactive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── SUBPAGE BODY ──
  bodyContent: {
    paddingHorizontal: 18,
  },
  subPageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  subPageBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subPageTitleText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // ── Need Help Card ──
  needHelpCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 22,
  },
  needHelpIconContainer: {
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  needHelpTextCol: {
    flex: 1,
  },
  needHelpTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  needHelpEmail: {
    fontSize: 13,
    fontWeight: "500",
  },

  // ── FAQ ──
  faqSectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  faqCardBox: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  faqRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.2,
  },
  faqAnswerContainer: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 2,
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "400",
  },
  settingsDivider: {
    height: 1,
  },

  // ── Log Out Button ──
  screenshotLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    backgroundColor: "#FFF1F2",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  screenshotLogoutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
});
