import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// Configure notification behavior when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  if (!Device.isDevice) {
    console.warn("Must use physical device for Push Notifications");
    return null;
  }

  try {
    const permResponse: any = await Notifications.getPermissionsAsync();
    let finalStatus = permResponse?.status;

    if (finalStatus !== "granted") {
      const reqResponse: any = await Notifications.requestPermissionsAsync();
      finalStatus = reqResponse?.status;
    }

    if (finalStatus !== "granted") {
      console.warn("Failed to get push token for push notification!");
      return null;
    }

    // EAS Project ID is required for Expo Push Notifications
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#8b5cf6",
      });
    }

    return token;
  } catch (error) {
    console.error("Error registering push notifications:", error);
    return null;
  }
}
