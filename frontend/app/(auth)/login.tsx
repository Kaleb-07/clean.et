import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import axios from "axios";

import API from "../../src/api/client";
import { useAuth } from "../../contexts/AuthContext";
import { useColors } from "../../hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Role-based route resolver ───────────────────────────────────────────────
function getHomeRoute(role: string): string {
  switch (role) {
    case "super_admin":
    case "tenant_admin":
    case "admin":
      return "/(admin)/(tabs)/dashboard";
    case "staff":
      return "/(admin)/(tabs)/bookings";
    default:
      return "/(tabs)/home";
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const colors = useColors();

  const [loginMode, setLoginMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const rawInput = (loginMode === "phone" ? phone : email).trim();

    if (!rawInput) {
      errors.identifier = loginMode === "phone" ? "Phone number is required" : "Email is required";
    } else if (rawInput.includes("@") || /[a-zA-Z]/.test(rawInput)) {
      if (!EMAIL_REGEX.test(rawInput)) {
        errors.identifier = "Please enter a valid email address";
      }
    } else {
      const cleanPhone = rawInput.replace(/\D/g, "");
      if (cleanPhone.length < 7) {
        errors.identifier = "Please enter a valid phone number or email";
      }
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setError(null);
    if (!validate()) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const rawInput = (loginMode === "phone" ? phone : email).trim();
      const payload: Record<string, string> = { password };

      if (rawInput.includes("@")) {
        payload.email = rawInput;
      } else {
        payload.phone = rawInput;
      }

      const res = await API.post("/login", payload);
      const data = res.data.data || res.data;
      const token = data.token;
      const user = data.user;

      await login(token, user);
      try {
        await AsyncStorage.setItem("@user_current_password", password);
      } catch {}

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(getHomeRoute(user.role) as any);
    } catch (err: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (axios.isAxiosError(err)) {
        const errors = err.response?.data?.errors;
        if (errors) {
          const firstError = (Object.values(errors)[0] as string[])?.[0];
          setError(firstError || "Invalid credentials");
        } else {
          setError(err.response?.data?.message || "Invalid phone/email or password");
        }
      } else {
        setError("Network error. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradients.auth} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>✨</Text>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Clean.et — Professional Cleaning Services
            </Text>
          </Animated.View>

          {/* CARD */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <BlurView intensity={40} tint="dark" style={styles.card}>

              {/* LOGIN MODE TOGGLE */}
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => {
                    setLoginMode("phone");
                    setError(null);
                    setFieldErrors({});
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                  }}
                  style={[
                    styles.toggleBtn,
                    loginMode === "phone" && styles.toggleBtnActive,
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={16}
                    color={loginMode === "phone" ? "#fff" : "rgba(255,255,255,0.5)"}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      loginMode === "phone" && styles.toggleTextActive,
                    ]}
                  >
                    Phone
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setLoginMode("email");
                    setError(null);
                    setFieldErrors({});
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                  }}
                  style={[
                    styles.toggleBtn,
                    loginMode === "email" && styles.toggleBtnActive,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color={loginMode === "email" ? "#fff" : "rgba(255,255,255,0.5)"}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      loginMode === "email" && styles.toggleTextActive,
                    ]}
                  >
                    Email
                  </Text>
                </Pressable>
              </View>

              {/* PHONE INPUT */}
              {loginMode === "phone" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>🇪🇹 +251</Text>
                    </View>
                    <TextInput
                      value={phone}
                      onChangeText={(val) => {
                        setPhone(val);
                        setError(null);
                        setFieldErrors((prev) => ({ ...prev, identifier: "" }));
                      }}
                      placeholder="9XX XXX XXXX"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="phone-pad"
                      style={[
                        styles.input,
                        styles.phoneInput,
                        !!fieldErrors.identifier && styles.inputError,
                      ]}
                    />
                  </View>
                  {!!fieldErrors.identifier && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.identifier}</Text>
                  )}
                </View>
              )}

              {/* EMAIL INPUT */}
              {loginMode === "email" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      setError(null);
                      setFieldErrors((prev) => ({ ...prev, identifier: "" }));
                    }}
                    placeholder="name@example.com"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      !!fieldErrors.identifier && styles.inputError,
                    ]}
                  />
                  {!!fieldErrors.identifier && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.identifier}</Text>
                  )}
                </View>
              )}

              {/* PASSWORD */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      setError(null);
                      setFieldErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={[
                      styles.input,
                      styles.passwordInput,
                      !!fieldErrors.password && styles.inputError,
                    ]}
                  />
                  <Pressable
                    onPress={() => {
                      setShowPassword(!showPassword);
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="rgba(255,255,255,0.6)"
                    />
                  </Pressable>
                </View>
                {!!fieldErrors.password && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
                )}
              </View>

              {/* GENERAL ERROR BANNER */}
              {!!error && (
                <Animated.View entering={FadeInDown} style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              {/* SIGN IN BUTTON */}
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.button,
                  pressed && { opacity: 0.8 },
                  loading && { opacity: 0.5 },
                ]}
              >
                <LinearGradient
                  colors={["#7c3aed", "#6d28d9"]}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* DEMO ACCOUNTS QUICK SELECTOR */}
              <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>
                  ⚡ Quick Demo Fill Accounts
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  <Pressable
                    onPress={() => {
                      setLoginMode("email");
                      setEmail("superadmin@clean.et");
                      setPassword("superpassword123");
                    }}
                    style={{ backgroundColor: "rgba(96, 165, 250, 0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "rgba(96, 165, 250, 0.3)" }}
                  >
                    <Text style={{ color: "#60A5FA", fontSize: 10, fontWeight: "700" }}>👑 Super Admin</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setLoginMode("email");
                      setEmail("carwash.admin@clean.et");
                      setPassword("admin123");
                    }}
                    style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.3)" }}
                  >
                    <Text style={{ color: "#34D399", fontSize: 10, fontWeight: "700" }}>🚗 Car Wash Admin (Solomon)</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setLoginMode("email");
                      setEmail("building.admin@clean.et");
                      setPassword("admin123");
                    }}
                    style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "rgba(245, 158, 11, 0.3)" }}
                  >
                    <Text style={{ color: "#FBBF24", fontSize: 10, fontWeight: "700" }}>🏢 Building Admin (Bethlehem)</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setLoginMode("email");
                      setEmail("tech2@clean.et");
                      setPassword("staff123");
                    }}
                    style={{ backgroundColor: "rgba(167, 139, 250, 0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "rgba(167, 139, 250, 0.3)" }}
                  >
                    <Text style={{ color: "#C084FC", fontSize: 10, fontWeight: "700" }}>👷 Staff (Dawit)</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setLoginMode("email");
                      setEmail("test@example.com");
                      setPassword("password123");
                    }}
                    style={{ backgroundColor: "rgba(236, 72, 153, 0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "rgba(236, 72, 153, 0.3)" }}
                  >
                    <Text style={{ color: "#F472B6", fontSize: 10, fontWeight: "700" }}>👤 Client (Test User)</Text>
                  </Pressable>
                </View>
              </View>

              {/* FOOTER LINK */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account?</Text>
                <Link href="/(auth)/register" asChild>
                  <Pressable>
                    <Text style={styles.link}> Create Account</Text>
                  </Pressable>
                </Link>
              </View>
            </BlurView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(139,92,246,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 16,
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: "rgba(139,92,246,0.4)",
  },
  toggleText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "#fff",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  fieldErrorText: {
    color: "#f87171",
    fontSize: 12,
    marginTop: 4,
  },
  phoneInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryCode: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  countryCodeText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "500",
  },
  button: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 6,
  },
  buttonGradient: {
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: "rgba(255,255,255,0.6)",
  },
  link: {
    color: "#a78bfa",
    fontWeight: "600",
  },
});
