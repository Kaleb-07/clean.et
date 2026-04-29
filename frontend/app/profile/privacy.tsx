import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Switch, Modal, TextInput } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft, Shield, Fingerprint, Lock, EyeOff,
  KeyRound, FileText, X, Eye, EyeIcon
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@privacy_settings";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  // Toggle states
  const [biometric, setBiometric] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [confirm2FAVisible, setConfirm2FAVisible] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordSuccess, setShowPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Load saved settings
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
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
  };

  const handleSave = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        biometric,
        twoFactor,
        privateProfile,
      }));
      setShowSuccess(true);
    } catch (e) {
      console.error("Failed to save privacy settings", e);
    }
  };

  const handleToggle2FA = (val: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (val) {
      // Show confirmation before enabling 2FA
      setConfirm2FAVisible(true);
    } else {
      setTwoFactor(false);
    }
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(true);
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setPasswordError(false);
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordSuccess(true);
  };

  if (isLoading) return null;

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.shieldBox}>
            <Shield size={40} color="#ffffff" />
          </View>
          <Text style={styles.heroTitle}>Your Security is Our Priority</Text>
          <Text style={styles.heroDesc}>
            We use industry-standard encryption to protect your data and transactions.
          </Text>
        </View>

        {/* TOGGLES */}
        <Text style={styles.sectionTitle}>Security Settings</Text>
        <BlurView intensity={20} tint="dark" style={styles.section}>
          {/* Biometric */}
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(16,185,129,0.1)" }]}>
                <Fingerprint size={20} color="#10b981" />
              </View>
              <View>
                <Text style={styles.label}>Biometric Login</Text>
                <Text style={styles.sublabel}>Use fingerprint or Face ID</Text>
              </View>
            </View>
            <Switch
              value={biometric}
              onValueChange={(val) => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setBiometric(val);
              }}
              trackColor={{ false: "#1e293b", true: "#10b981" }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.separator} />

          {/* 2FA */}
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(59,130,246,0.1)" }]}>
                <Lock size={20} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.label}>Two-Factor Auth</Text>
                <Text style={styles.sublabel}>Extra layer of sign-in security</Text>
              </View>
            </View>
            <Switch
              value={twoFactor}
              onValueChange={handleToggle2FA}
              trackColor={{ false: "#1e293b", true: "#3b82f6" }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.separator} />

          {/* Private Profile */}
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(245,158,11,0.1)" }]}>
                <EyeOff size={20} color="#f59e0b" />
              </View>
              <View>
                <Text style={styles.label}>Private Profile</Text>
                <Text style={styles.sublabel}>Hide your profile from others</Text>
              </View>
            </View>
            <Switch
              value={privateProfile}
              onValueChange={(val) => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setPrivateProfile(val);
              }}
              trackColor={{ false: "#1e293b", true: "#f59e0b" }}
              thumbColor="#ffffff"
            />
          </View>
        </BlurView>

        {/* ACTIONS */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Account Actions</Text>
        <BlurView intensity={20} tint="dark" style={styles.section}>
          <Pressable style={styles.item} onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            setShowPasswordModal(true);
          }}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(109,40,217,0.1)" }]}>
                <KeyRound size={20} color="#8b5cf6" />
              </View>
              <Text style={styles.label}>Change Password</Text>
            </View>
            <ChevronLeft size={18} color="#475569" style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>

          <View style={styles.separator} />

          <Pressable style={styles.item} onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            setShowPolicyModal(true);
          }}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(236,72,153,0.1)" }]}>
                <FileText size={20} color="#ec4899" />
              </View>
              <Text style={styles.label}>Privacy Policy</Text>
            </View>
            <ChevronLeft size={18} color="#475569" style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressable>
        </BlurView>

        {/* SAVE BUTTON */}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Security Settings</Text>
        </Pressable>
      </ScrollView>

      {/* ── CHANGE PASSWORD MODAL ── */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.formContainer}>
            <BlurView intensity={90} tint="dark" style={styles.formContent}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Change Password</Text>
                <Pressable onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordError(false);
                }}>
                  <X color="#94a3b8" size={24} />
                </Pressable>
              </View>

              {passwordError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>Please fill all fields and make sure passwords match.</Text>
                </View>
              )}

              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#475569"
                    secureTextEntry={!showCurrent}
                  />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowCurrent(!showCurrent)}>
                    {showCurrent ? <Eye size={18} color="#64748b" /> : <EyeOff size={18} color="#64748b" />}
                  </Pressable>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#475569"
                    secureTextEntry={!showNew}
                  />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowNew(!showNew)}>
                    {showNew ? <Eye size={18} color="#64748b" /> : <EyeOff size={18} color="#64748b" />}
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  secureTextEntry
                />
              </View>

              <Pressable style={styles.saveBtn} onPress={handleChangePassword}>
                <Text style={styles.saveBtnText}>Update Password</Text>
              </Pressable>
            </BlurView>
          </View>
        </View>
      </Modal>

      {/* ── PRIVACY POLICY MODAL ── */}
      <Modal visible={showPolicyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.formContainer, { maxHeight: "80%" }]}>
            <BlurView intensity={90} tint="dark" style={styles.formContent}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Privacy Policy</Text>
                <Pressable onPress={() => setShowPolicyModal(false)}>
                  <X color="#94a3b8" size={24} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.policyText}>
                  <Text style={styles.policyHeading}>1. Data Collection{"\n"}</Text>
                  We collect personal information such as name, email, and phone number solely to provide our car wash booking services.{"\n\n"}

                  <Text style={styles.policyHeading}>2. Data Usage{"\n"}</Text>
                  Your data is used only to process bookings, send notifications, and improve our services. We never sell your data to third parties.{"\n\n"}

                  <Text style={styles.policyHeading}>3. Data Security{"\n"}</Text>
                  All data is encrypted using industry-standard TLS protocols. Payment data is handled via Chapa's secure gateway and is never stored on our servers.{"\n\n"}

                  <Text style={styles.policyHeading}>4. Your Rights{"\n"}</Text>
                  You have the right to access, modify, or delete your personal data at any time by contacting our support team.{"\n\n"}

                  <Text style={styles.policyHeading}>5. Contact{"\n"}</Text>
                  For any privacy-related questions, contact us at privacy@carwash.com.
                </Text>
              </ScrollView>
            </BlurView>
          </View>
        </View>
      </Modal>

      {/* ── CONFIRM 2FA MODAL ── */}
      <ActionModal
        visible={confirm2FAVisible}
        type="info"
        title="Enable Two-Factor Auth?"
        message="This adds an extra verification step every time you sign in. You'll need your phone to log in."
        confirmText="Enable"
        cancelText="Cancel"
        onConfirm={() => { setTwoFactor(true); setConfirm2FAVisible(false); }}
        onCancel={() => setConfirm2FAVisible(false)}
      />

      {/* ── PASSWORD CHANGED ── */}
      <ActionModal
        visible={showPasswordSuccess}
        type="success"
        title="Password Updated"
        message="Your password has been successfully changed. Use your new password next time you log in."
        confirmText="Done"
        onConfirm={() => setShowPasswordSuccess(false)}
      />

      {/* ── SETTINGS SAVED ── */}
      <ActionModal
        visible={showSuccess}
        type="success"
        title="Settings Saved"
        message="Your privacy and security preferences have been updated and saved."
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
  content: { padding: 24, paddingBottom: 60 },
  hero: { alignItems: "center", marginBottom: 32 },
  shieldBox: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#6d28d9", justifyContent: "center", alignItems: "center", marginBottom: 16, shadowColor: "#6d28d9", shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  heroTitle: { color: "#ffffff", fontSize: 18, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  heroDesc: { color: "#94a3b8", fontSize: 13, textAlign: "center", lineHeight: 20 },
  sectionTitle: { color: "#64748b", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", marginBottom: 12, marginLeft: 4, letterSpacing: 1 },
  section: { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  label: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  sublabel: { color: "#475569", fontSize: 12, marginTop: 2 },
  separator: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 16 },
  saveBtn: { backgroundColor: "#6d28d9", paddingVertical: 18, borderRadius: 18, alignItems: "center", marginTop: 32, shadowColor: "#6d28d9", shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  saveBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  formContainer: { borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  formContent: { padding: 32, paddingBottom: 50 },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  formTitle: { fontSize: 22, fontWeight: "bold", color: "#ffffff" },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8, marginLeft: 4 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  textInput: { flex: 1, color: "#ffffff", padding: 16, fontSize: 16, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  eyeBtn: { padding: 16 },
  errorBox: { backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  errorText: { color: "#ef4444", fontSize: 13 },
  policyText: { color: "#94a3b8", fontSize: 14, lineHeight: 24 },
  policyHeading: { color: "#ffffff", fontWeight: "bold", fontSize: 15 },
});
