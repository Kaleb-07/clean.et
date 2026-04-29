import axios from "axios";
import { getToken } from "../services/authStorage";

const API = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

//php artisan serve --host=0.0.0.0 --port=8000
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
