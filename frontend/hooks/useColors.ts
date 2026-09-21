export function useColors() {
  return {
    background: "#0B0F19",
    surface: "#111827",
    card: "#1F2937",
    cardBorder: "#374151",
    border: "#374151",
    primary: "#3B82F6",
    secondary: "#10B981",
    accent: "#059669",
    accentLight: "rgba(16, 185, 129, 0.15)",
    primaryLight: "rgba(59, 130, 246, 0.15)",
    text: "#FFFFFF",
    mutedForeground: "rgba(255, 255, 255, 0.6)",
    subtext: "#9CA3AF",
    danger: "#EF4444",
    warning: "#F59E0B",
    success: "#10B981",
    info: "#3B82F6",
    gradients: {
      background: ["#0B0F19", "#111827", "#1E293B"] as const,
      auth: ["#0a0a18", "#1f1145", "#0B0F19"] as const,
      primary: ["#3B82F6", "#2563EB"] as const,
      emerald: ["#10B981", "#059669"] as const,
      card: ["rgba(31, 41, 55, 0.7)", "rgba(17, 24, 39, 0.8)"] as const,
    },
  };
}

