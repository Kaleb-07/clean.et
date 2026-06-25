import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../src/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuildingProfile {
  id: number;
  name: string;
  area_sqm: number;
  floor_count: number;
  exterior_access_tier: "low_rise" | "mid_rise" | "high_rise";
  room_inventory: Record<string, number>;
  access_notes: string | null;
  booking_count: number;
  created_at: string;
}

export type CreateBuildingProfilePayload = {
  name: string;
  area_sqm: number;
  floor_count: number;
  access_notes?: string | null;
  room_inventory?: Record<string, number>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBuildingProfiles() {
  const [profiles, setProfiles] = useState<BuildingProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BuildingProfile[]>("/building-profiles");
      setProfiles(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load building profiles."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addProfile = useCallback(
    async (payload: CreateBuildingProfilePayload) => {
      const created = await apiFetch<BuildingProfile>("/building-profiles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setProfiles((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const updateProfile = useCallback(
    async (id: number, payload: Partial<CreateBuildingProfilePayload>) => {
      const updated = await apiFetch<BuildingProfile>(
        `/building-profiles/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );
      setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    []
  );

  const removeProfile = useCallback(async (id: number) => {
    await apiFetch<{ message: string }>(`/building-profiles/${id}`, {
      method: "DELETE",
    });
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    profiles,
    isLoading,
    error,
    reload: load,
    addProfile,
    updateProfile,
    removeProfile,
  };
}
