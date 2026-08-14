import { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { router } from "expo-router";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { LinearGradient } from "expo-linear-gradient";
import { Droplet } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";

export default function SplashScreen() {
  const { user, isLoading } = useAuth();

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.ease),
    });
    scale.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.ease),
    });
  }, []);

  // Wait for auth to load, then route accordingly
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (user) {
        // Already logged in — route by role
        const role = user.role;
        if (role === "super_admin" || role === "tenant_admin") {
          router.replace("/(admin)/(tabs)/dashboard" as any);
        } else {
          router.replace("/(tabs)/home");
        }
      } else {
        router.replace("/(auth)/login");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoading, user]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <LinearGradient colors={["#1a1b3a", "#6d28d9"]} style={styles.container}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.iconContainer}>
          <Droplet size={64} color="#ffffff" />
        </View>
        <Text style={styles.title}>Clean.et</Text>
        <Text style={styles.tagline}>Professional Cleaning Services</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
