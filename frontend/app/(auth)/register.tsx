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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Ethiopian Phone Formatter ────────────────────────────────────────────────
function formatEthiopianPhone(input: string): string {
  let cleaned = input.trim().replace(/\s+/g, "");
  if (cleaned.startsWith("+251")) {
    return cleaned;
  }
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith("251")) {
    return "+" + cleaned;
  }
  return "+251" + cleaned;
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Full name is required";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (cleanPhone.length < 9) {
      errors.phone = "Please enter a valid phone number (at least 9 digits)";
    }

    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    setError(null);
    if (!validate()) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const formattedPhone = formatEthiopianPhone(phone);

    try {
      const res = await API.post("/register", {
        name: name.trim(),
        phone: formattedPhone,
        email: email.trim() || undefined,
        password,
        password_confirmation: confirmPassword,
      });

      const data = res.data.data || res.data;
      const token = data.token;
      const user = data.user;

      if (token && user) {
        await login(token, user);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)/home");
      } else {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(auth)/login");
      }
    } catch (err: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (axios.isAxiosError(err)) {
        const errors = err.response?.data?.errors;

        if (errors) {
          const firstError = (Object.values(errors)[0] as string[])?.[0];
          setError(firstError || "Registration failed");
        } else {
          setError(err.response?.data?.message || "Registration failed");
        }
      } else {
        setError("Network error. Please check your connection.");
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
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>✨</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Clean.et — Professional Cleaning Services
            </Text>
          </Animated.View>

          {/* CARD */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <BlurView intensity={40} tint="dark" style={styles.card}>
              {/* NAME */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    setError(null);
                    setFieldErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="Abebe Bikila"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={[styles.input, !!fieldErrors.name && styles.inputError]}
                />
                {!!fieldErrors.name && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>
                )}
              </View>

              {/* PHONE INPUT */}
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
                      setFieldErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    placeholder="9XX XXX XXXX"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="phone-pad"
                    style={[styles.input, styles.phoneInput, !!fieldErrors.phone && styles.inputError]}
                  />
                </View>
                {!!fieldErrors.phone && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.phone}</Text>
                )}
              </View>

              {/* EMAIL */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email (Optional)</Text>
                <TextInput
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setError(null);
                    setFieldErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  placeholder="name@example.com"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, !!fieldErrors.email && styles.inputError]}
                />
                {!!fieldErrors.email && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
                )}
              </View>

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
                    style={[styles.input, styles.passwordInput, !!fieldErrors.password && styles.inputError]}
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

              {/* CONFIRM PASSWORD */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    setError(null);
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={[styles.input, !!fieldErrors.confirmPassword && styles.inputError]}
                />
                {!!fieldErrors.confirmPassword && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
                )}
              </View>

              {/* GENERAL ERROR BANNER */}
              {!!error && (
                <Animated.View entering={FadeInDown} style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              {/* REGISTER BUTTON */}
              <Pressable
                onPress={handleRegister}
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
                    <Text style={styles.buttonText}>Register Account</Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* FOOTER */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable>
                    <Text style={styles.link}> Login</Text>
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
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#fff",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  countryCodeText: {
    color: "#fff",
    fontWeight: "600",
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
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
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
    fontWeight: "600",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 4,
  },
  footerText: {
    color: "rgba(255,255,255,0.7)",
  },
  link: {
    color: "#a78bfa",
    fontWeight: "600",
  },
});
