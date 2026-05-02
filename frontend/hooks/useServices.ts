import { useState, useEffect, useCallback } from "react";
import API, { apiFetch } from "../src/api/client";

import type { Service } from "../constants/services";

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<any[]>("/services");
      const mapped = data.map(s => ({
        ...s,
        id: s.id.toString(),
        duration: s.duration || 45,
        imageKey: s.image_key || s.imageKey || 'premium',
      }));
      setServices(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addService = useCallback(
    async (data: Omit<Service, "id">) => {
      const created = await apiFetch<Service>("/services", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setServices((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  const updateService = useCallback(
    async (id: string, data: Partial<Omit<Service, "id">>) => {
      const current = services.find((s) => s.id === id);
      if (!current) return;
      const merged = { ...current, ...data };
      const updated = await apiFetch<Service>(`/services/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: merged.name,
          description: merged.description,
          price: merged.price,
          duration: merged.duration,
          imageKey: merged.imageKey,
        }),
      });
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
    },
    [services],
  );

  const deleteService = useCallback(async (id: string) => {
    await apiFetch<{ ok: true }>(`/services/${id}`, { method: "DELETE" });
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const resetServices = useCallback(async () => {
    const data = await apiFetch<Service[]>("/services/reset", {
      method: "POST",
    });
    setServices(data);
  }, []);

  return {
    services,
    loading,
    error,
    reload: load,
    addService,
    updateService,
    deleteService,
    resetServices,
  };
}
