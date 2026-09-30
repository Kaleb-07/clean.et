import { BlurView } from "expo-blur";
import { Tabs, Redirect } from "expo-router";
import { Home, Calendar, User } from "lucide-react-native";
import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const colors = useColors();

  // ✅ Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color="#10B981" />
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

interface AdminTabIconProps {
  Icon: React.ComponentType<any>;
  color: string;
  focused: boolean;
}

function AdminTabIcon({ Icon, color, focused }: AdminTabIconProps) {
  return (
    <View
      style={{
        width: 44,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "rgba(16, 185, 129, 0.15)" : "transparent",
        marginBottom: 2,
      }}
    >
      <Icon size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
    </View>
  );
}

function ClassicTabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 8;
  const colors = useColors();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: colors.subtext,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          height: 60 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("dashboard"),
          tabBarIcon: ({ color, focused }) => (
            <AdminTabIcon Icon={Home} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t("booking"),
          tabBarIcon: ({ color, focused }) => (
            <AdminTabIcon Icon={Calendar} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, focused }) => (
            <AdminTabIcon Icon={User} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}