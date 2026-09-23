import { useTheme } from "../contexts/ThemeContext";

export function useColors() {
  let isDark = true;
  try {
    const theme = useTheme();
    isDark = theme?.isDark ?? true;
  } catch {
    // Fallback if invoked outside ThemeProvider
    isDark = true;
  }

  if (isDark) {
    return {
      isDark: true,
      background: "#0B0F19",
      surface: "#111827",
      card: "#1E293B",
      cardBorder: "#334155",
      border: "#334155",
      primary: "#3B82F6",
      secondary: "#10B981",
      accent: "#059669",
      accentLight: "rgba(16, 185, 129, 0.15)",
      primaryLight: "rgba(59, 130, 246, 0.15)",
      text: "#FFFFFF",
      mutedForeground: "rgba(255, 255, 255, 0.6)",
      subtext: "#94A3B8",
      danger: "#EF4444",
      warning: "#F59E0B",
      success: "#10B981",
      info: "#3B82F6",
      inputBg: "#1E293B",
      inputBorder: "#334155",
      placeholder: "#64748B",
      chipBg: "rgba(255, 255, 255, 0.05)",
      chipBorder: "rgba(255, 255, 255, 0.1)",
      gradients: {
        background: ["#0B0F19", "#111827", "#1E293B"] as const,
        auth: ["#0a0a18", "#1f1145", "#0B0F19"] as const,
        primary: ["#3B82F6", "#2563EB"] as const,
        emerald: ["#10B981", "#059669"] as const,
        card: ["rgba(30, 41, 59, 0.8)", "rgba(15, 23, 42, 0.9)"] as const,
      },
    };
  }

  // Enterprise Crisp Bright / Light Mode Palette
  return {
    isDark: false,
    background: "#F8FAFC",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    cardBorder: "#E2E8F0",
    border: "#E2E8F0",
    primary: "#2563EB",
    secondary: "#10B981",
    accent: "#059669",
    accentLight: "rgba(16, 185, 129, 0.12)",
    primaryLight: "rgba(37, 99, 235, 0.1)",
    text: "#0F172A",
    mutedForeground: "#64748B",
    subtext: "#64748B",
    danger: "#EF4444",
    warning: "#F59E0B",
    success: "#10B981",
    info: "#3B82F6",
    inputBg: "#FFFFFF",
    inputBorder: "#CBD5E1",
    placeholder: "#94A3B8",
    chipBg: "#FFFFFF",
    chipBorder: "#E2E8F0",
    gradients: {
      background: ["#F8FAFC", "#F1F5F9", "#E2E8F0"] as const,
      auth: ["#EEF2FF", "#F8FAFC", "#F3E8FF"] as const,
      primary: ["#3B82F6", "#2563EB"] as const,
      emerald: ["#10B981", "#059669"] as const,
      card: ["#FFFFFF", "#F8FAFC"] as const,
    },
  };
}
