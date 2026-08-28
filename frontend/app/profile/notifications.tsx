import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Platform, Alert, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Bell, MessageSquare, Tag, Info, Megaphone, Send } from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../contexts/AuthContext";

const STORAGE_KEY = "@notification_settings";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    push: true,
    orders: true,
    promo: false,
    updates: true,
  });

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

  const toggle = (key: keyof typeof settings) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setShowSuccess(true);
    } catch (e) {
      const msg = "Could not save notification preferences.";
      Platform.OS === "web" ? window.alert(msg) : Alert.alert("Error", msg);
    }
  };

  return (
    <LinearGradient colors={["#0B0F19", "#111827", "#1E1B4B"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* SUPER ADMIN BROADCAST CENTER BANNER */}
        {isSuperAdmin && (
          <View style={styles.broadcastBanner}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Megaphone size={24} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16 }}>
                  Platform Broadcast Sender
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 1 }}>
                  Dispatch push alerts to all accounts, managers & field staff
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <TouchableOpacity
                style={styles.broadcastBtnPrimary}
                onPress={() => router.push("/(admin)/broadcast")}
              >
                <Send size={16} color="#FFF" />
                <Text style={styles.broadcastBtnText}>Dispatch Broadcast</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.broadcastBtnSecondary}
                onPress={() => router.push("/(admin)/notifications")}
              >
                <Bell size={16} color="#F472B6" />
                <Text style={[styles.broadcastBtnText, { color: "#F472B6" }]}>Notifications Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.list}>
          <BlurView intensity={20} tint="dark" style={styles.itemWrapper}>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                  <Bell size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.itemTitle}>Push Notifications</Text>
                  <Text style={styles.itemSubtitle}>Receive instant push alerts on device</Text>
                </View>
              </View>
              <Switch
                value={settings.push}
                onValueChange={() => toggle("push")}
                trackColor={{ false: "#334155", true: "#10b981" }}
              />
            </View>
          </BlurView>

          <BlurView intensity={20} tint="dark" style={styles.itemWrapper}>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                  <MessageSquare size={20} color="#10b981" />
                </View>
                <View>
                  <Text style={styles.itemTitle}>Order & Booking Updates</Text>
                  <Text style={styles.itemSubtitle}>Real-time updates on active jobs</Text>
                </View>
              </View>
              <Switch
                value={settings.orders}
                onValueChange={() => toggle("orders")}
                trackColor={{ false: "#334155", true: "#10b981" }}
              />
            </View>
          </BlurView>

          <BlurView intensity={20} tint="dark" style={styles.itemWrapper}>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
                  <Tag size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text style={styles.itemTitle}>Promotions & Offers</Text>
                  <Text style={styles.itemSubtitle}>Special discounts and marketing news</Text>
                </View>
              </View>
              <Switch
                value={settings.promo}
                onValueChange={() => toggle("promo")}
                trackColor={{ false: "#334155", true: "#10b981" }}
              />
            </View>
          </BlurView>

          <BlurView intensity={20} tint="dark" style={styles.itemWrapper}>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(139,92,246,0.15)" }]}>
                  <Info size={20} color="#8b5cf6" />
                </View>
                <View>
                  <Text style={styles.itemTitle}>App System Updates</Text>
                  <Text style={styles.itemSubtitle}>New features and technical releases</Text>
                </View>
              </View>
              <Switch
                value={settings.updates}
                onValueChange={() => toggle("updates")}
                trackColor={{ false: "#334155", true: "#10b981" }}
              />
            </View>
          </BlurView>
        </View>

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Preferences</Text>
        </Pressable>
      </ScrollView>

      <ActionModal
        visible={showSuccess}
        type="success"
        title="Settings Saved"
        message="Your notification preferences have been saved to local storage."
        confirmText="Got it"
        onConfirm={() => setShowSuccess(false)}
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
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  backButton: { padding: 8 },
  content: { padding: 20 },
  broadcastBanner: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  broadcastBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  broadcastBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#F472B655",
  },
  broadcastBtnText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 12 },
  list: { gap: 10, marginBottom: 30 },
  itemWrapper: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  itemTitle: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  itemSubtitle: { fontSize: 11, color: "#64748b", marginTop: 2 },
  saveButton: { backgroundColor: "#10B981", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  saveButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
});
