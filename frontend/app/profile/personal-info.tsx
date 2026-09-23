import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, Platform, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, User, Mail, Phone, Camera, ShieldCheck, Globe, Building, Award } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";
import API from "../../src/api/client";

export default function PersonalInfoScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  const divisionTitle = user?.tenant?.business_name || "Sector Division";

  const [name, setName] = useState(user?.name || (isSuperAdmin ? "Platform Super Admin" : "Sector Admin"));
  const [email, setEmail] = useState(user?.email || (isSuperAdmin ? "superadmin@clean.et" : "admin@clean.et"));
  const [phone, setPhone] = useState((user as any)?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      return Alert.alert("Required", "Full Name cannot be empty.");
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsSaving(true);
    try {
      if (updateUser) {
        await updateUser({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        });
      }

      setShowSuccess(true);
    } catch (e: any) {
      const resData = e?.response?.data;
      let msg = "Failed to update profile info.";
      if (resData?.errors) {
        const firstField = Object.keys(resData.errors)[0];
        if (firstField && Array.isArray(resData.errors[firstField]) && resData.errors[firstField].length > 0) {
          msg = resData.errors[firstField][0];
        } else if (resData.message) {
          msg = resData.message;
        }
      } else if (resData?.message) {
        msg = resData.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      Alert.alert("Error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(admin)/(tabs)/Profile" as any);
    }
  };

  const confirmSave = () => {
    setShowSuccess(false);
    handleBack();
  };

  const getInitials = (str: string) => {
    if (!str) return "SD";
    return str
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <LinearGradient colors={["#0B0F19", "#111827", "#1E1B4B"]} style={styles.container}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft color="#ffffff" size={26} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isSuperAdmin ? "Executive Personal Info" : `${divisionTitle} Profile`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── AVATAR & ROLE BADGE ── */}
        <View style={styles.avatarSection}>
          <LinearGradient
            colors={isSuperAdmin ? ["#4F46E5", "#10B981"] : ["#064E3B", "#047857"]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{getInitials(isSuperAdmin ? name : divisionTitle)}</Text>
            <Pressable style={styles.cameraIcon}>
              <Camera size={14} color="#ffffff" />
            </Pressable>
          </LinearGradient>

          <View style={[styles.roleBadge, !isSuperAdmin && { backgroundColor: "#10B98122", borderColor: "#10B98155" }]}>
            <Text style={[styles.roleBadgeText, !isSuperAdmin && { color: "#34D399" }]}>
              {isSuperAdmin ? "👑 SUPER ADMIN EXECUTIVE" : `🏢 ${divisionTitle.toUpperCase()} ADMIN`}
            </Text>
          </View>
        </View>

        {/* ── PROFILE FORM FIELDS ── */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Admin Full Name *</Text>
            <View style={styles.inputContainer}>
              <User size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter admin name"
                placeholderTextColor="#475569"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address (Read-Only)</Text>
            <View style={[styles.inputContainer, { opacity: 0.7 }]}>
              <Mail size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                editable={false}
                keyboardType="email-address"
                placeholder="Enter email"
                placeholderTextColor="#475569"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Contact Number</Text>
            <View style={styles.inputContainer}>
              <Phone size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="e.g. +251911..."
                placeholderTextColor="#475569"
              />
            </View>
          </View>

          {/* ── SCOPED READ-ONLY SECTOR INFORMATION ── */}
          {!isSuperAdmin ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sector Division Name</Text>
                <View style={styles.readOnlyContainer}>
                  <Building size={18} color="#34D399" style={styles.inputIcon} />
                  <Text style={[styles.readOnlyText, { color: "#34D399" }]}>
                    {divisionTitle} (Licensed Sector Division)
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Operational Status & Deployments</Text>
                <View style={styles.readOnlyContainer}>
                  <Award size={18} color="#60A5FA" style={styles.inputIcon} />
                  <Text style={styles.readOnlyText}>
                    Active & Licensed • Sub-Center Branch Operations Enabled
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Executive Role & Level</Text>
                <View style={styles.readOnlyContainer}>
                  <ShieldCheck size={18} color="#34D399" style={styles.inputIcon} />
                  <Text style={[styles.readOnlyText, { color: "#34D399" }]}>
                    Super Admin (Platform Governance & Master Control)
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Department & Access Scope</Text>
                <View style={styles.readOnlyContainer}>
                  <Globe size={18} color="#60A5FA" style={styles.inputIcon} />
                  <Text style={styles.readOnlyText}>
                    All Multi-Department Sector Divisions (Global Master Access)
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        <Pressable
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile Changes</Text>
          )}
        </Pressable>
      </ScrollView>

      <ActionModal
        visible={showSuccess}
        type="success"
        title="Profile Details Saved"
        message={`Your ${isSuperAdmin ? "executive" : divisionTitle} profile information has been updated.`}
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#ffffff" },
  backButton: { padding: 8 },
  content: { padding: 20 },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: { fontSize: 34, fontWeight: "bold", color: "#ffffff" },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1e293b",
    padding: 6,
    borderRadius: 12,
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
    marginTop: 10,
  },
  roleBadgeText: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "800",
  },
  form: { gap: 16, marginBottom: 24 },
  inputGroup: { gap: 4 },
  label: { color: "#94a3b8", fontSize: 12, fontWeight: "700", marginLeft: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 14,
  },
  readOnlyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#ffffff", paddingVertical: 12, fontSize: 14 },
  saveButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
});
