import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Switch,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Globe,
  Moon,
  Database,
  ChevronRight,
  Check,
  Sun,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";

const LANGUAGES = ["English", "Amharic", "Oromo", "French", "Spanish"];

const LANGUAGE_CODE_MAP: Record<string, string> = {
  English: "en",
  Amharic: "am",
  Oromo: "om",
  French: "en",
  Spanish: "en",
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  // ─── Real contexts ────────────────────────────────────────────────────────
  const { isDark, toggleDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { user, updateUser } = useAuth();

  // ─── Local UI state ───────────────────────────────────────────────────────
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);
  const [showCacheSuccess, setShowCacheSuccess] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  const handleToggleDark = async (val: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    await toggleDark(val);
    // Brief inline save toast
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleSelectLanguage = async (lang: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    await setLanguage(lang as any);

    if (user && updateUser) {
      try {
        const code = LANGUAGE_CODE_MAP[lang] || "en";
        await updateUser({ language: code as any });
      } catch (err) {
        console.log("Failed to sync language setting with backend", err);
      }
    }

    setLangModalVisible(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleClearCache = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter((k) => k !== "auth_token");
      await AsyncStorage.multiRemove(keysToRemove);
      // Re-apply defaults through contexts
      await toggleDark(true);
      await setLanguage("English" as any);
    } catch (e) {
      console.error("Failed to clear cache", e);
    }
    setConfirmClearVisible(false);
    setShowCacheSuccess(true);
  };

  // Theme-aware background gradient
  const gradientColors: [string, string] = isDark
    ? ["#0b0b1f", "#1a1b3a"]
    : ["#f0f4ff", "#e8eeff"];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/profile")
          }
          style={styles.backButton}
        >
          <ChevronLeft color={isDark ? "#ffffff" : "#1e293b"} size={28} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#0f172a" }]}>
          App Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Appearance ── */}
        <Text style={[styles.sectionTitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>
          Appearance
        </Text>
        <BlurView
          intensity={isDark ? 20 : 60}
          tint={isDark ? "dark" : "light"}
          style={[styles.section, { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
        >
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)" },
                ]}
              >
                {isDark ? (
                  <Moon size={20} color="#8b5cf6" />
                ) : (
                  <Sun size={20} color="#f59e0b" />
                )}
              </View>
              <View>
                <Text style={[styles.label, { color: isDark ? "#fff" : "#0f172a" }]}>
                  Dark Mode
                </Text>
                <Text style={styles.sublabel}>
                  {isDark ? "Currently dark" : "Currently light"}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleToggleDark}
              trackColor={{ false: "#cbd5e1", true: "#6d28d9" }}
              thumbColor="#ffffff"
            />
          </View>
        </BlurView>

        {/* ── Language ── */}
        <Text
          style={[
            styles.sectionTitle,
            { marginTop: 28, color: isDark ? "#64748b" : "#94a3b8" },
          ]}
        >
          Language
        </Text>
        <BlurView
          intensity={isDark ? 20 : 60}
          tint={isDark ? "dark" : "light"}
          style={[styles.section, { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
        >
          <Pressable
            style={styles.item}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              setLangModalVisible(true);
            }}
          >
            <View style={styles.itemLeft}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: "rgba(59,130,246,0.12)" },
                ]}
              >
                <Globe size={20} color="#3b82f6" />
              </View>
              <View>
                <Text style={[styles.label, { color: isDark ? "#fff" : "#0f172a" }]}>
                  Language
                </Text>
                <Text style={styles.sublabel}>Tap to change</Text>
              </View>
            </View>
            <View style={styles.itemRight}>
              <Text style={[styles.value, { color: isDark ? "#94a3b8" : "#475569" }]}>
                {language}
              </Text>
              <ChevronRight size={18} color="#475569" />
            </View>
          </Pressable>
        </BlurView>

        {/* ── System ── */}
        <Text
          style={[
            styles.sectionTitle,
            { marginTop: 28, color: isDark ? "#64748b" : "#94a3b8" },
          ]}
        >
          System
        </Text>
        <BlurView
          intensity={isDark ? 20 : 60}
          tint={isDark ? "dark" : "light"}
          style={[styles.section, { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
        >
          <Pressable
            style={styles.item}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
              setConfirmClearVisible(true);
            }}
          >
            <View style={styles.itemLeft}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: "rgba(16,185,129,0.12)" },
                ]}
              >
                <Database size={20} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.label, { color: isDark ? "#fff" : "#0f172a" }]}>
                  Clear Cache
                </Text>
                <Text style={styles.sublabel}>Remove all locally saved data</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#475569" />
          </Pressable>
        </BlurView>

        {/* Save indicator */}
        {saveToast && (
          <View style={styles.saveIndicator}>
            <Check size={14} color="#10b981" />
            <Text style={styles.saveIndicatorText}>Saved!</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Language Modal ── */}
      <Modal visible={langModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.langContainer}>
            <BlurView intensity={90} tint="dark" style={styles.langContent}>
              <Text style={styles.modalTitle}>Select Language</Text>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang}
                  style={styles.langOption}
                  onPress={() => handleSelectLanguage(lang)}
                >
                  <Text
                    style={[
                      styles.langText,
                      language === lang && styles.langTextActive,
                    ]}
                  >
                    {lang}
                  </Text>
                  {language === lang && <Check size={20} color="#6d28d9" />}
                </Pressable>
              ))}
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setLangModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </BlurView>
          </View>
        </View>
      </Modal>

      {/* ── Confirm Clear Cache ── */}
      <ActionModal
        visible={confirmClearVisible}
        type="warning"
        title="Clear Cache?"
        message="This will remove all locally saved settings and data. Your account will not be affected."
        confirmText="Clear Now"
        cancelText="Cancel"
        onConfirm={handleClearCache}
        onCancel={() => setConfirmClearVisible(false)}
      />

      <ActionModal
        visible={showCacheSuccess}
        type="success"
        title="Cache Cleared"
        message="All locally stored data has been removed successfully."
        confirmText="Done"
        onConfirm={() => setShowCacheSuccess(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  backButton: { padding: 8 },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 12,
    letterSpacing: 1,
  },
  section: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  label: { fontSize: 16, fontWeight: "600" },
  sublabel: { color: "#64748b", fontSize: 12, marginTop: 2 },
  value: { fontSize: 14 },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 16,
  },

  saveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    justifyContent: "center",
  },
  saveIndicatorText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Language modal ────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  langContainer: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  langContent: { padding: 32, paddingBottom: 50 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 24,
    textAlign: "center",
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  langText: { fontSize: 18, color: "#94a3b8" },
  langTextActive: { color: "#ffffff", fontWeight: "bold" },
  cancelBtn: { marginTop: 24, padding: 16, alignItems: "center" },
  cancelBtnText: { color: "#ef4444", fontWeight: "bold", fontSize: 16 },
});
