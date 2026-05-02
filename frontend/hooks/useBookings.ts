import { useState, useEffect, useCallback } from "react";
import API, { apiFetch } from "../src/api/client";

export type BookingStatus =
  | "pending"
  | "confirmed" | "in_progress"
  | "completed"
  | "cancelled";

export interface Booking {
  id: string;
  userId: string | null;
  serviceId: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
  createdAt: string;
  userName?: string | null;
  userEmail?: string | null;
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortNewestFirst = (list: Booking[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const loadBookings = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await apiFetch<Booking[]>("/bookings");
      setBookings(sortNewestFirst(data));
    } catch (err) {
      console.error("Failed to load bookings", err);
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const addBooking = useCallback(
    async (data: Omit<Booking, "id" | "createdAt" | "status" | "userId">) => {
      const created = await apiFetch<Booking>("/bookings", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setBookings((prev) => sortNewestFirst([created, ...prev]));
      return created;
    },
    [],
  );

  const updateBookingStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      const updated = await apiFetch<Booking>(`/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    },
    [],
  );

  const deleteBooking = useCallback(async (id: string) => {
    await apiFetch<{ ok: true }>(`/bookings/${id}`, { method: "DELETE" });
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const clearAllBookings = useCallback(async () => {
    await apiFetch<{ ok: true }>("/bookings", { method: "DELETE" });
    setBookings([]);
  }, []);

  const getBooking = useCallback(
    (id: string) => bookings.find((b) => b.id === id),
    [bookings],
  );

  return {
    bookings,
    isLoading,
    error,
    addBooking,
    updateBookingStatus,
    deleteBooking,
    clearAllBookings,
    getBooking,
    reload: loadBookings,
  };
}
