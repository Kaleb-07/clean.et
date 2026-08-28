import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, Platform, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, User, Mail, Phone, Camera, ShieldCheck, Globe } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";

export default function PersonalInfoScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  
  const [name, setName] = useState(user?.name || "Platform Super Admin");
  const [email, setEmail] = useState(user?.email || "superadmin@clean.et");
  const [phone, setPhone] = useState(user?.phone || "+251 91 123 4567");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsSaving(true);
    try {
      if (updateUser) {
        await updateUser({ name, email, phone });
      }
      setShowSuccess(true);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update profile info.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(admin)/(tabs)/Profile");
    }
  };

  const confirmSave = () => {
    setShowSuccess(false);
    handleBack();
  };

  return (
    <LinearGradient colors={["#0B0F19", "#111827", "#1E1B4B"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Personal Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <LinearGradient colors={["#4F46E5", "#10B981"]} style={styles.avatar}>
            <Text style={styles.avatarText}>{(name[0] || "S").toUpperCase()}</Text>
            <Pressable style={styles.cameraIcon}>
              <Camera size={16} color="#ffffff" />
            </Pressable>
          </LinearGradient>

          {isSuperAdmin && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>👑 SUPER ADMIN EXECUTIVE</Text>
            </View>
          )}
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#475569"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="Enter your email"
                placeholderTextColor="#475569"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Enter your phone number"
                placeholderTextColor="#475569"
              />
            </View>
          </View>

          {isSuperAdmin && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Executive Role & Level</Text>
                <View style={styles.readOnlyContainer}>
                  <ShieldCheck size={20} color="#34D399" style={styles.inputIcon} />
                  <Text style={[styles.readOnlyText, { color: "#34D399" }]}>
                    Super Admin (Platform Governance & Executive Control)
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Department & Access Scope</Text>
                <View style={styles.readOnlyContainer}>
                  <Globe size={20} color="#60A5FA" style={styles.inputIcon} />
                  <Text style={styles.readOnlyText}>
                    All Multi-Department Divisions (Global Access)
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        <Pressable style={[styles.saveButton, isSaving && { opacity: 0.7 }]} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>

      <ActionModal
        visible={showSuccess}
        type="success"
        title="Profile Updated"
        message="Your personal information has been successfully saved to your profile."
        confirmText="Done"
        onConfirm={confirmSave}
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
  content: { padding: 24 },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: { fontSize: 40, fontWeight: "bold", color: "#ffffff" },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1e293b",
    padding: 8,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#0b0b1f",
  },
  roleBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    marginTop: 12,
  },
  roleBadgeText: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "800",
  },
  form: { gap: 20, marginBottom: 32 },
  inputGroup: { gap: 6 },
  label: { color: "#94a3b8", fontSize: 13, fontWeight: "700", marginLeft: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
  },
  readOnlyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readOnlyText: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: "#ffffff", paddingVertical: 14, fontSize: 15 },
  saveButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
});
