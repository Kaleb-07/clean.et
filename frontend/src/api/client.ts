import axios, { AxiosRequestConfig } from "axios";
import { getToken } from "../services/authStorage.js";

const API = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

console.log("API Base URL:", process.env.EXPO_PUBLIC_API_URL);

// Attach token automatically
API.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;

/**
 * Helper to match the fetch-style API used in hooks.
 * Sends requests through the shared axios instance (token auto-attached).
 */
export async function apiFetch<T>(url: string, options: any = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();

  // Parse body string → object for axios's `data` field
  let requestData: any = undefined;
  if (options.body) {
    try {
      requestData =
        typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body;
    } catch (e) {
      requestData = options.body;
    }
  }

  // Build a clean axios config — do NOT spread `options` directly because
  // it contains `body` (a string) which would override the parsed `data`.
  const config: AxiosRequestConfig = {
    url,
    method,
    data: requestData,
  };

  const response = await API(config);

  // Support both { data: [...] } and bare array/object responses
  return response.data.data !== undefined ? response.data.data : response.data;
}
