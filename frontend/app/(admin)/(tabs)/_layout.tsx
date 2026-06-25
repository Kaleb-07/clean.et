import { BlurView } from "expo-blur";
import { Tabs, Redirect } from "expo-router";
import { Home, Calendar, User } from "lucide-react-native";
import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  // ✅ Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // ✅ Not logged in
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // ✅ Restrict to super_admin and tenant_admin roles only
  const adminRoles = ["super_admin", "tenant_admin"];
  if (!adminRoles.includes(user.role)) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <ClassicTabLayout />;
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 0,
          elevation: 0,
          height: isIOS ? 88 : 64,
          paddingBottom: isIOS ? 28 : 12,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color }) => <Calendar size={22} color={color} />,
        }}
      />
      {/* ✅ FIX: lowercase route name */}
      <Tabs.Screen
        name="Profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
