"use client";

import { api } from "@/lib/api/fetcher";
import type { RefundDTO } from "@/lib/api/refund-mapper";
import { emitSync } from "@/lib/sync-events";

export type RefundStatus =
  | "menunggu_review_admin"
  | "menunggu_pengiriman_balik"
  | "dikirim_balik"
  | "diterima_admin"
  | "transfer_dikirim"
  | "selesai"
  | "ditolak"
  | "dibatalkan";

export type Refund = RefundDTO;

export interface RefundFormInput {
  komplainId: string;
  namaBank: string;
  atasNama: string;
  noRek: string;
}

/* ========== READ ========== */

export async function getRefunds(): Promise<Refund[]> {
  try {
    return await api.get<Refund[]>("/api/refund");
  } catch {
    return [];
  }
}

export async function getRefundByKomplain(komplainId: string): Promise<Refund | null> {
  try {
    return await api.get<Refund | null>(`/api/refund/by-komplain/${komplainId}`);
  } catch {
    return null;
  }
}

/* ========== CUSTOMER ACTIONS ========== */

export async function submitRefundForm(input: RefundFormInput): Promise<Refund> {
  const res = await api.post<Refund>("/api/refund", input);
  emitSync("refund");
  return res;
}

export async function customerKirimBalikRefund(
  refundId: string,
  noResi: string,
  buktiKirimPath: string,
  kurir?: string
): Promise<Refund> {
  const res = await api.post<Refund>(`/api/refund/${refundId}/kirim-balik`, { noResi, buktiKirimPath, kurir });
  emitSync("refund");
  return res;
}

export async function customerKonfirmasiRefund(refundId: string): Promise<Refund> {
  const res = await api.post<Refund>(`/api/refund/${refundId}/konfirmasi`, {});
  emitSync("refund");
  return res;
}

export async function cancelRefund(refundId: string, alasan?: string): Promise<Refund> {
  const res = await api.post<Refund>(`/api/refund/${refundId}/cancel`, { alasan });
  emitSync("refund");
  return res;
}

/* ========== ADMIN ACTIONS ========== */

export async function adminApproveRefund(
  refundId: string,
  nominalRefund: number,
  catatanAdmin?: string
): Promise<Refund> {
  const res = await api.post<Refund>(`/api/admin/refund/${refundId}/approve`, { nominalRefund, catatanAdmin });
  emitSync("refund");
  return res;
}

export async function adminReceivedRefund(refundId: string): Promise<Refund> {
  const res = await api.post<Refund>(`/api/admin/refund/${refundId}/received`, {});
  emitSync("refund");
  return res;
}

export async function adminTransferRefund(
  refundId: string,
  adminTransferProofPath: string
): Promise<Refund> {
  const res = await api.post<Refund>(`/api/admin/refund/${refundId}/transfer`, { adminTransferProofPath });
  emitSync("refund");
  return res;
}

export async function adminRejectRefund(refundId: string, alasan: string): Promise<Refund> {
  const res = await api.post<Refund>(`/api/admin/refund/${refundId}/reject`, { alasan });
  emitSync("refund");
  return res;
}

/* ========== LABELS ========== */

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  menunggu_review_admin: "Menunggu Review Admin",
  menunggu_pengiriman_balik: "Menunggu Pengiriman Balik",
  dikirim_balik: "Barang Dalam Perjalanan",
  diterima_admin: "Barang Diterima Admin",
  transfer_dikirim: "Transfer Dikirim",
  selesai: "Selesai",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
};

export const REFUND_STATUS_COLOR: Record<RefundStatus, string> = {
  menunggu_review_admin: "bg-amber-100 text-amber-700",
  menunggu_pengiriman_balik: "bg-blue-100 text-blue-700",
  dikirim_balik: "bg-blue-100 text-blue-700",
  diterima_admin: "bg-indigo-100 text-indigo-700",
  transfer_dikirim: "bg-emerald-100 text-emerald-700",
  selesai: "bg-green-100 text-green-700",
  ditolak: "bg-red-100 text-red-700",
  dibatalkan: "bg-zinc-100 text-zinc-600",
};

// Compatibility exports untuk nama lama yang masih dipakai di halaman refund customer
export async function customerKirimBalik(
  refundId: string,
  noResi: string,
  buktiKirimPath: string,
  kurir?: string
): Promise<Refund> {
  return customerKirimBalikRefund(refundId, noResi, buktiKirimPath, kurir);
}

export {
  customerKonfirmasiRefund as customerKonfirmasiRefundDiterima,
};