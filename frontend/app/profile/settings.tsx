import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Switch, Modal } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Globe, Moon, Database, ChevronRight, Check } from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@app_settings";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  
  // States
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("English");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCacheSuccess, setShowCacheSuccess] = useState(false);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setIsDarkMode(parsed.darkMode);
          setLanguage(parsed.language);
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  const handleSave = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        darkMode: isDarkMode,
        language: language
      }));
      setShowSuccess(true);
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  };

  const handleClearCache = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      // Clear all stored app data
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys as string[]);
      // Reset local states to defaults
      setIsDarkMode(true);
      setLanguage("English");
      console.log("Cache cleared successfully");
      setConfirmClearVisible(false);
      setShowCacheSuccess(true);
    } catch (e) {
      console.error("Failed to clear cache", e);
    }
  };

  const languages = ["English", "Amharic", "French", "Spanish"];

  if (isLoading) return null;

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>General</Text>
        <BlurView intensity={20} tint="dark" style={styles.section}>
          <Pressable style={styles.item} onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            setLangModalVisible(true);
          }}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Globe size={20} color="#3b82f6" />
              </View>
              <Text style={styles.label}>Language</Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.value}>{language}</Text>
              <ChevronRight size={18} color="#475569" />
            </View>
          </Pressable>

          <View style={styles.separator} />

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Moon size={20} color="#8b5cf6" />
              </View>
              <Text style={styles.label}>Dark Mode</Text>
            </View>
            <Switch 
              value={isDarkMode} 
              onValueChange={(val) => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setIsDarkMode(val);
              }}
              trackColor={{ false: "#1e293b", true: "#6d28d9" }}
              thumbColor="#ffffff"
            />
          </View>
        </BlurView>

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>System</Text>
        <BlurView intensity={20} tint="dark" style={styles.section}>
          <Pressable style={styles.item} onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            setConfirmClearVisible(true);
          }}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Database size={20} color="#10b981" />
              </View>
              <View>
                <Text style={styles.label}>Clear Cache</Text>
                <Text style={styles.sublabel}>Remove all locally saved data</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#475569" />
          </Pressable>
        </BlurView>

        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Settings</Text>
        </Pressable>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={langModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.langContainer}>
            <BlurView intensity={90} tint="dark" style={styles.langContent}>
              <Text style={styles.modalTitle}>Select Language</Text>
              {languages.map((lang) => (
                <Pressable 
                  key={lang} 
                  style={styles.langOption} 
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setLanguage(lang);
                    setLangModalVisible(false);
                  }}
                >
                  <Text style={[styles.langText, language === lang && styles.langTextActive]}>{lang}</Text>
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

      {/* Confirm Clear Cache Modal */}
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

      {/* Cache Cleared Success Modal */}
      <ActionModal
        visible={showCacheSuccess}
        type="success"
        title="Cache Cleared"
        message="All locally stored data has been removed successfully. The app is fresh and clean!"
        confirmText="Done"
        onConfirm={() => setShowCacheSuccess(false)}
      />

      {/* Settings Saved Success Modal */}
      <ActionModal
        visible={showSuccess}
        type="success"
        title="Settings Updated"
        message="Your application preferences have been saved and applied."
        confirmText="Perfect"
        onConfirm={() => setShowSuccess(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  backButton: { padding: 8 },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: "#64748b", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", marginBottom: 12, marginLeft: 12, letterSpacing: 1 },
  section: { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  sublabel: { color: "#475569", fontSize: 12, marginTop: 2 },
  value: { color: "#94a3b8", fontSize: 14 },
  separator: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 16 },
  saveBtn: { backgroundColor: "#6d28d9", paddingVertical: 18, borderRadius: 18, alignItems: "center", marginTop: 40, shadowColor: "#6d28d9", shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  saveBtnText: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  
  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  langContainer: { borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  langContent: { padding: 32, paddingBottom: 50 },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#ffffff", marginBottom: 24, textAlign: "center" },
  langOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  langText: { fontSize: 18, color: "#94a3b8" },
  langTextActive: { color: "#ffffff", fontWeight: "bold" },
  cancelBtn: { marginTop: 24, padding: 16, alignItems: "center" },
  cancelBtnText: { color: "#ef4444", fontWeight: "bold", fontSize: 16 },
});
