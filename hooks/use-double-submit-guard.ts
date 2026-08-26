"use client";

import { useRef, useState, useCallback } from "react";

/**
 * useDoubleSubmitGuard — Mencegah double submit pada form transaksi.
 * 
 * Fitur:
 * - Mencegah duplikasi request saat user klik 2x
 * - Timeout otomatis untuk unlock (default 30 detik)
 * - Loading state bawaan
 * 
 * @example
 * const { isSubmitting, guard } = useDoubleSubmitGuard();
 * 
 * const handleCheckout = guard(async () => {
 *   await createOrder(data);
 * });
 * 
 * return <button onClick={handleCheckout} disabled={isSubmitting}>
 *   {isSubmitting ? "Memproses..." : "Bayar Sekarang"}
 * </button>;
 */
export function useDoubleSubmitGuard(timeoutMs = 30_000) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Bungkus fungsi async dengan guard.
   * Jika masih dalam proses → langsung return (skip duplikat).
   */
  const guard = useCallback(
    <T>(fn: () => Promise<T>): (() => Promise<T | undefined>) => {
      return async () => {
        if (lockRef.current) {
          // Double submit terdeteksi — abaikan
          return undefined;
        }

        lockRef.current = true;
        setIsSubmitting(true);

        // Timeout safety — unlock setelah N detik kalau terjadi hang
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          lockRef.current = false;
          setIsSubmitting(false);
        }, timeoutMs);

        try {
          const result = await fn();
          return result;
        } finally {
          lockRef.current = false;
          setIsSubmitting(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }
      };
    },
    [timeoutMs],
  );

  /**
   * Reset manual — jika perlu unlock dari luar
   */
  const reset = useCallback(() => {
    lockRef.current = false;
    setIsSubmitting(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { isSubmitting, guard, reset };
}

/**
 * useIdempotentSubmit — Versi dengan idempotency key.
 * 
 * Setiap submit diberi unique key yang dikirim ke server.
 * Server dapat mendeteksi request duplikat berdasarkan key ini.
 * 
 * @example
 * const { idempotencyKey, resetKey, ...guard } = useIdempotentSubmit();
 * 
 * // Sertakan idempotencyKey di request body/header
 * await api.post("/api/order", { ...data, idempotencyKey });
 */
export function useIdempotentSubmit(timeoutMs = 30_000) {
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const base = useDoubleSubmitGuard(timeoutMs);

  const resetKey = useCallback(() => {
    setIdempotencyKey(crypto.randomUUID());
    base.reset();
  }, [base]);

  return { ...base, idempotencyKey, resetKey };
}
