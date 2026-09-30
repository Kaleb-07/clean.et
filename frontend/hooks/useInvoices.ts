import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../src/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceStatus = "unpaid" | "paid" | "overdue" | "cancelled";
export type PaymentStatus = "pending" | "completed" | "paid" | "failed";
export type PaymentProvider =
  | "telebirr"
  | "cbe_birr"
  | "amole"
  | "stripe"
  | "cash"
  | "chapa";

export interface Payment {
  id: number;
  invoice_id: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  provider_reference: string | null;
  checkout_url: string | null;
  created_at: string;
}

export interface Invoice {
  id: number;
  amount: number;
  currency: string;
  period: string | null;
  status: InvoiceStatus;
  due_at: string | null;
  booking: {
    id: number;
    booking_date: string;
    sector_name: string | null;
  } | null;
  payments: Payment[];
  created_at: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = status ? `/invoices?status=${status}` : "/invoices";
      const res = await apiFetch<{ data: Invoice[] }>(url);
      // Backend paginates; unwrap `data` array
      setInvoices((res as any).data ?? (res as any));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load invoices."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Initiate a payment for a given invoice.
   * Returns the payment object which may contain a `checkout_url` for redirect.
   */
  const payInvoice = useCallback(
    async (
      invoiceId: number,
      provider: PaymentProvider,
      returnUrl?: string
    ): Promise<Payment> => {
      const payment = await apiFetch<Payment>("/payments", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: invoiceId,
          provider,
          return_url: returnUrl,
        }),
      });

      // Optimistically mark invoice as having a pending payment in local state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, payments: [...inv.payments, payment] }
            : inv
        )
      );

      return payment;
    },
    []
  );

  const verifyPayment = useCallback(
    async (paymentId: number): Promise<Payment> => {
      const verified = await apiFetch<Payment>(`/payments/${paymentId}/verify`, {
        method: "POST",
      });
      await load();
      return verified;
    },
    [load]
  );

  return {
    invoices,
    isLoading,
    error,
    reload: load,
    payInvoice,
    verifyPayment,
  };
}
