import { useState, useEffect, useCallback } from "react";
import { apiFetch, setImpersonatedTenantId } from "../src/api/client";

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

export interface MonthlyRevenueTrend {
  month: string;
  gmv: number;
  commission: number;
}

export interface SuperAdminAnalytics {
  gmv: number;
  platform_commission?: number;
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
  category_distribution: Record<string, number>;
  revenue_trends?: MonthlyRevenueTrend[];
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
  sector_categories?: any;
}

export interface CreateTenantPayload {
  business_name: string;
  plan: string;
  categories_enabled: string[];
  admin_name?: string;
  admin_email?: string;
  admin_password?: string;
  admin_phone?: string;
}

export interface TenantPayout {
  id: number;
  tenant_id: number;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_payout: number;
  period_start: string;
  period_end: string;
  status: "pending" | "processing" | "paid" | "failed";
  payout_method: "telebirr" | "cbe" | "bank_transfer";
  reference_number?: string;
  notes?: string;
  processed_at?: string;
  created_at: string;
  tenant?: Tenant;
}

export interface GeneratePayoutsPayload {
  period_start: string;
  period_end: string;
  payout_method?: "telebirr" | "cbe" | "bank_transfer";
}

export interface UpdatePayoutStatusPayload {
  status: "pending" | "processing" | "paid" | "failed";
  reference_number?: string;
  notes?: string;
}

export interface BroadcastPayload {
  title: string;
  message: string;
  target: "all" | "tenant_admins" | "customers";
}

export function useSuperAdmin() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [analytics, setAnalytics] = useState<SuperAdminAnalytics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [payouts, setPayouts] = useState<TenantPayout[]>([]);
  const [impersonatedTenant, setImpersonatedTenant] = useState<Tenant | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tenantsData, analyticsData, healthData, settingsData, auditData, payoutsData] =
        await Promise.all([
          apiFetch<Tenant[]>("/tenants"),
          apiFetch<SuperAdminAnalytics>("/super-admin/analytics"),
          apiFetch<SystemHealth>("/super-admin/health"),
          apiFetch<SystemSettings>("/super-admin/settings"),
          apiFetch<any>("/super-admin/audit-logs"),
          apiFetch<any>("/super-admin/payouts"),
        ]);

      setTenants(tenantsData);
      setAnalytics(analyticsData);
      setHealth(healthData);
      setSettings(settingsData);
      setAuditLogs(Array.isArray(auditData) ? auditData : auditData.data || []);
      setPayouts(Array.isArray(payoutsData) ? payoutsData : payoutsData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load super admin data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const impersonateTenant = useCallback((tenant: Tenant | null) => {
    setImpersonatedTenant(tenant);
    setImpersonatedTenantId(tenant ? tenant.id : null);
  }, []);

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

  const deleteTenant = useCallback(
    async (id: number) => {
      await apiFetch<{ message: string }>(`/tenants/${id}`, {
        method: "DELETE",
      });
      setTenants((prev) => prev.filter((t) => t.id !== id));
      await loadAllData();
    },
    [loadAllData]
  );

  const generatePayouts = useCallback(
    async (payload: GeneratePayoutsPayload) => {
      const result = await apiFetch<any>("/super-admin/payouts/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await loadAllData();
      return result;
    },
    [loadAllData]
  );

  const updatePayoutStatus = useCallback(
    async (id: number, payload: UpdatePayoutStatusPayload) => {
      const updated = await apiFetch<TenantPayout>(`/super-admin/payouts/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setPayouts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      await loadAllData();
      return updated;
    },
    [loadAllData]
  );

  const sendBroadcast = useCallback(async (payload: BroadcastPayload) => {
    return await apiFetch<{ message: string; user_count: number }>("/super-admin/broadcast", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, []);

  return {
    tenants,
    analytics,
    health,
    auditLogs,
    settings,
    payouts,
    impersonatedTenant,
    impersonateTenant,
    isLoading,
    error,
    reload: loadAllData,
    createTenant: createTenantWithAdmin,
    createTenantWithAdmin,
    updateTenantStatus,
    updateTenant,
    deleteTenant,
    updateSystemSettings,
    generatePayouts,
    updatePayoutStatus,
    sendBroadcast,
  };
}
