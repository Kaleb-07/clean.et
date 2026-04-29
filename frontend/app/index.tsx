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
import { useColors } from "../hooks/useColors";

// ✅ NEW: import icon
import { Droplet } from "lucide-react-native";

export default function SplashScreen() {
  const colors = useColors();

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // animation
    opacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.ease),
    });

    scale.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.ease),
    });

    // navigate after delay
    const timer = setTimeout(() => {
      router.replace("/(auth)/login");
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <LinearGradient colors={["#1a1b3a", "#6d28d9"]} style={styles.container}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.iconContainer}>
          {/* ✅ UPDATED ICON */}
          <Droplet size={64} color="#ffffff" />
        </View>

        <Text style={styles.title}>CarWash</Text>
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

    // ✅ optional polish (same as second code)
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 1.5,
  },
});
