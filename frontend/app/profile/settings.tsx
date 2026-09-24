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
  TouchableOpacity,
  Alert,
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
  Shield,
  Sliders,
  CheckCircle2,
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
  French: "fr",
  Spanish: "es",
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { user, updateUser } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);
  const [showCacheSuccess, setShowCacheSuccess] = useState(false);
  const [successToast, setSuccessToast] = useState<{ title: string; message: string } | null>(null);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(admin)/(tabs)/Profile");
    }
  };

  const handleToggleDarkMode = async (val: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    await toggleDark(val);
  };

  const handleSelectLanguage = async (lang: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await setLanguage(lang as any);
      const code = LANGUAGE_CODE_MAP[lang] || "en";
      if (updateUser) {
        await updateUser({ language: code });
      }
      setLangModalVisible(false);
      setSuccessToast({
        title: "Language Preference Updated",
        message: `App language set to ${lang} and synced with your backend profile.`,
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update language setting.");
    }
  };

  const handleClearCache = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(
        (k) => k !== "@clean_auth_token" && k !== "@app_language" && k !== "@app_dark_mode"
      );
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (e) {
      console.error("Clear cache failed", e);
    }
    setConfirmClearVisible(false);
    setShowCacheSuccess(true);
  };

  return (
    <LinearGradient colors={["#0B0F19", "#111827", "#1E1B4B"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>App & System Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.sectionTitle}>App Preferences</Text>

        <View style={styles.settingGroup}>
          <BlurView intensity={20} tint="dark" style={styles.settingItem}>
            <Pressable style={styles.pressableItem} onPress={() => setLangModalVisible(true)}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                  <Globe size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.itemTitle}>Language</Text>
                  <Text style={styles.itemSubtitle}>{language || "English"}</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#64748b" />
            </Pressable>
          </BlurView>

          <BlurView intensity={20} tint="dark" style={styles.settingItem}>
            <View style={styles.pressableItem}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(139,92,246,0.15)" }]}>
                  {isDark ? <Moon size={20} color="#8b5cf6" /> : <Sun size={20} color="#f59e0b" />}
                </View>
                <View>
                  <Text style={styles.itemTitle}>Dark Mode</Text>
                  <Text style={styles.itemSubtitle}>{isDark ? "Enabled" : "Disabled"}</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: "#334155", true: "#8b5cf6" }}
              />
            </View>
          </BlurView>
        </View>

        <Text style={styles.sectionTitle}>Storage & Maintenance</Text>

        <View style={styles.settingGroup}>
          <BlurView intensity={20} tint="dark" style={styles.settingItem}>
            <Pressable style={styles.pressableItem} onPress={() => setConfirmClearVisible(true)}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                  <Database size={20} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.itemTitle}>Clear Cache & Temporary Files</Text>
                  <Text style={styles.itemSubtitle}>Frees storage space while keeping auth tokens safe</Text>
                </View>
              </View>
            </Pressable>
          </BlurView>
        </View>
      </ScrollView>

      {/* Clear Cache Confirmation */}
      <ActionModal
        visible={confirmClearVisible}
        type="danger"
        title="Clear Cache?"
        message="This will clear cached data from local storage without logging you out."
        confirmText="Clear Cache"
        onConfirm={handleClearCache}
        onCancel={() => setConfirmClearVisible(false)}
      />

      {/* Cache Cleared Toast */}
      <ActionModal
        visible={showCacheSuccess}
        type="success"
        title="Cache Cleared"
        message="Temporary application files have been successfully cleared."
        confirmText="Done"
        onConfirm={() => setShowCacheSuccess(false)}
      />

      {/* Success Toast Modal */}
      {successToast && (
        <ActionModal
          visible={!!successToast}
          type="success"
          title={successToast.title}
          message={successToast.message}
          confirmText="Great"
          onConfirm={() => setSuccessToast(null)}
        />
      )}

      {/* Language Selector Modal */}
      <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Language</Text>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                style={styles.langOption}
                onPress={() => handleSelectLanguage(lang)}
              >
                <Text style={styles.langText}>{lang}</Text>
                {language === lang && <Check size={20} color="#10b981" />}
              </Pressable>
            ))}
            <Pressable style={styles.closeBtn} onPress={() => setLangModalVisible(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  backButton: { padding: 8 },
  content: { padding: 20 },
  govBanner: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  govBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 6,
  },
  govBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 12 },
  settingGroup: { gap: 10, marginBottom: 24 },
  settingItem: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  pressableItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  itemTitle: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  itemSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#334155" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff", marginBottom: 16, textAlign: "center" },
  langOption: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#334155" },
  langText: { fontSize: 16, color: "#ffffff" },
  closeBtn: { marginTop: 16, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { color: "#94a3b8", fontWeight: "600", fontSize: 15 },
});
