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

import axios from "axios";
import API from "../../src/api/client";
import { useAuth } from "../../contexts/AuthContext";

// ─── Role-based route resolver ───────────────────────────────────────────────
function getHomeRoute(role: string): string {
  switch (role) {
    case "super_admin":
    case "tenant_admin":
      return "/(admin)/(tabs)/dashboard";
    case "staff":
      // Staff can also view admin bookings for now
      return "/(admin)/(tabs)/bookings";
    default:
      return "/(tabs)/home";
  }
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  // Toggle between phone and email login
  const [loginMode, setLoginMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, string> = { password };

      if (loginMode === "phone") {
        if (!phone.trim()) {
          setError("Phone number is required");
          setLoading(false);
          return;
        }
        payload.phone = phone.trim();
      } else {
        if (!email.trim()) {
          setError("Email is required");
          setLoading(false);
          return;
        }
        payload.email = email.trim();
      }

      const res = await API.post("/login", payload);

      const data = res.data.data || res.data;
      const token = data.token;
      const user = data.user;

      await login(token, user);

      router.replace(getHomeRoute(user.role) as any);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errors = err.response?.data?.errors;

        if (errors) {
          const firstError = (Object.values(errors)[0] as string[])?.[0];
          setError(firstError || "Login failed");
        } else {
          setError(err.response?.data?.message || "Login failed");
        }
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0a0a18", "#1f1145", "#4c1d95"]} style={{ flex: 1 }}>
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
                  onPress={() => setLoginMode("phone")}
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
                  onPress={() => setLoginMode("email")}
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
                      onChangeText={setPhone}
                      placeholder="9XX XXX XXXX"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="phone-pad"
                      style={[styles.input, styles.phoneInput]}
                    />
                  </View>
                </View>
              )}

              {/* EMAIL INPUT */}
              {loginMode === "email" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              )}

              {/* PASSWORD */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>

                <View style={styles.passwordContainer}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={[styles.input, styles.passwordInput]}
                  />

                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="rgba(255,255,255,0.6)"
                    />
                  </Pressable>
                </View>
              </View>

              {/* ERROR */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* BUTTON */}
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

              {/* FOOTER */}
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
    marginBottom: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
  },
  button: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
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
