import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../src/api/client";
import type { Category } from "../constants/categories";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<Category[]>("/categories");
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const estimatePrice = useCallback(
    async (sectorId: number | string, requirementData: Record<string, any>) => {
      try {
        const result = await apiFetch<{ price: number; currency: string }>(
          `/sectors/${sectorId}/price`,
          {
            method: "POST",
            body: JSON.stringify({ requirement_data: requirementData }),
          }
        );
        return result;
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "Price estimation failed");
      }
    },
    []
  );

  return {
    categories,
    loading,
    error,
    reload: load,
    estimatePrice,
  };
}
