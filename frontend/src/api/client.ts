import axios, { AxiosRequestConfig } from "axios";
import { getToken } from "../services/authStorage";

const API = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

console.log("API Base URL:", process.env.EXPO_PUBLIC_API_URL);

// attach token automatically
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
 * Helper to match the fetch-style API used in new hooks
 */
export async function apiFetch<T>(url: string, options: any = {}): Promise<T> {
  const method = options.method || 'GET';
  
  // Handle body if it exists
  let requestData = undefined;
  if (options.body) {
    try {
      requestData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch (e) {
      requestData = options.body;
    }
  }

  const config: AxiosRequestConfig = {
    url,
    method,
    data: requestData,
    ...options
  };

  const response = await API(config);

  return response.data.data || response.data;
}
