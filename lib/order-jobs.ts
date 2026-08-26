"use client";

/**
 * lib/order-jobs.ts — BATCH C4+R4
 *
 * Periodic background jobs untuk order lifecycle:
 *
 *   1. AUTO-EXPIRE  (C4 — bug critical fix)
 *      - Order "menunggu_pembayaran" yang sudah lewat o.expiredAt
 *        ditandai "kadaluarsa" + RESTORE stok yang sebelumnya di-consume
 *        oleh addOrder() + append timeline.
 *      - Tanpa job ini, order yang ditinggal user terjebak selamanya
 *        di "menunggu_pembayaran" dan stok tidak pernah balik (ghost loss).
 *
 *   2. AUTO-SELESAI  (existing, di-orchestrate)
 *      - Order "dikirim" yang sudah > 24 jam dari deliveredAt ditandai
 *        "selesai" + append timeline.
 *      - Delegasi ke runAutoSelesai() di auto-selesai.ts (helper pure).
 *
 * useOrderJobs() menggantikan useAutoSelesai() lama. Pasang SEKALI di
 * provider root (app/providers.tsx via OrderJobsMounter).
 *
 * URUT EKSEKUSI: expire DULU (boleh restore stok), baru auto-selesai.
 * Status target keduanya beda ("menunggu_pembayaran" vs "dikirim"),
 * jadi tidak mungkin saling tabrak di order yang sama.
 */

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getOrders,
  type Order,
} from "@/lib/orders-storage";
import { runAutoSelesai } from "@/lib/auto-selesai";

const POLL_INTERVAL_MS = 60_000;       // 1 menit
const MIN_RUN_INTERVAL_MS = 30_000;    // throttle: max 1 run per 30 detik

/** CustomEvent yang di-fire ke window saat tick menghasilkan expire >0. */
export const ORDER_EXPIRED_EVENT = "jogjadoelan:order-expired";

/* ====================  EXPIRE  ==================== */

export function shouldExpire(o: Order, now: number = Date.now()): boolean {
  if (o.status !== "menunggu_pembayaran") return false;
  const t = new Date(o.expiredAt).getTime();
  if (!Number.isFinite(t)) return false;
  return t <= now;
}

export interface ExpireResult {
  expired: number;
  ids: string[];
}

/**
 * Scan order user, tandai yang sudah lewat batas pembayaran jadi
 * "kadaluarsa" + restore stok + append timeline.
 *
 * Idempotent: setelah status berubah jadi "kadaluarsa", shouldExpire()
 * return false di tick berikutnya — tidak akan double-restore.
 *
 * Order strategi: restore stok DULU. Kalau gagal (mis. throw), JANGAN
 * ubah status — supaya tick berikutnya bisa retry. Ini menjaga invariant
 * "order kadaluarsa <=> stok sudah dikembalikan".
 */
export async function runOrderExpire(userId: string): Promise<ExpireResult> {
  if (!userId) return { expired: 0, ids: [] };
  const all = await getOrders(userId);
  const ids: string[] = [];

  for (const o of all) {
    if (!shouldExpire(o)) continue;
    try {
      await fetch(`/api/order/${o.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "expire" }),
      });
      ids.push(o.id);
    } catch (e) {
      console.error("[runOrderExpire] expire action failed:", o.id, e);
    }
  }

  if (ids.length > 0 && typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(ORDER_EXPIRED_EVENT, { detail: { ids } }),
      );
    } catch {
      /* CustomEvent fail — non-critical */
    }
  }

  return { expired: ids.length, ids };
}

/* ====================  ORCHESTRATOR  ==================== */

export interface OrderJobsResult {
  expired: number;
  expiredIds: string[];
  autoSelesai: number;
}

/**
 * Jalankan SEMUA periodic order job sekali jalan.
 * Setiap job di-wrap try/catch supaya satu yang failure tidak block job lain.
 */
export async function runOrderJobs(userId: string): Promise<OrderJobsResult> {
  if (!userId) {
    return { expired: 0, expiredIds: [], autoSelesai: 0 };
  }

  let expireRes: ExpireResult = { expired: 0, ids: [] };
  let selesaiCount = 0;

  try {
    expireRes = await runOrderExpire(userId);
  } catch (e) {
    console.error("[runOrderJobs] runOrderExpire failed:", e);
  }

  try {
    selesaiCount = await runAutoSelesai(userId);
  } catch (e) {
    console.error("[runOrderJobs] runAutoSelesai failed:", e);
  }

  return {
    expired: expireRes.expired,
    expiredIds: expireRes.ids,
    autoSelesai: selesaiCount,
  };
}

/* ====================  REACT HOOK  ==================== */

/**
 * Pasang sekali di provider root via OrderJobsMounter.
 * - Tick saat mount
 * - Polling tiap 1 menit
 * - Tick saat tab kembali visible
 * - Tick saat window focus
 * - Throttle: max 1 run per 30 detik
 */
export function useOrderJobs() {
  const { user } = useAuth();
  const userId = user?.id;
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!userId) return;

    const tick = () => {
      if (Date.now() - lastRunRef.current < MIN_RUN_INTERVAL_MS) return;
      lastRunRef.current = Date.now();
      void runOrderJobs(userId).catch(() => {
        /* swallow — sudah di-log di runOrderJobs */
      });
    };

    tick(); // initial run

    const interval = setInterval(tick, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    const onFocus = () => tick();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);
}
