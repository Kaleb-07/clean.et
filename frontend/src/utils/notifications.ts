import { Platform } from "react-native";
import Constants from "expo-constants";

// Push notifications are NOT supported in Expo Go since SDK 53.
// We must avoid importing expo-notifications at all in Expo Go,
// because the import itself triggers the warning/error at module load time.
const isExpoGo = Constants.appOwnership === "expo";

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Skip entirely in Expo Go, web, or non-device environments
  if (isExpoGo || Platform.OS === "web") {
    return null;
  }

  try {
    // Lazy require — only loaded when NOT in Expo Go
    const Device = require("expo-device");
    if (!Device.isDevice) {
      return null;
    }

    const Notifications = require("expo-notifications");

    const permResponse = await Notifications.getPermissionsAsync();
    let finalStatus = permResponse?.status;

    if (finalStatus !== "granted") {
      const reqResponse = await Notifications.requestPermissionsAsync();
      finalStatus = reqResponse?.status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#8b5cf6",
      });
    }

    return tokenData.data ?? null;
  } catch {
    return null;
  }
}

export function setupNotificationHandler(): void {
  if (isExpoGo || Platform.OS === "web") {
    return;
  }

  try {
    const Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // silently skip
  }
}
