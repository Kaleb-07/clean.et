import React, { createContext, useContext, useState, useEffect } from "react";
import * as authStorage from "../src/services/authStorage";
import API from "../src/api/client";

// ─── User type matching AuthResource response ──────────────────────────────
export interface User {
  id: string;
  tenant_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  role: "super_admin" | "tenant_admin" | "staff" | "customer";
  language: string;
  push_token?: string | null;
  tenant?: {
    id: number | string;
    business_name?: string;
    categories_enabled?: string[];
    plan?: string;
    status?: string;
  } | null;
}

// ─── Helpers to check roles without scattering string comparisons ──────────
export function isAdminRole(role: string): boolean {
  return role === "super_admin" || role === "tenant_admin";
}

export function isStaffRole(role: string): boolean {
  return role === "staff";
}

// ─── Context type ──────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<Pick<User, "name" | "email" | "phone" | "language" | "push_token">>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  const syncPushToken = async () => {
    try {
      const { registerForPushNotificationsAsync } = require("../src/utils/notifications");
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await API.put("/me", { push_token: token });
      }
    } catch (e) {
      console.log("Could not register push token:", e);
    }
  };

  async function loadStoredData() {
    try {
      const token = await authStorage.getToken();
      if (token) {
        const res = await API.get("/me");
        const payload = res.data.data || res.data;
        setUser(payload.user || payload);
        syncPushToken();
      }
    } catch (e) {
      // Stale or expired token stored — remove it and send to login
      await authStorage.removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  const login = async (token: string, userData: User) => {
    await authStorage.saveToken(token);
    setUser(userData);
    syncPushToken();
  };

  const logout = async () => {
    try {
      await API.post("/logout");
    } catch {
      // Token may already be invalid — ignore
    }
    await authStorage.removeToken();
    setUser(null);
  };

  const updateUser = async (data: Partial<Pick<User, "name" | "email" | "phone" | "language" | "push_token">>) => {
    const res = await API.put("/me", data);
    const payload = res.data.data || res.data;
    setUser(payload.user || payload);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
