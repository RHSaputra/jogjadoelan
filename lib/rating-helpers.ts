"use client";

import { getAllUlasansGlobal } from "./ulasan-helpers";
import type { Ulasan } from "./ulasan-helpers";

/* ============================================================
 * RATING HELPERS — agregat rating produk dari semua ulasan.
 * Ulasan tetap PRIVATE (hanya owner+admin lihat detail teks),
 * tapi BINTANG di-aggregate ke card produk publik.
 * ============================================================ */

export interface ProductRating {
  avg: number;        // 0..5, satu desimal
  total: number;      // jumlah ulasan
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

const EMPTY: ProductRating = {
  avg: 0,
  total: 0,
  breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

/** In-memory cache 1 detik — async-safe. */
let cache: { all: Ulasan[]; ts: number } | null = null;
const CACHE_TTL_MS = 1_000;

async function loadAll(): Promise<Ulasan[]> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) return cache.all;
  const all = await getAllUlasansGlobal();
  cache = { all, ts: now };
  return all;
}

/** Invalidate cache — panggil setelah upsertUlasan/deleteUlasan. */
export function invalidateRatingCache() {
  cache = null;
}

/**
 * Hitung rating agregat untuk satu produk — async.
 * @deprecated Gunakan data rating langsung dari field Produk.rating (DB-denorm).
 */
export async function computeProductRating(
  productId: string,
  options?: { fallback?: number; fallbackTotal?: number },
): Promise<ProductRating> {
  const all = await loadAll();
  const matched = all.filter((u) => {
    const items = (u as unknown as { items?: { productId?: string }[] }).items;
    if (Array.isArray(items)) {
      return items.some((it) => it?.productId === productId);
    }
    return (
      (u as unknown as { productId?: string }).productId === productId
    );
  });

  if (matched.length === 0) {
    if (options?.fallback) {
      return {
        avg: clamp05(options.fallback),
        total: options.fallbackTotal ?? 0,
        breakdown: { ...EMPTY.breakdown },
      };
    }
    return { ...EMPTY, breakdown: { ...EMPTY.breakdown } };
  }

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ProductRating["breakdown"];
  let sum = 0;
  for (const u of matched) {
    const r = clampInt15(u.rating);
    breakdown[r as 1 | 2 | 3 | 4 | 5]++;
    sum += r;
  }
  const avg = Math.round((sum / matched.length) * 10) / 10;
  return { avg, total: matched.length, breakdown };
}

function clamp05(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

function clampInt15(n: number): number {
  const x = Math.round(n);
  if (!Number.isFinite(x)) return 5;
  return Math.max(1, Math.min(5, x));
}