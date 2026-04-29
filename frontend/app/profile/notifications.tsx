import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Bell, MessageSquare, Tag, Info } from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@notification_settings";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    push: true,
    orders: true,
    promo: false,
    updates: true,
  });

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setSettings(JSON.parse(saved));
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

  const toggle = (key: keyof typeof settings) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      // Real saving to device storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      console.log("Saved notification settings:", settings);
      setShowSuccess(true);
    } catch (e) {
      console.error("Failed to save settings", e);
      const msg = "Failed to save settings. Please try again.";
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
    }
  };

  const notificationItems = [
    { key: "push", label: "Push Notifications", desc: "Allow main app alerts", icon: Bell },
    { key: "orders", label: "Booking Updates", desc: "Alerts about your car wash status", icon: MessageSquare },
    { key: "promo", label: "Offers & Promos", desc: "Discounts and special events", icon: Tag },
    { key: "updates", label: "System Updates", desc: "News about app features", icon: Info },
  ];

  if (isLoading) return null; // Or a loading spinner

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable 
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")} 
          style={styles.backButton}
        >
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.listContainer}>
          {notificationItems.map((item) => (
            <BlurView key={item.key} intensity={20} tint="dark" style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={styles.iconBox}>
                  <item.icon size={20} color="#6d28d9" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.desc}>{item.desc}</Text>
                </View>
              </View>
              <Switch
                value={settings[item.key as keyof typeof settings]}
                onValueChange={() => toggle(item.key as keyof typeof settings)}
                trackColor={{ false: "#1e293b", true: "#6d28d9" }}
                thumbColor="#ffffff"
              />
            </BlurView>
          ))}
        </View>

        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        </Pressable>
      </ScrollView>

      <ActionModal
        visible={showSuccess}
        type="success"
        title="Settings Saved"
        message="Your notification preferences have been successfully updated and saved to your profile."
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
  listContainer: { gap: 12, marginBottom: 32 },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  iconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(109, 40, 217, 0.1)", justifyContent: "center", alignItems: "center" },
  textContainer: { flex: 1 },
  label: { color: "#ffffff", fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  desc: { color: "#64748b", fontSize: 12 },
  saveBtn: {
    backgroundColor: "#6d28d9",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#6d28d9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 20,
  },
  saveBtnText: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
});
