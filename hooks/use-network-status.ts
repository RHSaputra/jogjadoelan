"use client";

import { useState, useEffect, useCallback } from "react";

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;  // true jika baru saja reconnect
}

/**
 * useNetworkStatus — Monitor status koneksi internet.
 * 
 * Fitur:
 * - Deteksi online/offline secara real-time
 * - wasOffline flag — berguna untuk trigger re-fetch saat reconnect
 * - Aman untuk SSR (default online)
 * 
 * @example
 * const { isOnline, wasOffline } = useNetworkStatus();
 * 
 * useEffect(() => {
 *   if (wasOffline && isOnline) {
 *     // User baru reconnect — refresh data
 *     queryClient.invalidateQueries();
 *   }
 * }, [isOnline, wasOffline]);
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Reset wasOffline setelah 3 detik
      setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}

/**
 * useFetchWithRetry — Wrapper fetch dengan retry & timeout.
 * 
 * @example
 * const { fetchWithRetry } = useFetchWithRetry();
 * const data = await fetchWithRetry("/api/order", { method: "POST", body: JSON.stringify(x) });
 */
export function useFetchWithRetry() {
  const fetchWithRetry = useCallback(
    async (
      url: string,
      options: RequestInit = {},
      {
        maxRetries = 3,
        retryDelayMs = 1000,
        timeoutMs = 15_000,
      }: {
        maxRetries?: number;
        retryDelayMs?: number;
        timeoutMs?: number;
      } = {},
    ): Promise<Response> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const res = await fetch(url, {
            ...options,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Jangan retry jika error dari server (4xx) — hanya retry network errors & 5xx
          if (res.ok || (res.status >= 400 && res.status < 500)) {
            return res;
          }

          lastError = new Error(`HTTP ${res.status}`);
        } catch (err) {
          clearTimeout(timeoutId);
          if (err instanceof Error && err.name === "AbortError") {
            lastError = new Error("Request timeout");
          } else {
            lastError = err as Error;
          }
        }

        // Exponential backoff sebelum retry berikutnya
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, retryDelayMs * Math.pow(2, attempt)));
        }
      }

      throw lastError ?? new Error("Gagal melakukan request");
    },
    [],
  );

  return { fetchWithRetry };
}
