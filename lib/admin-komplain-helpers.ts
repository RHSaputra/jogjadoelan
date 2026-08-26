"use client";

import { api } from "@/lib/api/fetcher";
import type { Komplain, KomplainFile } from "@/lib/komplain-context";
import { emitSync } from "@/lib/sync-events";

export interface AdminRefundRow {
  id: string;
  komplainId: string;
  orderId: string;
  userId: string;
  status: string;
  namaBank: string;
  atasNama: string;
  noRek: string;
  kurir: string;
  noResi: string;
  buktiKirimPath: string;
  buktiKirimAt: string | null;
  nominalRefund: number;
  catatanAdmin: string;
  rejectReason: string | null;
  adminApprovedAt: string | null;
  adminReceivedAt: string | null;
  adminTransferredAt: string | null;
  adminTransferProofPath: string | null;
  customerConfirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTukarRow {
  id: string;
  komplainId: string;
  orderId: string;
  userId: string;
  productId: string | null;
  status: string;
  productNama: string;
  productGambar: string | null;
  ukuranLama: string | null;
  ukuranBaru: string;
  warnaLama: string | null;
  warnaBaru: string | null;
  notes: string | null;
  kurirBalik: string;
  noResiBalik: string;
  buktiKirimBalikPath: string;
  buktiKirimBalikAt: string | null;
  adminApprovedAt: string | null;
  adminReceivedAt: string | null;
  adminKirimVarianAt: string | null;
  adminNoResiKirim: string | null;
  adminKurirKirim: string | null;
  adminCatatan: string | null;
  rejectReason: string | null;
  customerConfirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminKomplain extends Komplain {
  userId: string;
  userName: string;
  userEmail?: string;
  refund: AdminRefundRow;
  tukar: AdminTukarRow;
}

export type KomplainTabKey =
  | "all" | "baru" | "ditinjau" | "disetujui" | "menunggu_review_admin"
  | "menunggu_balikan" | "diproses" | "berhasil" | "ditolak";

export interface KomplainFilter { tab?: KomplainTabKey; q?: string; }

export async function listKomplainForAdmin(f: KomplainFilter = {}): Promise<AdminKomplain[]> {
  const qs = new URLSearchParams();
  if (f.tab && f.tab !== "all") qs.set("tab", f.tab);
  if (f.q) qs.set("q", f.q);
  // FIX: Jangan telan error — biarkan propagate agar admin page bisa menangani
  return await api.get<AdminKomplain[]>(`/api/admin/komplain${qs.toString() ? `?${qs}` : ""}`);
}

export async function getAllKomplainGlobal(): Promise<AdminKomplain[]> {
  return listKomplainForAdmin();
}

export async function getKomplainById(id: string): Promise<AdminKomplain | null> {
  try { return await api.get<AdminKomplain>(`/api/admin/komplain/${id}`); }
  catch { return null; }
}

export async function getKomplainStats(): Promise<{
  counts: Record<KomplainTabKey, number>;
  urgentCount: number;
  total: number;
}> {
  // FIX: Jangan telan error — biarkan propagate agar admin page bisa menangani
  return await api.get(`/api/admin/komplain/stats`);
}

/* ====================  MUTASI ADMIN  ==================== */

export async function adminAccept(id: string) {
  const res = await api.post(`/api/admin/komplain/${id}/accept`);
  emitSync("komplain");
  return res;
}

export async function adminReject(id: string, alasan: string) {
  const res = await api.post(`/api/admin/komplain/${id}/reject`, { alasan });
  emitSync("komplain");
  return res;
}

export async function adminReply(id: string, pesan: string, files: KomplainFile[] = []) {
  return api.post(`/api/admin/komplain/${id}/chat`, { pesan, files });
}

/* ====================  LEGACY ALIAS (back-compat)  ====================
 * UI lama mungkin masih panggil bentuk lama dengan signature (uid, id).
 * uid sekarang diabaikan karena server pakai session admin.
 */
export function adminAcceptLegacy(_uid: string, id: string) { return adminAccept(id); }
export function adminRejectLegacy(_uid: string, id: string, alasan: string) {
  return adminReject(id, alasan);
}
export function adminReplyLegacy(_uid: string, id: string, pesan: string, files: KomplainFile[] = []) {
  void _uid;
  return adminReply(id, pesan, files);
}

/* ====================  COMPATIBILITY EXPORTS  ====================
 * Dipakai oleh app/admin/komplain/[id]/page.tsx
 * Dibuat supaya nama function lama tetap cocok dengan helper baru.
 */

export const KOMPLAIN_STATUS_LABEL: Record<string, string> = {
  BARU: "Baru",
  MENUNGGU: "Menunggu",
  PENDING: "Menunggu",
  DIAJUKAN: "Diajukan",
  OPEN: "Dibuka",

  DITINJAU: "Ditinjau",
  DIPROSES: "Diproses",

  DISETUJUI: "Disetujui",
  DITERIMA: "Diterima",
  ACCEPTED: "Diterima",

  DITOLAK: "Ditolak",
  REJECTED: "Ditolak",

  MENUNGGU_REVIEW_ADMIN: "Menunggu Review Admin",
  FORM_DIAJUKAN: "Form Diajukan",
  MENUNGGU_PERSETUJUAN: "Menunggu Persetujuan",
  PENDING_FORM: "Menunggu Form",

  MENUNGGU_BALIKAN: "Menunggu Balikan",
  MENUNGGU_BARANG_BALIK: "Menunggu Barang Balik",
  BARANG_DIKIRIM_BALIK: "Barang Dikirim Balik",
  RETURN_SHIPPED: "Barang Dikirim Balik",

  REFUND_DIPROSES: "Refund Diproses",
  REFUND_APPROVED: "Refund Disetujui",
  MENUNGGU_REFUND: "Menunggu Refund",

  TUKAR_DIPROSES: "Tukar Diproses",
  TUKAR_APPROVED: "Tukar Disetujui",
  MENUNGGU_TUKAR: "Menunggu Tukar",

  BERHASIL: "Berhasil",
  SELESAI: "Selesai",
  CLOSED: "Selesai",

  DIBATALKAN: "Dibatalkan",
  CANCELLED: "Dibatalkan",
};

export const formatRp = (value: number | string | null | undefined) => {
  const numberValue = Number(value ?? 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numberValue) ? numberValue : 0);
};

export function adminAcceptKomplain(id: string): Promise<unknown> {
  return adminAccept(id);
}

export function adminRejectKomplain(id: string, alasan: string): Promise<unknown> {
  return adminReject(id, alasan);
}

export function adminRejectForm(id: string, alasan: string): Promise<unknown> {
  return adminReject(id, alasan);
}

/**
 * Kirim balasan admin ke chat komplain.
 * Bug fix: sebelumnya menggunakan ...args variadic parser yang corrupt pesan
 * saat ada lampiran file (menghasilkan "[object Object]" di teks pesan).
 */
export function adminReplyKomplain(id: string, pesan: string, files: KomplainFile[] = []): Promise<unknown> {
  return adminReply(id, pesan, files);
}

export async function adminApproveForm(id: string, body?: Record<string, unknown>): Promise<unknown> {
  const res = await api.post(`/api/admin/komplain/${id}/accept`, body);
  emitSync("komplain");
  return res;
}

export async function adminCompleteRefund(id: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await api.post(`/api/admin/refund/${id}/transfer`, body);
  emitSync("refund");
  return res;
}

export async function adminCompleteTukar(id: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await api.post(`/api/admin/tukar/${id}/ship`, body);
  emitSync("tukar");
  return res;
}

export async function adminTandaiBalikanDiterima(id: string): Promise<unknown> {
  // Fallback: dipanggil hanya untuk kasus komplain_saja (tanpa child refund/tukar)
  const res = await api.post(`/api/admin/komplain/${id}/accept`);
  emitSync("komplain");
  return res;
}

export function getKomplainAdminActions(
  komplain: {
    status?: string;
    tindakan?: string;
    refund?: { status?: string } | null;
    tukar?: { status?: string } | null;
  } | null | undefined,
) {
  const status = String(komplain?.status ?? "").toUpperCase();
  const tindakan = String(komplain?.tindakan ?? "").toLowerCase();
  const childStatus = tindakan === "refund"
    ? String(komplain?.refund?.status ?? "").toUpperCase()
    : tindakan === "tukar"
      ? String(komplain?.tukar?.status ?? "").toUpperCase()
      : "";

  return {
    canAccept: ["BARU", "MENUNGGU", "PENDING", "DIAJUKAN", "OPEN"].includes(status),

    canReject: ["BARU", "MENUNGGU", "PENDING", "DIAJUKAN", "OPEN"].includes(status),

    canReply: ![
      "SELESAI",
      "BERHASIL",
      "DITOLAK",
      "REJECTED",
      "CLOSED",
      "CANCELLED",
      "DIBATALKAN",
    ].includes(status),

    canApproveForm: [
      "FORM_DIAJUKAN",
      "MENUNGGU_REVIEW_ADMIN",
      "MENUNGGU_PERSETUJUAN",
      "PENDING_FORM",
    ].includes(status) || childStatus === "MENUNGGU_REVIEW_ADMIN",

    canTandaiBalikan: [
      "MENUNGGU_BALIKAN",
      "MENUNGGU_BARANG_BALIK",
      "BARANG_DIKIRIM_BALIK",
      "RETURN_SHIPPED",
    ].includes(status) || childStatus === "DIKIRIM_BALIK",

    canCompleteRefund: [
      "REFUND_DIPROSES",
      "MENUNGGU_REFUND",
      "REFUND_APPROVED",
    ].includes(status) || (tindakan === "refund" && childStatus === "DITERIMA_ADMIN"),

    canCompleteTukar: [
      "TUKAR_DIPROSES",
      "MENUNGGU_TUKAR",
      "TUKAR_APPROVED",
    ].includes(status) || (tindakan === "tukar" && childStatus === "DITERIMA_ADMIN"),
  };
}