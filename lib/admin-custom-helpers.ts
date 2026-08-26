"use client";

import type { CustomOrder, EstimasiItem } from "@/lib/custom-order-context";
import { emitSync } from "@/lib/sync-events";

/* ====================  TYPES (sama dgn sebelumnya)  ==================== */

export type CustomTabKey =
  | "all" | "perlu_estimasi" | "verifikasi" | "diproses"
  | "siap_dilunasi" | "dikirim" | "selesai" | "ditolak";

export interface CustomFilter { tab?: CustomTabKey; q?: string; }

export interface CustomStatsResult {
  counts: Record<CustomTabKey, number>;
  omzet: number;
}

export interface CustomActionAvailability {
  canSetEstimasi: boolean;
  canVerifyDp: boolean;
  canVerifyLunas: boolean;
  canVerifyPelunasan: boolean;
  canMarkSiapDilunasi: boolean;
  canMarkDikirim: boolean;
  canMarkSelesai: boolean;
  canReject: boolean;
  canToggleLate: boolean;
}

/* ====================  FETCH HELPERS  ==================== */

interface Env<T> { data?: T; error?: { message: string } }

/** Sleep helper for retry backoff */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with automatic retry on 429 (rate limit) errors.
 * Uses exponential backoff: 1s, 2s, 4s (max 3 retries).
 */
async function jget<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const r = await fetch(url, { credentials: "include", cache: "no-store" });
    const j: Env<T> = await r.json();

    // If rate-limited and we have retries left, wait and retry
    if (r.status === 429 && attempt < retries) {
      const retryAfter = r.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(1000 * Math.pow(2, attempt), 8000);
      console.warn(`[jget] 429 rate limit on ${url}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(waitMs);
      continue;
    }

    if (!r.ok || !j.data) throw new Error(j.error?.message ?? `GET ${url} gagal`);
    return j.data;
  }
  throw new Error(`GET ${url} gagal setelah ${retries} percobaan ulang`);
}
async function jpost<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j: Env<T> = await r.json();
  if (!r.ok || !j.data) throw new Error(j.error?.message ?? `POST ${url} gagal`);
  return j.data;
}

interface AdminListResult { orders: CustomOrder[]; stats: CustomStatsResult; }

/* DTO server → CustomOrder shape (sama seperti di customer context) */
function dtoToOrder(d: CustomOrder & { referensiPaths?: string[] }): CustomOrder {
  return {
    ...d,
    referensiFiles: (d.referensiPaths ?? []).map((p) => ({
      name: p.split("/").pop() ?? p, size: 0, dataUrl: p,
    })),
  };
}

/* ====================  PUBLIC GETTERS  ==================== */

export async function getAllCustomOrdersGlobal(): Promise<CustomOrder[]> {
  const { orders } = await jget<AdminListResult>("/api/admin/custom?tab=all");
  return orders.map(dtoToOrder);
}

export async function getCustomOrderById(id: string): Promise<CustomOrder | null> {
  try {
    const o = await jget<CustomOrder & { referensiPaths?: string[] }>(`/api/custom/${id}`);
    return dtoToOrder(o);
  } catch {
    return null;
  }
}

export async function listCustomOrdersForAdmin(f: CustomFilter = {}): Promise<CustomOrder[]> {
  const url = `/api/admin/custom?tab=${encodeURIComponent(f.tab ?? "all")}${f.q ? `&q=${encodeURIComponent(f.q)}` : ""}`;
  const { orders } = await jget<AdminListResult>(url);
  return orders.map(dtoToOrder);
}

export async function getCustomStats(): Promise<CustomStatsResult> {
  const { stats } = await jget<AdminListResult>("/api/admin/custom?tab=all");
  return stats;
}

/* ====================  AKSI ADMIN (semua async)  ==================== */

async function doAction(id: string, body: Record<string, unknown>): Promise<CustomOrder | null> {
  try {
    const o = await jpost<CustomOrder & { referensiPaths?: string[] }>(
      `/api/admin/custom/${id}/action`, body,
    );
    emitSync("custom");
    return dtoToOrder(o);
  } catch (e) {
    console.error("[admin-custom] action failed:", e);
    return null;
  }
}

export function adminSetEstimasi(
  id: string,
  data: { items: EstimasiItem[]; catatan?: string; tanggalMulai?: string; tanggalSelesai?: string },
) {
  return doAction(id, {
    kind: "set-estimasi", items: data.items,
    catatan: data.catatan, tanggalMulai: data.tanggalMulai, tanggalSelesai: data.tanggalSelesai,
  });
}
export const adminVerifyDp        = (id: string) => doAction(id, { kind: "verify-dp" });
export const adminVerifyLunas     = (id: string) => doAction(id, { kind: "verify-lunas" });
export const adminVerifyPelunasan = (id: string) => doAction(id, { kind: "verify-pelunasan" });
export const adminRejectCustom    = (id: string, alasan: string) => doAction(id, { kind: "reject-order", alasan });
export const adminRejectDp        = (id: string, alasan: string) => doAction(id, { kind: "reject-dp", alasan });
export const adminRejectLunas     = (id: string, alasan: string) => doAction(id, { kind: "reject-lunas", alasan });
export const adminRejectPelunasan = (id: string, alasan: string) => doAction(id, { kind: "reject-pelunasan", alasan });
export const adminMarkSiapDilunasi = (id: string) => doAction(id, { kind: "mark-siap-dilunasi" });
export const adminMarkDikirim      = (id: string) => doAction(id, { kind: "mark-dikirim" });
export const adminMarkSelesaiCustom = (id: string) => doAction(id, { kind: "mark-selesai" });
export const adminToggleLate       = (id: string, val?: boolean) => doAction(id, { kind: "toggle-late", val });
export const adminAppendCatatan    = (id: string, catatan: string) => doAction(id, { kind: "append-catatan", catatan });
export const adminAddProgressUpdate = (
  id: string,
  data: { tahap: string; deskripsi?: string; fotoUrl?: string },
) => doAction(id, { kind: "add-progress", tahap: data.tahap, deskripsi: data.deskripsi, fotoPath: data.fotoUrl });
export const adminDeleteProgressUpdate = (id: string, updateId: string) =>
  doAction(id, { kind: "delete-progress", updateId });

/** BARU: admin upload foto referensi (dipanggil dari /admin/custom/[id]). */
export async function adminAddReferensi(id: string, paths: string[]): Promise<CustomOrder | null> {
  try {
    const o = await jpost<CustomOrder & { referensiPaths?: string[] }>(
      `/api/admin/custom/${id}/referensi`, { paths },
    );
    emitSync("custom");
    return dtoToOrder(o);
  } catch (e) {
    console.error("[admin-custom] addReferensi failed:", e);
    return null;
  }
}
export async function adminDeleteReferensi(id: string, path: string): Promise<CustomOrder | null> {
  try {
    const r = await fetch(`/api/admin/custom/${id}/referensi`, {
      method: "DELETE", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }),
    });
    const j: Env<CustomOrder & { referensiPaths?: string[] }> = await r.json();
    if (!r.ok || !j.data) throw new Error(j.error?.message ?? "DELETE referensi gagal");
    emitSync("custom");
    return dtoToOrder(j.data);
  } catch (e) {
    console.error("[admin-custom] deleteReferensi failed:", e);
    return null;
  }
}

/* ====================  AVAILABILITY (sync, dari objek)  ==================== */

export function getCustomActionAvailability(o: CustomOrder): CustomActionAvailability {
  const isDp = o.paymentType === "dp";
  return {
    canSetEstimasi: ["submitted", "menunggu_estimasi", "draft"].includes(o.status),
    canVerifyDp: o.status === "menunggu_verifikasi_dp",
    canVerifyLunas: o.status === "menunggu_verifikasi_lunas",
    canVerifyPelunasan: o.status === "menunggu_verifikasi_pelunasan",
    canMarkSiapDilunasi: o.status === "diproses" && isDp,
    canMarkDikirim: o.status === "diproses" || o.status === "selesai",
    canMarkSelesai: ["dikirim", "diproses"].includes(o.status),
    canReject: !["selesai", "dikirim", "ditolak", "dibatalkan", "rejected"].includes(o.status),
    canToggleLate: ["diproses", "siap_dilunasi"].includes(o.status),
  };
}

/* ====================  FORMATTER (sync)  ==================== */

export function formatRp(n: number): string {
  return `Rp ${(n ?? 0).toLocaleString("id-ID")}`;
}
export function getCustomTotalPaid(o: CustomOrder): number {
  return (o.dpPayment?.amount ?? 0) + (o.lunasPayment?.amount ?? 0) + (o.pelunasanPayment?.amount ?? 0);
}
/**
 * Hitung sisa pembayaran untuk custom order.
 * @param o - Custom order
 * @param packingCostPerOrder - Biaya packing per order (default 10000). Bisa passed dari settings.
 */
export function getCustomSisaBayar(o: CustomOrder, packingCostPerOrder: number = 10000): number {
  const total = o.estimasi?.total ?? 0;
  const biayaPacking = (o.estimasi?.items?.length ?? 0) > 0 ? packingCostPerOrder : 0;
  const totalWithPacking = total + biayaPacking;
  return Math.max(0, totalWithPacking - getCustomTotalPaid(o));
}