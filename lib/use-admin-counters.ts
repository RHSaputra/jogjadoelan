"use client";

import { useEffect, useState, useCallback } from "react";
import { subscribeSync } from "@/lib/sync-events";

/**
 * BATCH F — Live counter buat badge sidebar & dropdown notif topbar.
 *
 * HIGH FIX: Sebelumnya memanggil 4 API terpisah (getAdminOrderStats,
 * getCustomStats, getKomplainStats, getChatStats) setiap 30 detik.
 * Sekarang cukup 1 request ke /api/admin/counters yang sudah dioptimasi
 * dengan Promise.all server-side.
 *
 * Semua angka = "yang butuh aksi admin SEKARANG".
 * Auto-refresh via subscribeSync setiap data berubah lintas tab/page.
 */
export interface AdminCounters {
  chat: number;        // chat customer belum dibalas admin
  validasi: number;    // order menunggu_konfirmasi (perlu cek bukti bayar)
  penjualan: number;   // order diproses (perlu pack & kirim)
  custom: number;      // custom order butuh aksi admin
  komplain: number;    // komplain baru / ditinjau / menunggu review
  ulasan: number;      // ulasan baru belum dibalas admin
  return: number;      // return/pengembalian butuh aksi admin
  stok: number;        // stok produk varian kritis (<= 2)
  total: number;       // total urgent semua (buat dot indicator)
}

const EMPTY: AdminCounters = {
  chat: 0, validasi: 0, penjualan: 0, custom: 0, komplain: 0, ulasan: 0, return: 0, stok: 0, total: 0,
};

async function fetchCounters(): Promise<AdminCounters> {
  try {
    const res = await fetch("/api/admin/counters", { credentials: "include" });
    if (!res.ok) return EMPTY;
    const j = await res.json();
    return j?.data ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

export function useAdminCounters(): AdminCounters {
  const [counters, setCounters] = useState<AdminCounters>(EMPTY);

  const refresh = useCallback(() => {
    void fetchCounters().then(setCounters).catch(() => setCounters(EMPTY));
  }, []);

  useEffect(() => {
    refresh();
    const offs = [
      subscribeSync("order", refresh),
      subscribeSync("custom", refresh),
      subscribeSync("komplain", refresh),
      subscribeSync("chat", refresh),
      subscribeSync("refund", refresh),
      subscribeSync("tukar", refresh),
      subscribeSync("ulasan", refresh),
    ];
    /* Re-cek tiap 60 detik (sebelumnya 30 detik) — dikurangi karena
       sekarang 1 request, bukan 4. Lebih efisien. */
    const tick = setInterval(refresh, 60_000);
    return () => {
      offs.forEach((off) => off());
      clearInterval(tick);
    };
  }, [refresh]);

  return counters;
}