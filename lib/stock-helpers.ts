"use client";

import type { Order } from "@/lib/orders-storage";

export const STOCK_CHANGED_EVENT = "jogjadoelan:stock-changed";

export interface StockMutation {
  productId: string | number;
  ukuran?: string | null;
  delta: number;
}

/** No-op: server yang handle stok saat order/cancel. */
export function mutateStock(_m: StockMutation): void {
  void _m;
}
export function mutateStockBatch(_arr: StockMutation[]): void {
  void _arr;
}

/** Dipanggil saat customer/admin cancel — sekarang server yang restore stok. */
export function restoreStockOnCancel(_order: Order): void {
  void _order;
}

/** Util lama: nilai 0 aman dipakai sebagai display fallback. */
export function getEffectiveStockOf(_productId: string | number, _ukuran?: string | null): number {
  void _productId;
  void _ukuran;
  return 0;
}

/**
 * Alias kompatibilitas — kode komponen lama memanggil `getEffectiveStock`.
 * Server adalah source-of-truth stok, jadi return Number.MAX_SAFE_INTEGER
 * (unknown / assume in stock) supaya UI tidak salah memunculkan "habis".
 */
export function getEffectiveStock(_productId: string | number, _ukuran?: string | null): number {
  void _productId;
  void _ukuran;
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Override stok per-produk (legacy). Server-driven sekarang → selalu null.
 */
export function getStockOverride(_productId: string | number, _ukuran?: string | null): number | null {
  void _productId;
  void _ukuran;
  return null;
}

/**
 * Backward compatible:
 *  - `isOutOfStock(stok: number)` → cek angka stok langsung
 *  - `isOutOfStock(productId: string, ukuran?)` → unknown, return false (assume in stock)
 */
export function isOutOfStock(stokOrProductId: number | string, _ukuran?: string | null): boolean {
  void _ukuran;
  if (typeof stokOrProductId === "number") return (stokOrProductId ?? 0) <= 0;
  return false;
}

/**
 * `isLowStock(productId, ukuran?, threshold?)` — server-driven, return false default.
 */
export function isLowStock(
  _productId: string | number,
  _ukuran?: string | null,
  _threshold = 3,
): boolean {
  void _productId;
  void _ukuran;
  void _threshold;
  return false;
}

/**
 * Subscribe ke event perubahan stok client-side.
 * Komponen panggil ini → return unsubscribe.
 */
export function subscribeStockChanges(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(STOCK_CHANGED_EVENT, handler);
  return () => window.removeEventListener(STOCK_CHANGED_EVENT, handler);
}