import axios, { AxiosRequestConfig } from "axios";
import { getToken, removeToken } from "../services/authStorage.js";

const API = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

console.log("API Base URL:", process.env.EXPO_PUBLIC_API_URL);

let activeImpersonatedTenantId: number | null = null;

export function setImpersonatedTenantId(tenantId: number | null) {
  activeImpersonatedTenantId = tenantId;
}

export function getImpersonatedTenantId(): number | null {
  return activeImpersonatedTenantId;
}

// Attach token & X-Tenant-ID automatically
API.interceptors.request.use(async (config) => {
  const token = await getToken();

  config.headers = config.headers ?? {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (activeImpersonatedTenantId) {
    config.headers["X-Tenant-ID"] = String(activeImpersonatedTenantId);
  }

  return config;
});

// Auto-clean stale tokens on 401 Unauthorized
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await removeToken();
    }
    return Promise.reject(error);
  }
);

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
