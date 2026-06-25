import { useState, useEffect, useCallback } from "react";
import API, { apiFetch } from "../src/api/client";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "driver_assigned"
  | "picked_up"
  | "in_progress"
  | "invoiced"
  | "completed"
  | "cancelled";

/**
 * Shape of a booking as returned by the API (snake_case from Laravel).
 */
export interface Booking {
  id: string;
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
  /** Legacy service (may be null for sector-based bookings) */
  service: {
    id: string;
    name: string;
    price: number;
  } | null;
  /** New: sector-based bookings */
  sector: {
    id: number;
    name: string;
    category_name: string;
  } | null;
  vehicle: {
    id: number;
    vehicle_class: string;
    plate_number: string | null;
    make: string | null;
    model: string | null;
  } | null;
  building_profile: {
    id: number;
    name: string;
    floor_count: number;
    area_sqm: number;
  } | null;
  requirement_data: Record<string, any> | null;
  estimated_price: number | null;
  booking_date: string;   // "YYYY-MM-DD"
  booking_time: string;   // "HH:MM" 24h
  status: BookingStatus;
  created_at: string;
}


/**
 * Convert "09:00 AM" / "01:30 PM" → "09:00" / "13:30"  (H:i, 24-hour)
 * so Laravel's date_format:H:i validation passes.
 */
function to24h(time12: string): string {
  const [timePart, modifier] = time12.split(" ");
  let [hours, minutes] = timePart.split(":");
  let h = parseInt(hours, 10);

  if (modifier === "AM") {
    if (h === 12) h = 0;                  // 12:xx AM → 00:xx
  } else {
    if (h !== 12) h += 12;               // x PM (not noon) → x+12
  }

  return `${String(h).padStart(2, "0")}:${minutes}`;
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortNewestFirst = (list: Booking[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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

  /**
   * Create a new booking.
   * Accepts the fields the UI works with and maps them to backend field names.
   * `timeSlot` should be "09:00 AM" format — it will be converted to 24h automatically.
   */
  const addBooking = useCallback(
    async (data: {
      serviceId?: string;
      sectorId?: number | string;
      date?: string;        // "YYYY-MM-DD"
      timeSlot?: string;    // "09:00 AM" format
      scheduledAt?: string; // ISO string
      requirementData?: Record<string, any>;
      vehicleId?: number | string;
      buildingProfileId?: number | string;
      recurring?: boolean;
      recurrenceRule?: string;
    }) => {
      const payload: Record<string, any> = {
        service_id:          data.serviceId,
        sector_id:           data.sectorId,
        booking_date:        data.date,
        booking_time:        data.timeSlot ? to24h(data.timeSlot) : undefined,
        scheduled_at:        data.scheduledAt,
        requirement_data:    data.requirementData,
        vehicle_id:          data.vehicleId,
        building_profile_id: data.buildingProfileId,
        recurring:           data.recurring,
        recurrence_rule:     data.recurrenceRule,
      };

      const created = await apiFetch<Booking>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setBookings((prev) => sortNewestFirst([created, ...prev]));
      return created;
    },
    [],
  );
  /**
   * Cancel a booking (customer action) — uses PATCH /bookings/{id}/cancel.
   */
  const cancelBooking = useCallback(async (id: string) => {
    const updated = await apiFetch<Booking>(`/bookings/${id}/cancel`, {
      method: "PATCH",
    });
    setBookings((prev) => prev.map((b) => (String(b.id) === String(id) ? updated : b)));
    return updated;
  }, []);

  /**
   * Update booking (Customer reschedule action) — uses PUT /bookings/{id}.
   */
  const updateBooking = useCallback(
    async (id: string, data: {
      date: string;
      timeSlot: string;
    }) => {
      const updated = await apiFetch<Booking>(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          booking_date: data.date,
          booking_time: to24h(data.timeSlot),
        }),
      });
      setBookings((prev) => prev.map((b) => (String(b.id) === String(id) ? updated : b)));
      return updated;
    },
    [],
  );

  /**
   * Update booking status (admin action) — uses PATCH /bookings/{id}/status.
   */
  const updateBookingStatus = useCallback(
    async (id: string, status: BookingStatus) => {
      const updated = await apiFetch<Booking>(`/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBookings((prev) => prev.map((b) => (String(b.id) === String(id) ? updated : b)));
      return updated;
    },
    [],
  );

  const deleteBooking = useCallback(async (id: string) => {
    await apiFetch<{ message: string }>(`/bookings/${id}`, { method: "DELETE" });
    setBookings((prev) => prev.filter((b) => String(b.id) !== String(id)));
  }, []);

  const getBooking = useCallback(
    (id: string) => bookings.find((b) => String(b.id) === String(id)),
    [bookings],
  );

  return {
    bookings,
    isLoading,
    error,
    addBooking,
    cancelBooking,
    updateBooking,
    updateBookingStatus,
    deleteBooking,
    getBooking,
    reload: loadBookings,
  };
}
