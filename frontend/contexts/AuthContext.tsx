import React, { createContext, useContext, useState, useEffect } from "react";
import * as authStorage from "../src/services/authStorage";
import API from "../src/api/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  async function loadStoredData() {
    try {
      const token = await authStorage.getToken();
      if (token) {
        // Verify token / get user profile
        const res = await API.get("/me");
        setUser(res.data.data.user);
      }
    } catch (e) {
      console.log("Failed to load auth state", e);
      await authStorage.removeToken();
    } finally {
      setIsLoading(false);
    }
  }

  const login = async (token: string, userData: User) => {
    await authStorage.saveToken(token);
    setUser(userData);
  };

  const logout = async () => {
    await authStorage.removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
