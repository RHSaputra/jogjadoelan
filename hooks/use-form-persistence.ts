"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface FormPersistenceOptions<T> {
  /** Key unik untuk localStorage */
  key: string;
  /** Default value jika tidak ada draft tersimpan */
  defaultValue: T;
  /** TTL dalam ms (default: 24 jam) */
  ttl?: number;
  /** Debounce simpan ke localStorage dalam ms (default: 500ms) */
  saveDelay?: number;
  /** Versi schema — bump jika struktur form berubah (invalidates saved data) */
  version?: number;
}

interface PersistenceEntry<T> {
  data: T;
  savedAt: number;
  version: number;
}

/**
 * useFormPersistence — Simpan draft form ke localStorage agar tidak hilang saat refresh.
 * 
 * Fitur:
 * - Auto-save dengan debounce (tidak I/O setiap keystroke)
 * - TTL — draft otomatis kadaluarsa setelah N jam
 * - Versioning — jika struktur form berubah, draft lama diabaikan
 * - clearDraft() untuk hapus setelah submit sukses
 * 
 * @example
 * const { value, setValue, clearDraft, hasDraft } = useFormPersistence({
 *   key: "checkout_form",
 *   defaultValue: { nama: "", alamat: "", ... },
 *   ttl: 2 * 60 * 60 * 1000, // 2 jam
 * });
 */
export function useFormPersistence<T>({
  key,
  defaultValue,
  ttl = 24 * 60 * 60 * 1000, // 24 jam
  saveDelay = 500,
  version = 1,
}: FormPersistenceOptions<T>) {
  const storageKey = `jogjadoelan_draft_${key}`;

  // Load initial value dari localStorage
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultValue;
      const entry = JSON.parse(raw) as PersistenceEntry<T>;
      // Cek versi
      if (entry.version !== version) {
        localStorage.removeItem(storageKey);
        return defaultValue;
      }
      // Cek TTL
      if (Date.now() - entry.savedAt > ttl) {
        localStorage.removeItem(storageKey);
        return defaultValue;
      }
      return entry.data;
    } catch {
      return defaultValue;
    }
  });

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const entry = JSON.parse(raw) as PersistenceEntry<T>;
      if (entry.version !== version) return false;
      if (Date.now() - entry.savedAt > ttl) return false;
      return true;
    } catch {
      return false;
    }
  });

  // Debounced save ke localStorage
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip save saat pertama kali render (data sudah dari storage)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (typeof window === "undefined") return;
      try {
        const entry: PersistenceEntry<T> = {
          data: value,
          savedAt: Date.now(),
          version,
        };
        localStorage.setItem(storageKey, JSON.stringify(entry));
        setHasDraft(true);
      } catch {
        // localStorage penuh — abaikan
      }
    }, saveDelay);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [value, saveDelay, storageKey, version]);

  /**
   * Hapus draft setelah form berhasil disubmit
   */
  const clearDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    setHasDraft(false);
    setValue(defaultValue);
  }, [storageKey, defaultValue]);

  /**
   * Hanya hapus dari storage, tidak reset form value
   */
  const dismissDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    setHasDraft(false);
  }, [storageKey]);

  return {
    value,
    setValue,
    clearDraft,
    dismissDraft,
    hasDraft,
  };
}
