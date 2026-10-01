import { Tabs, Redirect } from "expo-router";
import { LayoutDashboard, ClipboardList, User } from "lucide-react-native";
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

export default function StaffLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#080C14" }}>
        <ActivityIndicator color="#A78BFA" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;

  if (user.role !== "staff") {
    if (user.role === "super_admin" || user.role === "tenant_admin") {
      return <Redirect href="/(admin)/(tabs)/dashboard" />;
    }
    return <Redirect href="/(tabs)/home" />;
  }

  return <StaffTabLayout />;
}

function TabIcon({
  Icon,
  color,
  focused,
}: {
  Icon: React.ComponentType<any>;
  color: string;
  focused: boolean;
}) {
  return (
    <View
      style={{
        width: 44,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "rgba(167,139,250,0.15)" : "transparent",
        marginBottom: 2,
      }}
    >
      <Icon size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
    </View>
  );
}

function StaffTabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#A78BFA",
        tabBarInactiveTintColor: "#475569",
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: "#0D1117",
          borderTopWidth: 1,
          borderTopColor: "#1E293B",
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          height: 60 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={LayoutDashboard} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "My Tasks",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={ClipboardList} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={User} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
