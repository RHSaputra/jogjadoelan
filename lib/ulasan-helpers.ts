"use client";

import { api } from "@/lib/api/fetcher";
import type { UlasanDTO, UlasanFoto } from "@/lib/api/ulasan-mapper";
import { emitSync } from "@/lib/sync-events";

export type Ulasan = UlasanDTO;
export type { UlasanFoto };

/** Legacy alias — old code used `UlasanFile`, kept for back-compat. */
export type UlasanFile = { url: string; type: "image" | "video"; name?: string };

export interface PendingUlasan {
  orderItemId: string;
  orderId: string;
  completedAt: string | null;
  produkId: string;
  produkNama: string;
  produkGambar: string | null;
  qty: number;
  varianLabel: string | null;
}

export interface UlasanInput {
  orderItemId: string;
  rating: number;
  komentar: string;
  foto?: UlasanFoto[];
}

export interface UlasanSummary {
  avg: number;
  count: number;
  breakdown: Record<number, number>;
}

export interface UlasanListResponse {
  items: Ulasan[];
  total: number;
  page: number;
  limit: number;
  summary: UlasanSummary;
}

/* ===== Customer ===== */
export async function createUlasan(input: UlasanInput): Promise<Ulasan> {
  const res = await api.post<Ulasan>("/api/ulasan", input);
  emitSync("ulasan");
  return res;
}
export async function editUlasan(
  id: string,
  input: Partial<Omit<UlasanInput, "orderItemId">>,
): Promise<Ulasan> {
  const res = await api.patch<Ulasan>(`/api/ulasan/${id}`, input);
  emitSync("ulasan");
  return res;
}

/**
 * Hapus ulasan.
 * Legacy callers passed (userId, orderId) — now we use ulasan id directly.
 * If caller passes orderId as 2nd arg, we resolve it server-side by fetching mine first.
 */
export async function deleteUlasan(idOrUserId: string, maybeOrderId?: string): Promise<void> {
  if (!maybeOrderId) {
    // New signature: deleteUlasan(id)
    await api.delete(`/api/ulasan/${idOrUserId}`);
    emitSync("ulasan");
    return;
  }
  // Legacy signature: deleteUlasan(userId, orderId)
  const mine = await getMyUlasan();
  const target = mine.find((u) => u.orderId === maybeOrderId);
  if (target) {
    await api.delete(`/api/ulasan/${target.id}`);
    emitSync("ulasan");
  }
}

export async function getMyUlasan(): Promise<Ulasan[]> {
  try {
    return await api.get<Ulasan[]>("/api/ulasan/mine");
  } catch {
    return [];
  }
}
export async function getPendingUlasan(): Promise<PendingUlasan[]> {
  try {
    return await api.get<PendingUlasan[]>("/api/ulasan/pending");
  } catch {
    return [];
  }
}

/* ===== Public ===== */
export async function listUlasanProduk(
  produkId: string,
  opts: { page?: number; limit?: number; rating?: number } = {},
): Promise<UlasanListResponse> {
  const qs = new URLSearchParams();
  if (opts.page) qs.set("page", String(opts.page));
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.rating) qs.set("rating", String(opts.rating));
  return api.get<UlasanListResponse>(
    `/api/produk/${produkId}/ulasan${qs.toString() ? `?${qs}` : ""}`,
  );
}

/* ===== Admin ===== */
export async function listUlasanAdmin(
  f: { q?: string; hidden?: "all" | "true" | "false" } = {},
): Promise<Ulasan[]> {
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.hidden && f.hidden !== "all") qs.set("hidden", f.hidden);
  try {
    return await api.get<Ulasan[]>(`/api/admin/ulasan${qs.toString() ? `?${qs}` : ""}`);
  } catch {
    return [];
  }
}
export async function adminHideUlasan(id: string, alasan?: string): Promise<void> {
  await api.post(`/api/admin/ulasan/${id}/hide`, { alasan });
  emitSync("ulasan");
}
export async function adminUnhideUlasan(id: string): Promise<void> {
  await api.post(`/api/admin/ulasan/${id}/unhide`);
  emitSync("ulasan");
}
export async function adminDeleteUlasan(id: string): Promise<void> {
  await api.delete(`/api/admin/ulasan/${id}`);
  emitSync("ulasan");
}

/* ===== Util ===== */
export function canEditUlasan(u: Ulasan, windowDays = 7): boolean {
  const age = Date.now() - new Date(u.createdAt).getTime();
  return age <= windowDays * 24 * 3600 * 1000;
}

/* ===== Compat exports (pengganti era localStorage) ===== */

const KATA_KASAR_LIST = [
  "anjing", "bangsat", "babi", "kontol", "memek", "tai", "goblok", "tolol",
  "bodoh", "idiot", "brengsek", "bajingan", "kampret", "monyet", "keparat",
  "sial", "bego", "dungu",
];

export function containsBadWords(text: string): { ada: boolean; words: string[] } {
  const lower = (text ?? "").toLowerCase();
  const found = KATA_KASAR_LIST.filter((w) => lower.includes(w));
  return { ada: found.length > 0, words: found };
}

/** Sensor kata kasar → ganti dengan **** (jumlah karakter sama). */
export function sensorBadWords(text: string): string {
  let out = text ?? "";
  for (const w of KATA_KASAR_LIST) {
    const re = new RegExp(w, "gi");
    out = out.replace(re, "*".repeat(w.length));
  }
  return out;
}

export async function getAllUlasansGlobal(): Promise<Ulasan[]> {
  return listUlasanAdmin();
}

export async function adminBalasUlasan(
  _userId: string,
  ulasanId: string,
  teks: string,
): Promise<boolean> {
  try {
    await api.post(`/api/admin/ulasan/${ulasanId}/balas`, { teks });
    emitSync("ulasan");
    return true;
  } catch {
    return false;
  }
}

/** @deprecated Gunakan adminHideUlasan(id) langsung. */
export async function hideUlasanAdmin(
  _userId: string,
  _orderId: string,
  id?: string,
): Promise<void> {
  if (id) await adminHideUlasan(id);
}

/**
 * Alias getUlasans — kompatibel dengan signature lama getUlasans(userId).
 * Param userId di-ignore (auth otomatis dari cookie session).
 */
export async function getUlasans(_userId?: string): Promise<Ulasan[]> {
  void _userId;
  return getMyUlasan();
}

/**
 * Ambil ulasan untuk satu pesanan (1 ulasan / order pertama yang match).
 * Signature lama: getUlasanByOrder(userId, orderId) — userId di-ignore.
 */
export async function getUlasanByOrder(
  _userIdOrOrderId: string,
  maybeOrderId?: string,
): Promise<Ulasan | null> {
  const orderId = maybeOrderId ?? _userIdOrOrderId;
  const mine = await getMyUlasan();
  return mine.find((u) => u.orderId === orderId) ?? null;
}

/**
 * Upsert ulasan via shape legacy (orderId + productId + ...).
 * Server akan resolve orderItemId & create-or-update.
 */
export interface LegacyUpsertUlasanInput {
  orderId: string;
  userId?: string;
  productId: string | number;
  productNama?: string;
  productGambar?: string | null;
  ukuran?: string;
  warna?: string;
  rating: number;
  komentar: string;
  files?: Array<{ url: string; type: "image" | "video"; name?: string }>;
}

export async function upsertUlasan(input: LegacyUpsertUlasanInput): Promise<Ulasan> {
  const foto: UlasanFoto[] = (input.files ?? [])
    .filter((f) => f.type === "image")
    .map((f) => ({ url: f.url, type: "image", name: f.name }));
  const res = await api.post<Ulasan>("/api/ulasan/from-order", {
    orderId: input.orderId,
    productId: String(input.productId),
    rating: input.rating,
    komentar: input.komentar,
    foto,
  });
  emitSync("ulasan");
  return res;
}
