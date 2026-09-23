import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColors } from "../hooks/useColors";
import { AuthProvider } from "../contexts/AuthContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { ThemeProvider } from "../contexts/ThemeContext";

// Global web style reset to eliminate default browser focus outline boxes & borders on all inputs
if (Platform.OS === "web" && typeof document !== "undefined") {
  const styleId = "clean-et-global-input-reset";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      input, textarea, select {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        border: none !important;
        border-style: none !important;
        border-width: 0px !important;
        box-shadow: none !important;
      }
      input:focus, textarea:focus, select:focus {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        border: none !important;
        border-style: none !important;
        border-width: 0px !important;
        box-shadow: none !important;
      }
      *:focus {
        outline: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// ✅ FIX: handle async safely
void SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const colors = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        {/* Splash / Auth Guard */}
        <Stack.Screen name="index" />

        {/* Auth Screens */}
        <Stack.Screen name="(auth)" />

        {/* Customer Main App */}
        <Stack.Screen name="(tabs)" />

        {/* Booking Flows */}
        <Stack.Screen name="booking/[sectorId]" />
        <Stack.Screen name="booking/[serviceId]" />
        <Stack.Screen name="booking/status/[bookingId]" />
        <Stack.Screen name="booking/edit/[id]" />

        {/* Customer Detail Screens */}
        <Stack.Screen name="invoices/index" />
        <Stack.Screen name="invoices/[id]" />
        <Stack.Screen name="vehicles/index" />
        <Stack.Screen name="building-profiles/index" />
        <Stack.Screen name="profile/index" />

        {/* Admin Panel */}
        <Stack.Screen name="(admin)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // ✅ FIX: prevent unhandled promise rejection
      void SplashScreen.hideAsync().catch((err) => {
        console.warn("Splash hide error:", err);
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootNavigator />
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
