"use client";

import { api } from "@/lib/api/fetcher";
import type { ProdukDTO } from "@/lib/api/produk-mapper";

export type Produk = ProdukDTO;

/* Cache sederhana di module-scope supaya hook yang panggil getProdukList() sync
   masih bisa return data hasil fetch terbaru. */
let _cache: Produk[] = [];
let _inflight: Promise<Produk[]> | null = null;

export async function fetchProdukList(): Promise<Produk[]> {
  if (_inflight) return _inflight;
  _inflight = api
    .get<{ items: Produk[] } | Produk[]>("/api/produk?limit=60")
    .then((r) => (Array.isArray(r) ? r : r.items ?? []))
    .then((list) => {
      _cache = list;
      _inflight = null;
      return list;
    })
    .catch(() => {
      _inflight = null;
      return _cache;
    });
  return _inflight;
}

export function getProdukList(): Produk[] {
  // Trigger background refresh, return cache (boleh stale)
  fetchProdukList();
  return _cache;
}

export function getProdukById(id: string): Produk | null {
  return _cache.find((p) => p.id === id || p.slug === id) ?? null;
}

export async function fetchProdukById(id: string): Promise<Produk | null> {
  try { return await api.get<Produk>(`/api/produk/${id}`); }
  catch { return null; }
}

export function getProdukByJenis(jenis: string): Produk[] {
  return getProdukList().filter((p) => p.jenis === jenis);
}

export function getProdukRekomendasi(): Produk[] {
  return getProdukList().filter((p) => p.isRekomendasi === true);
}

export function getProdukReadyStok(): Produk[] {
  return getProdukList();
}

/* Legacy export — tidak lagi statis. Sekarang sama dengan cache. */
export const PRODUK_DEFAULT: Produk[] = [];