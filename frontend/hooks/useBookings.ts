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

  const mapBooking = (b: any): Booking => ({
    id: b.id.toString(),
    userId: b.customer?.id?.toString() || null,
    serviceId: b.service?.id?.toString() || b.service_id?.toString(),
    date: b.booking_date,
    timeSlot: b.booking_time,
    status: b.status,
    createdAt: b.created_at,
    userName: b.customer?.name,
    userEmail: b.customer?.email,
  });

  const sortNewestFirst = (list: Booking[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const loadBookings = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await apiFetch<any[]>("/bookings");
      setBookings(sortNewestFirst(data.map(mapBooking)));
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
    async (data: { serviceId: string; date: string; timeSlot: string }) => {
      // Convert "08:00 AM" to "08:00", "01:00 PM" to "13:00"
      let time = data.timeSlot;
      const [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString().padStart(2, '0');
      else hours = hours.padStart(2, '0');
      
      const formattedTime = `${hours}:${minutes}`;

      const payload = {
        service_id: parseInt(data.serviceId, 10),
        booking_date: data.date,
        booking_time: formattedTime,
      };


      const created = await apiFetch<any>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      

      const mapped = mapBooking(created);
      setBookings((prev) => sortNewestFirst([mapped, ...prev]));
      return mapped;
    },
    [],
  );

  const updateBooking = useCallback(
    async (id: string, data: { date: string; timeSlot: string }) => {
      // Convert time to 24h format
      let time = data.timeSlot;
      const [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString().padStart(2, '0');
      else hours = hours.padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;

      const payload = {
        booking_date: data.date,
        booking_time: formattedTime,
      };


      const updated = await apiFetch<any>(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });


      const mapped = mapBooking(updated);
      setBookings((prev) => 
        prev.map(b => b.id === id ? mapped : b)
      );
      return mapped;
    },
    [],
  );

  const deleteBooking = useCallback(
    async (id: string) => {
      try {
        await apiFetch<any>(`/bookings/${id}`, {
          method: "DELETE",
        });
        setBookings((prev) => prev.filter(b => b.id !== id));
      } catch (err) {
        console.error("[useBookings] Delete failed:", err);
        throw err;
      }
    },
    [],
  );

  const updateBookingStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      const updated = await apiFetch<any>(`/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      
      const mapped = mapBooking(updated);
      setBookings((prev) => 
        prev.map(b => b.id === id ? mapped : b)
      );
      return mapped;
    },
    [],
  );

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
    updateBooking,
    updateBookingStatus,
    deleteBooking,
    clearAllBookings,
    getBooking,
    reload: loadBookings,
  };
}
