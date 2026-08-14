import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../src/api/client";

export interface TenantAdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export interface Tenant {
  id: number;
  business_name: string;
  plan: "starter" | "growth" | "enterprise";
  categories_enabled: string[];
  status: "active" | "suspended";
  created_at: string;
  users?: TenantAdminUser[];
}

export interface SuperAdminAnalytics {
  gmv: number;
  currency: string;
  tenants: {
    total: number;
    active: number;
    suspended: number;
  };
  bookings: {
    total: number;
    breakdown: {
      pending: number;
      confirmed: number;
      in_progress: number;
      completed: number;
      cancelled: number;
    };
  };
  plan_distribution: {
    starter: number;
    growth: number;
    enterprise: number;
  };
  category_distribution: Record<string, number>;
  total_customers: number;
  total_staff: number;
  total_tenant_admins: number;
}

export interface SystemHealth {
  status: string;
  database: string;
  server_time: string;
  php_version: string;
  laravel_version: string;
  environment: string;
  recent_audits: AuditLogItem[];
}

export interface AuditLogItem {
  id: number;
  action: string;
  description: string;
  ip_address: string;
  metadata?: any;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface SystemSettings {
  default_currency: string;
  platform_commission_rate: number;
  support_email: string;
  maintenance_mode: boolean;
}

export interface CreateTenantPayload {
  business_name: string;
  plan: "starter" | "growth" | "enterprise";
  categories_enabled: string[];
  admin_name?: string;
  admin_email?: string;
  admin_password?: string;
  admin_phone?: string;
}

export function useSuperAdmin() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [analytics, setAnalytics] = useState<SuperAdminAnalytics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tenantsData, analyticsData, healthData, settingsData, auditData] =
        await Promise.all([
          apiFetch<Tenant[]>("/tenants"),
          apiFetch<SuperAdminAnalytics>("/super-admin/analytics"),
          apiFetch<SystemHealth>("/super-admin/health"),
          apiFetch<SystemSettings>("/super-admin/settings"),
          apiFetch<any>("/super-admin/audit-logs"),
        ]);

      setTenants(tenantsData);
      setAnalytics(analyticsData);
      setHealth(healthData);
      setSettings(settingsData);
      setAuditLogs(Array.isArray(auditData) ? auditData : auditData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load super admin data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const createTenantWithAdmin = useCallback(async (payload: CreateTenantPayload) => {
    const created = await apiFetch<Tenant>("/tenants", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setTenants((prev) => [created, ...prev]);
    await loadAllData();
    return created;
  }, [loadAllData]);

  const updateTenantStatus = useCallback(async (id: number, status: "active" | "suspended") => {
    const updated = await apiFetch<Tenant>(`/tenants/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setTenants((prev) => prev.map((t) => (t.id === id ? updated : t)));
    await loadAllData();
    return updated;
  }, [loadAllData]);

  const updateTenant = useCallback(
    async (id: number, payload: Partial<CreateTenantPayload>) => {
      const updated = await apiFetch<Tenant>(`/tenants/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setTenants((prev) => prev.map((t) => (t.id === id ? updated : t)));
      await loadAllData();
      return updated;
    },
    [loadAllData]
  );

  const updateSystemSettings = useCallback(
    async (newSettings: Partial<SystemSettings>) => {
      const updated = await apiFetch<SystemSettings>("/super-admin/settings", {
        method: "PUT",
        body: JSON.stringify(newSettings),
      });
      setSettings((prev) => (prev ? { ...prev, ...updated } : (updated as any)));
      await loadAllData();
      return updated;
    },
    [loadAllData]
  );

  return {
    tenants,
    analytics,
    health,
    auditLogs,
    settings,
    isLoading,
    error,
    reload: loadAllData,
    createTenantWithAdmin,
    updateTenantStatus,
    updateTenant,
    updateSystemSettings,
  };
}
