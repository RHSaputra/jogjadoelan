"use client";

import { api } from "@/lib/api/fetcher";
import type { TukarDTO, AlamatTujuanDTO } from "@/lib/api/tukar-mapper";
import { emitSync } from "@/lib/sync-events";

export type TukarStatus =
  | "menunggu_review_admin"
  | "menunggu_pengiriman_balik"
  | "dikirim_balik"
  | "diterima_admin"
  | "varian_baru_dikirim"
  | "selesai"
  | "ditolak"
  | "dibatalkan";

export type Tukar = TukarDTO;
export type AlamatTujuan = AlamatTujuanDTO;

export interface CreateTukarInput {
  komplainId: string;
  productId?: string;
  productNama: string;
  productGambar?: string | null;
  ukuranLama?: string;
  ukuranBaru: string;
  warnaLama?: string;
  warnaBaru?: string;
  notes?: string;
  alamatTujuan: AlamatTujuan;
}

/* ========== READ ========== */

export async function getTukars(): Promise<Tukar[]> {
  try {
    return await api.get<Tukar[]>("/api/tukar");
  } catch {
    return [];
  }
}

export async function getTukarByKomplain(komplainId: string): Promise<Tukar | null> {
  try {
    return await api.get<Tukar | null>(`/api/tukar/by-komplain/${komplainId}`);
  } catch {
    return null;
  }
}

/* ========== CUSTOMER ACTIONS ========== */

export async function createTukar(input: CreateTukarInput): Promise<Tukar> {
  const res = await api.post<Tukar>("/api/tukar", {
    ...input,
    productGambar: input.productGambar ?? null,
  });
  emitSync("tukar");
  return res;
}

export async function customerKirimBalikTukar(
  tukarId: string,
  noResiBalik: string,
  buktiKirimBalikPath: string,
  kurirBalik?: string
): Promise<Tukar> {
  const res = await api.post<Tukar>(`/api/tukar/${tukarId}/kirim-balik`, { noResiBalik, buktiKirimBalikPath, kurirBalik });
  emitSync("tukar");
  return res;
}

export async function customerKonfirmasiVarianDiterima(tukarId: string): Promise<Tukar> {
  const res = await api.post<Tukar>(`/api/tukar/${tukarId}/konfirmasi`, {});
  emitSync("tukar");
  return res;
}

export async function cancelTukar(tukarId: string, alasan: string): Promise<Tukar> {
  const res = await api.post<Tukar>(`/api/tukar/${tukarId}/cancel`, { alasan });
  emitSync("tukar");
  return res;
}

/* ========== ADMIN ACTIONS ========== */

export async function adminApproveTukar(tukarId: string, catatan?: string): Promise<Tukar> {
  const res = await api.post<Tukar>(`/api/admin/tukar/${tukarId}/approve`, { catatan });
  emitSync("tukar");
  return res;
}

export async function adminReceivedTukar(tukarId: string): Promise<Tukar> {
  const res = await api.post<Tukar>(`/api/admin/tukar/${tukarId}/received`, {});
  emitSync("tukar");
  return res;
}

export async function adminShipTukar(
  tukarId: string,
  adminNoResiKirim: string,
  adminKurirKirim: string,
  catatan?: string
): Promise<Tukar> {
  const res = await api.post<Tukar>(`/api/admin/tukar/${tukarId}/ship`, {
    adminNoResiKirim,
    adminKurirKirim,
    catatan,
  });
  emitSync("tukar");
  return res;
}

export async function adminRejectTukar(tukarId: string, alasan: string): Promise<Tukar> {
  const res = await api.post<Tukar>(`/api/admin/tukar/${tukarId}/reject`, { alasan });
  emitSync("tukar");
  return res;
}

/* ========== LABELS ========== */

export const TUKAR_STATUS_LABEL: Record<TukarStatus, string> = {
  menunggu_review_admin: "Menunggu Persetujuan Admin",
  menunggu_pengiriman_balik: "Menunggu Pengiriman Barang",
  dikirim_balik: "Barang Dalam Perjalanan ke Admin",
  diterima_admin: "Barang Diterima — Menunggu Pengiriman Pengganti",
  varian_baru_dikirim: "Barang Pengganti Dikirim",
  selesai: "Tukar Selesai",
  ditolak: "Tukar Ditolak",
  dibatalkan: "Dibatalkan",
};

export const TUKAR_STATUS_COLOR: Record<TukarStatus, string> = {
  menunggu_review_admin: "bg-amber-100 text-amber-700",
  menunggu_pengiriman_balik: "bg-amber-100 text-amber-700",
  dikirim_balik: "bg-blue-100 text-blue-700",
  diterima_admin: "bg-cyan-100 text-cyan-700",
  varian_baru_dikirim: "bg-violet-100 text-violet-700",
  selesai: "bg-green-100 text-green-700",
  ditolak: "bg-red-100 text-red-700",
  dibatalkan: "bg-zinc-100 text-zinc-700",
};

export const TUKAR_AKTIF_STATUSES: TukarStatus[] = [
  "menunggu_review_admin",
  "menunggu_pengiriman_balik",
  "dikirim_balik",
  "diterima_admin",
  "varian_baru_dikirim",
];

/* ========== COMPATIBILITY EXPORTS ========== */

function pickId(args: unknown[]) {
  const target = args.length >= 2 ? args[1] : args[0];
  return String(target);
}

function payloadArgs(args: unknown[]) {
  return args.length >= 2 ? args.slice(2) : args.slice(1);
}

function pickBody(args: unknown[]) {
  return payloadArgs(args).find(
    (arg): arg is Record<string, unknown> =>
      !!arg && typeof arg === "object" && !Array.isArray(arg),
  );
}

function pickPayloadString(args: unknown[], index: number, fallback = "") {
  const strings = payloadArgs(args).filter((arg): arg is string => typeof arg === "string");
  return String(strings[index] ?? fallback);
}

export async function customerKirimBalik(...args: unknown[]): Promise<Tukar> {
  const tukarId = pickId(args);
  const noResiBalik = pickPayloadString(args, 0);
  const buktiKirimBalikPath = pickPayloadString(args, 1);
  const kurirBalik = pickPayloadString(args, 2);

  return customerKirimBalikTukar(
    tukarId,
    noResiBalik,
    buktiKirimBalikPath,
    kurirBalik || undefined
  );
}

export async function adminSetujuiTukar(...args: unknown[]): Promise<Tukar> {
  const tukarId = pickId(args);
  const body = pickBody(args);
  const catatan = String(body?.catatan ?? pickPayloadString(args, 0));

  return adminApproveTukar(tukarId, catatan);
}

export async function adminTolakTukar(...args: unknown[]): Promise<Tukar> {
  const tukarId = pickId(args);
  const body = pickBody(args);
  const alasan = String(
    body?.alasan ??
      body?.reason ??
      pickPayloadString(args, 0, "Pengajuan tukar ditolak")
  );

  return adminRejectTukar(tukarId, alasan);
}

export async function adminKonfirmasiBarangDiterima(...args: unknown[]): Promise<Tukar> {
  const tukarId = pickId(args);

  return adminReceivedTukar(tukarId);
}

export async function adminKirimVarianBaru(...args: unknown[]): Promise<Tukar> {
  const tukarId = pickId(args);
  const body = pickBody(args);

  const adminNoResiKirim = String(
    body?.adminNoResiKirim ??
      body?.noResi ??
      body?.resi ??
      pickPayloadString(args, 0)
  );

  const adminKurirKirim = String(
    body?.adminKurirKirim ??
      body?.kurir ??
      pickPayloadString(args, 1)
  );

  const catatan =
    body?.catatan !== undefined
      ? String(body.catatan)
      : pickPayloadString(args, 2);

  return adminShipTukar(
    tukarId,
    adminNoResiKirim,
    adminKurirKirim,
    catatan
  );
}