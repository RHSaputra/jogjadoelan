"use client";

import { api } from "@/lib/api/fetcher";
import type { ProdukDTO } from "@/lib/api/produk-mapper";

/* ====================  TYPES  ==================== */
export type Produk = ProdukDTO;

export interface ProductOverride {
  isRekomendasi?: boolean;
  harga?: number;
  hargaCoret?: number | null;
  diskonPersen?: number | null;
  promoLabel?: string | null;
  nama?: string;
  jenis?: string;
  jenisLabel?: string;
  gambars?: string[];
  deskripsiSingkat?: string;
  deskripsi?: string[];
  ukuran?: string[];
  kondisi?: string;
  spesifikasi?: string;
  rating?: number;
  terjual?: number;
}

export interface EffectiveProduct extends Produk {
  hasOverride: boolean;
  hasStockOverride: boolean;
  baseHarga: number;
  baseStok: number;
  isCustom: boolean;
}

export type ProductTabKey = "all" | "promo" | "low_stock" | "out_of_stock";
export interface ProductFilter { tab?: ProductTabKey; jenis?: string; q?: string; }

/* ====================  LIST & FILTER (async)  ==================== */

function decorate(p: Produk): EffectiveProduct {
  return {
    ...p,
    hasOverride: false,
    hasStockOverride: false,
    baseHarga: p.harga,
    baseStok: p.stok,
    isCustom: false,
  };
}

export async function getEffectiveProducts(): Promise<EffectiveProduct[]> {
  try {
    const list = await api.get<Produk[]>("/api/admin/produk");
    return list.map(decorate);
  } catch { return []; }
}

export async function getEffectiveProductById(id: string): Promise<EffectiveProduct | null> {
  try {
    const p = await api.get<Produk>(`/api/admin/produk/${id}`);
    return decorate(p);
  } catch { return null; }
}

export async function listProductsForAdmin(f: ProductFilter = {}): Promise<EffectiveProduct[]> {
  const qs = new URLSearchParams();
  if (f.tab && f.tab !== "all") qs.set("tab", f.tab);
  if (f.jenis) qs.set("jenis", f.jenis);
  if (f.q) qs.set("q", f.q);
  try {
    const list = await api.get<Produk[]>(`/api/admin/produk${qs.toString() ? `?${qs}` : ""}`);
    return list.map(decorate);
  } catch { return []; }
}

/* ====================  STATS  ==================== */

export async function getProductStats() {
  try {
    return await api.get<{
      total: number; promo: number; low: number; out: number;
      overridden: number; totalValue: number; totalStokUnits: number;
    }>("/api/admin/produk/stats");
  } catch {
    return { total: 0, promo: 0, low: 0, out: 0, overridden: 0, totalValue: 0, totalStokUnits: 0 };
  }
}

export async function getProductJenisList(): Promise<{ value: string; label: string }[]> {
  const all = await getEffectiveProducts();
  const seen = new Map<string, string>();
  for (const p of all) if (!seen.has(p.jenis)) seen.set(p.jenis, p.jenisLabel);
  return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
}

/* ====================  MUTASI (async)  ==================== */

export async function setProductOverride(id: string, patch: ProductOverride): Promise<EffectiveProduct | null> {
  try {
    const updated = await api.patch<Produk>(`/api/admin/produk/${id}`, patch);
    return decorate(updated);
  } catch { return null; }
}

export async function clearProductOverride(_id: string): Promise<EffectiveProduct | null> {
  void _id;
  // No-op: konsep "override" hilang. Tombol clear tetap ada tapi tidak melakukan apa-apa.
  return null;
}

export async function setProductStock(id: string, newStok: number): Promise<EffectiveProduct | null> {
  try {
    const updated = await api.patch<Produk>(`/api/admin/produk/${id}/stok`, { stok: Math.max(0, Math.floor(newStok)) });
    return decorate(updated);
  } catch { return null; }
}

export async function adjustProductStock(id: string, delta: number): Promise<EffectiveProduct | null> {
  try {
    const updated = await api.patch<Produk>(`/api/admin/produk/${id}/stok`, { delta });
    return decorate(updated);
  } catch { return null; }
}

export async function clearProductStockOverride(_id: string): Promise<EffectiveProduct | null> {
  void _id;
  return null;
}

/* ====================  CUSTOM/CRUD (sekarang seragam jadi POST/PATCH/DELETE)  ==================== */

export async function addCustomProduct(p: Omit<Produk, "id" | "createdAt" | "updatedAt" | "slug" | "jumlahUlasan" | "isPromo" | "isPreOrder" | "isActive" | "gambar">): Promise<Produk> {
  return api.post<Produk>("/api/admin/produk", p);
}

export async function updateCustomProduct(id: string, patch: Partial<Produk>): Promise<Produk | null> {
  try { return await api.patch<Produk>(`/api/admin/produk/${id}`, patch); }
  catch { return null; }
}

export async function deleteCustomProduct(id: string): Promise<boolean> {
  try { await api.delete(`/api/admin/produk/${id}`); return true; }
  catch { return false; }
}

export function isCustomProductId(_id: string): boolean {
  void _id;
  // Tidak ada distinction lagi — semua produk = baris DB tunggal yang bisa diedit.
  return true;
}

/* ====================  FORMAT  ==================== */
export function formatRp(n: number): string {
  return `Rp ${(n ?? 0).toLocaleString("id-ID")}`;
}
export function getStockBadge(stok: number): { label: string; color: string } {
  if (stok <= 0) return { label: "HABIS", color: "bg-red-100 text-red-700" };
  if (stok < 5) return { label: "KRITIS", color: "bg-amber-100 text-amber-700" };
  if (stok < 10) return { label: "MENIPIS", color: "bg-yellow-100 text-yellow-700" };
  return { label: "AMAN", color: "bg-emerald-100 text-emerald-700" };
}

/* ====================  OPTIONS  ==================== */
export const PRODUK_KONDISI_OPTS = ["Baru", "Bekas - Like New", "Refurbished", "Pre-Order"];
export const PRODUK_UKURAN_OPTS = ["S", "M", "L", "XL", "XXL"];
export const PRODUK_JENIS_OPTS = [
  { value: "half-face", label: "Half Face" },
  { value: "full-face", label: "Full Face" },
  { value: "chips", label: "Chips" },
  { value: "modular", label: "Modular" },
  { value: "open-face", label: "Open Face" },
];

/* ====================  LEGACY EVENT EXPORTS (no-op)  ==================== */
export const PRODUCT_CHANGED_EVENT = "jogjadoelan:product-changed";
export const STOCK_CHANGED_EVENT = "jogjadoelan:stock-changed";

/* ====================  GET CUSTOM (legacy compat)  ==================== */
export async function getCustomProducts(): Promise<Produk[]> {
  return (await getEffectiveProducts()) as Produk[];
}