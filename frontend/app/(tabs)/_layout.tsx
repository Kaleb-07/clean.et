import { Tabs } from "expo-router";
import { Home, Search, Calendar, User } from "lucide-react-native";
import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TabIconProps {
  IconComponent: React.ComponentType<any>;
  focused: boolean;
  isDark: boolean;
  primaryColor: string;
  primaryLight: string;
}

function TabIcon({ IconComponent, focused, isDark, primaryColor, primaryLight }: TabIconProps) {
  return (
    <View
      style={[
        styles.iconSquircle,
        focused && {
          backgroundColor: primaryLight,
        },
      ]}
    >
      <IconComponent
        size={20}
        color={focused ? primaryColor : isDark ? "#94A3B8" : "#64748B"}
        strokeWidth={focused ? 2.2 : 1.9}
      />
    </View>
  );
}

interface TabLabelProps {
  title: string;
  focused: boolean;
  isDark: boolean;
  primaryColor: string;
}

function TabLabel({ title, focused, isDark, primaryColor }: TabLabelProps) {
  return (
    <Text
      style={[
        styles.tabLabel,
        {
          color: focused ? primaryColor : isDark ? "#94A3B8" : "#64748B",
          fontWeight: focused ? "700" : "500",
        },
      ]}
    >
      {title}
    </Text>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = colors.isDark;
  const primaryColor = colors.primary;
  const primaryLight = colors.primaryLight;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: isDark ? 0 : 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 8,
          height: 62 + (insets.bottom > 0 ? insets.bottom : 8),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              IconComponent={Home}
              focused={focused}
              isDark={isDark}
              primaryColor={primaryColor}
              primaryLight={primaryLight}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              title="Home"
              focused={focused}
              isDark={isDark}
              primaryColor={primaryColor}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              IconComponent={Search}
              focused={focused}
              isDark={isDark}
              primaryColor={primaryColor}
              primaryLight={primaryLight}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              title="Explore"
              focused={focused}
              isDark={isDark}
              primaryColor={primaryColor}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: "Bookings",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              IconComponent={Calendar}
              focused={focused}
              isDark={isDark}
              primaryColor={primaryColor}
              primaryLight={primaryLight}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              title="Bookings"
              focused={focused}
              isDark={isDark}
              primaryColor={primaryColor}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              IconComponent={User}
              focused={focused}
              isDark={isDark}
              primaryColor={primaryColor}
              primaryLight={primaryLight}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              title="Profile"
              focused={focused}
              isDark={isDark}
              primaryColor={primaryColor}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconSquircle: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.1,
  },
});
