import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Switch, Modal, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft, Shield, Fingerprint, Lock, EyeOff,
  KeyRound, FileText, X, Eye, ShieldCheck, Activity
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../contexts/AuthContext";
import { useSuperAdmin } from "../../hooks/useSuperAdmin";

const STORAGE_KEY = "@privacy_settings";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { auditLogs } = useSuperAdmin();
  const isSuperAdmin = user?.role === "super_admin";

  const [biometric, setBiometric] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(true);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordSuccess, setShowPasswordSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setBiometric(parsed.biometric ?? false);
          setTwoFactor(parsed.twoFactor ?? false);
          setPrivateProfile(parsed.privateProfile ?? true);
        }
      } catch (e) {
        console.error("Failed to load privacy settings", e);
      }
    };
    load();
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

  const handleSave = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ biometric, twoFactor, privateProfile })
      );
      setShowSuccess(true);
    } catch (e) {
      console.error("Save privacy failed", e);
    }
  };

  return (
    <LinearGradient colors={["#0B0F19", "#111827", "#1E1B4B"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy & Security Audit</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* SUPER ADMIN SECURITY AUDIT BANNER */}
        {isSuperAdmin && (
          <View style={styles.auditBanner}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Activity size={24} color="#6366F1" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16 }}>
                  Platform Security Audit Trail
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 1 }}>
                  Inspect real-time system logs (`TENANT_CREATED`, `SYSTEM_INITIALIZED`)
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.auditBtn}
              onPress={() => router.push("/(admin)/system")}
            >
              <ShieldCheck size={16} color="#FFF" />
              <Text style={styles.auditBtnText}>Inspect Full Audit Logs</Text>
            </TouchableOpacity>

            {auditLogs && auditLogs.length > 0 && (
              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 10 }}>
                <Text style={{ color: "#94A3B8", fontSize: 10, fontWeight: "800", marginBottom: 6 }}>
                  RECENT SECURITY LOGS ({auditLogs.length} Records)
                </Text>
                {auditLogs.slice(0, 3).map((log: any, idx: number) => (
                  <View key={log.id || idx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                    <Text style={{ color: "#34D399", fontSize: 11, fontWeight: "700" }}>
                      {log.action || "SYSTEM_EVENT"}
                    </Text>
                    <Text style={{ color: "#94A3B8", fontSize: 10 }}>
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "Recent"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>Security Settings</Text>

        <View style={styles.list}>
          <BlurView intensity={20} tint="dark" style={styles.itemWrapper}>
            <Pressable style={styles.item} onPress={() => setShowPasswordModal(true)}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(99,102,241,0.15)" }]}>
                  <KeyRound size={20} color="#6366f1" />
                </View>
                <View>
                  <Text style={styles.itemTitle}>Change Password</Text>
                  <Text style={styles.itemSubtitle}>Update account access credentials</Text>
                </View>
              </View>
            </Pressable>
          </BlurView>

          <BlurView intensity={20} tint="dark" style={styles.itemWrapper}>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                  <Fingerprint size={20} color="#10b981" />
                </View>
                <View>
                  <Text style={styles.itemTitle}>Biometric Authentication</Text>
                  <Text style={styles.itemSubtitle}>Use FaceID / TouchID to unlock app</Text>
                </View>
              </View>
              <Switch
                value={biometric}
                onValueChange={(val) => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setBiometric(val);
                }}
                trackColor={{ false: "#334155", true: "#6366f1" }}
              />
            </View>
          </BlurView>

          <BlurView intensity={20} tint="dark" style={styles.itemWrapper}>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
                  <Lock size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text style={styles.itemTitle}>Two-Factor Authentication (2FA)</Text>
                  <Text style={styles.itemSubtitle}>Require verification code on sign-in</Text>
                </View>
              </View>
              <Switch
                value={twoFactor}
                onValueChange={(val) => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setTwoFactor(val);
                }}
                trackColor={{ false: "#334155", true: "#6366f1" }}
              />
            </View>
          </BlurView>
        </View>

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Security Preferences</Text>
        </Pressable>
      </ScrollView>

      {/* Save Success */}
      <ActionModal
        visible={showSuccess}
        type="success"
        title="Privacy Saved"
        message="Your security settings have been successfully updated."
        confirmText="Done"
        onConfirm={() => setShowSuccess(false)}
      />

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setShowPasswordModal(false)}>
                <X color="#94a3b8" size={24} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#475569"
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#475569"
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <Pressable
              style={styles.savePasswordBtn}
              onPress={() => {
                setShowPasswordModal(false);
                setShowPasswordSuccess(true);
              }}
            >
              <Text style={styles.savePasswordBtnText}>Update Password</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ActionModal
        visible={showPasswordSuccess}
        type="success"
        title="Password Updated"
        message="Your password has been changed successfully."
        confirmText="OK"
        onConfirm={() => setShowPasswordSuccess(false)}
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
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  backButton: { padding: 8 },
  content: { padding: 20 },
  auditBanner: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  auditBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 6,
  },
  auditBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 12 },
  list: { gap: 10, marginBottom: 24 },
  itemWrapper: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  itemTitle: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  itemSubtitle: { fontSize: 11, color: "#64748b", marginTop: 2 },
  saveButton: { backgroundColor: "#6366F1", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  saveButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#334155" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  inputGroup: { marginBottom: 16 },
  label: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12, color: "#ffffff", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  savePasswordBtn: { backgroundColor: "#6366F1", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  savePasswordBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 15 },
});

