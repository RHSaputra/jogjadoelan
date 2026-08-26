"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useDebounce — Debounce sebuah nilai.
 * 
 * Berguna untuk search input agar tidak hit API setiap keystroke.
 * 
 * @param value  Nilai yang akan di-debounce
 * @param delay  Delay dalam ms (default: 400ms)
 * 
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 400);
 * useEffect(() => {
 *   // Hanya jalan setelah user berhenti mengetik 400ms
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback — Debounce sebuah fungsi.
 * 
 * @param fn     Fungsi yang akan di-debounce
 * @param delay  Delay dalam ms (default: 400ms)
 * 
 * @example
 * const handleSearch = useDebouncedCallback((q: string) => {
 *   fetchResults(q);
 * }, 400);
 */
export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  fn: T,
  delay = 400,
): (...args: Parameters<T>) => void {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return debouncedFn;
}

/**
 * useThrottle — Throttle sebuah nilai (untuk scroll events, dll).
 * 
 * @param value  Nilai yang akan di-throttle
 * @param limit  Limit dalam ms (default: 200ms)
 */
export function useThrottle<T>(value: T, limit = 200): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(0);

  useEffect(() => {
    if (!lastRan.current) lastRan.current = Date.now();

    const remaining = limit - (Date.now() - lastRan.current);
    const handler = setTimeout(
      () => {
        setThrottledValue(value);
        lastRan.current = Date.now();
      },
      Math.max(remaining, 0),
    );

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}
