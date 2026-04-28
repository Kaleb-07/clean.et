import axios from "axios";
import { getToken } from "../services/authStorage";

const API = axios.create({
  baseURL: "http://your_computer_ip:8000/api/",
});

//php artisan serve --host=0.0.0.0 --port=8000
// attach token automatically
API.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;
