import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";

// In-memory cache for the token (more secure on Web than localStorage)
let memoryToken = null;

export const saveToken = async (token) => {
  try {
    memoryToken = token;
    if (Platform.OS === "web") {
      // We avoid AsyncStorage/localStorage for the token on web to prevent XSS exfiltration.
      // If persistence across refreshes is required, httpOnly cookies should be implemented on the backend.
      return; 
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("Error saving token:", error);
  }
};

export const getToken = async () => {
  try {
    if (memoryToken) return memoryToken;

    if (Platform.OS === "web") {
      // Token is only held in memory for Web
      return memoryToken;
    } else {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      memoryToken = token;
      return token;
    }
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    memoryToken = null;
    if (Platform.OS === "web") {
      return;
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error removing token:", error);
  }
};
