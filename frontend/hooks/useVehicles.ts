import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../src/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VehicleClass =
  | "sedan"
  | "suv"
  | "van"
  | "truck"
  | "bus"
  | "motorcycle"
  | "other";

export interface Vehicle {
  id: number;
  vehicle_class: VehicleClass;
  plate_number: string | null;
  color: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  fleet_account_id: number | null;
  booking_count: number;
  created_at: string;
}

export type CreateVehiclePayload = Omit<
  Vehicle,
  "id" | "booking_count" | "created_at"
>;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Vehicle[]>("/vehicles");
      setVehicles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addVehicle = useCallback(async (payload: CreateVehiclePayload) => {
    const created = await apiFetch<Vehicle>("/vehicles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setVehicles((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateVehicle = useCallback(
    async (id: number, payload: Partial<CreateVehiclePayload>) => {
      const updated = await apiFetch<Vehicle>(`/vehicles/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setVehicles((prev) => prev.map((v) => (v.id === id ? updated : v)));
      return updated;
    },
    []
  );

  const removeVehicle = useCallback(async (id: number) => {
    await apiFetch<{ message: string }>(`/vehicles/${id}`, {
      method: "DELETE",
    });
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return {
    vehicles,
    isLoading,
    error,
    reload: load,
    addVehicle,
    updateVehicle,
    removeVehicle,
  };
}
