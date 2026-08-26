"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/fetcher";
import { qk } from "@/lib/api/keys";
import { useAuth } from "@/lib/auth-context";
import { subscribeSync } from "@/lib/sync-events";

/* ====================  TYPES (TIDAK BERUBAH)  ==================== */

export type KomplainJenis =
  | "produk_tidak_sesuai" | "produk_cacat" | "pengiriman_terlambat"
  | "barang_tidak_sampai" | "alamat_salah" | "double_charge"
  | "refund_lama" | "metode_pembayaran_error" | "penolakan_return"
  | "ongkir_return_mahal" | "barang_pengganti_lama" | "ingin_ubah_pesanan"
  | "ingin_batal_pesanan" | "lainnya";

export type KomplainTindakan = "refund" | "tukar" | "komplain_saja";

export type KomplainStatus =
  | "baru" | "ditinjau" | "disetujui" | "menunggu_review_admin"
  | "menunggu_balikan" | "diproses" | "berhasil" | "ditolak" | "dibatalkan";

export interface KomplainFile { url: string; type: "image" | "video"; name?: string; }

export const KOMPLAIN_AKTIF_STATUS: KomplainStatus[] = [
  "baru", "ditinjau", "disetujui",
  "menunggu_review_admin", "menunggu_balikan", "diproses",
];

export interface KomplainChat {
  id: string;
  by: "user" | "admin" | "system";
  pesan: string;
  files?: KomplainFile[];
  createdAt: string;
}

export interface KomplainPenolakan { alasan: string; by: "admin"; at: string; }
export interface RefundFormData { nama: string; bank: string; norek: string; noResi: string; buktiResiUrl: string; submittedAt: string; }
export interface RefundResultData { nominal: number; alasanRefund: string; buktiTransferUrl: string; transferredAt: string; diterimaCustomerAt?: string | null; }
export interface TukarFormData { nama: string; bank?: string; norek?: string; noResi: string; buktiResiUrl: string; submittedAt: string; }
export interface TukarResultData { noResiBalikan: string; kurir: string; estimasiTiba: { from: string; to: string }; buktiUrl: string; shippedAt: string; diterimaCustomerAt?: string | null; }

export interface Komplain {
  id: string;
  orderId: string;
  jenis: KomplainJenis;
  jenisLabel: string;
  deskripsi: string;
  files: KomplainFile[];
  tindakan: KomplainTindakan;
  status: KomplainStatus;
  createdAt: string;
  updatedAt: string;
  chat: KomplainChat[];
  penolakan?: KomplainPenolakan | null;
  refundForm?: RefundFormData | null;
  refundResult?: RefundResultData | null;
  tukarForm?: TukarFormData | null;
  tukarResult?: TukarResultData | null;
}

/* ====================  CONST  ==================== */

export const JENIS_KOMPLAIN: { id: KomplainJenis; label: string }[] = [
  { id: "produk_tidak_sesuai",     label: "Produk yang dikirim tidak sesuai" },
  { id: "produk_cacat",            label: "Produk cacat atau rusak" },
  { id: "pengiriman_terlambat",    label: "Pengiriman terlambat" },
  { id: "barang_tidak_sampai",     label: "Barang tidak sampai" },
  { id: "alamat_salah",            label: "Alamat pengiriman salah atau tertukar" },
  { id: "double_charge",           label: "Double charge (tertagih dua kali)" },
  { id: "refund_lama",             label: "Refund lama atau tidak diproses" },
  { id: "metode_pembayaran_error", label: "Metode pembayaran error" },
  { id: "penolakan_return",        label: "Penolakan return tanpa alasan jelas" },
  { id: "ongkir_return_mahal",     label: "Ongkir return mahal" },
  { id: "barang_pengganti_lama",   label: "Barang pengganti lama dikirim" },
  { id: "ingin_ubah_pesanan",      label: "Ingin mengubah detail pesanan (Alamat/Varian)" },
  { id: "ingin_batal_pesanan",     label: "Ingin membatalkan pesanan (Belum dikirim)" },
  { id: "lainnya",                 label: "Lainnya" },
];

export const KOMPLAIN_STATUS_LABEL: Record<KomplainStatus, string> = {
  baru: "Baru Diajukan", ditinjau: "Sedang Ditinjau Admin", disetujui: "Disetujui Admin",
  menunggu_review_admin: "Menunggu Persetujuan Admin", menunggu_balikan: "Menunggu Barang Balik",
  diproses: "Sedang Diproses", berhasil: "Berhasil", ditolak: "Ditolak", dibatalkan: "Dibatalkan",
};
export const KOMPLAIN_STATUS_COLOR: Record<KomplainStatus, string> = {
  baru: "bg-blue-100 text-blue-700", ditinjau: "bg-blue-100 text-blue-700",
  disetujui: "bg-emerald-100 text-emerald-700", menunggu_review_admin: "bg-amber-100 text-amber-700",
  menunggu_balikan: "bg-amber-100 text-amber-700", diproses: "bg-indigo-100 text-indigo-700",
  berhasil: "bg-green-100 text-green-700", ditolak: "bg-red-100 text-red-700",
  dibatalkan: "bg-zinc-100 text-zinc-600",
};
export const KOMPLAIN_TINDAKAN_LABEL: Record<KomplainTindakan, string> = {
  refund: "Refund Dana", tukar: "Tukar Barang", komplain_saja: "Komplain Saja",
};
export const ADMIN_INFO = { nama: "Admin Jogjadoelan", jamOps: "Senin–Sabtu, 08.00–17.00 WIB", online: true };

/* ====================  CONTEXT  ==================== */

interface AddInput {
  orderId: string;
  jenis: KomplainJenis;
  jenisLabel?: string;
  deskripsi: string;
  tindakan: KomplainTindakan;
  files?: KomplainFile[];
}

interface Ctx {
  items: Komplain[];
  hydrated: boolean;
  add: (input: AddInput) => Promise<Komplain>;
  get: (id: string) => Komplain | undefined;
  byOrderId: (orderId: string) => Komplain[];
  sendChat: (id: string, pesan: string, files?: KomplainFile[]) => Promise<void>;
  cancel: (id: string, alasan?: string) => Promise<void>;
  patch: (id: string, patch: Partial<Komplain>) => Komplain | null;       // lokal-only
  addSystemLog: (_id: string, _pesan: string) => void;                    // no-op
  adminAccept: (id: string) => Promise<void>;
  adminReject: (id: string, alasan: string) => Promise<void>;
  adminReply: (id: string, pesan: string, files?: KomplainFile[]) => Promise<void>;
}

const KomplainCtx = createContext<Ctx | null>(null);

export function KomplainProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isFetched } = useQuery<Komplain[]>({
    queryKey: qk.komplain.list(),
    queryFn: () => api.get<Komplain[]>("/api/komplain"),
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: qk.komplain.list() }),
    [qc],
  );

  useEffect(() => {
    if (!user?.id) return;
    return subscribeSync("komplain", () => {
      invalidate();
    });
  }, [user?.id, invalidate]);

  const add = useCallback<Ctx["add"]>(async (input) => {
    const label =
      input.jenisLabel ?? JENIS_KOMPLAIN.find((j) => j.id === input.jenis)?.label ?? "Komplain";
    const created = await api.post<Komplain>("/api/komplain", {
      orderId: input.orderId,
      jenis: input.jenis,
      jenisLabel: label,
      tindakan: input.tindakan,
      deskripsi: input.deskripsi,
      files: input.files ?? [],
    });
    invalidate();
    return created;
  }, [invalidate]);

  const get = useCallback((id: string) => items.find((k) => k.id === id), [items]);
  const byOrderId = useCallback((orderId: string) => items.filter((k) => k.orderId === orderId), [items]);

  const sendChat = useCallback<Ctx["sendChat"]>(async (id, pesan, files) => {
    await api.post(`/api/komplain/${id}/chat`, { pesan, files: files ?? [] });
    invalidate();
  }, [invalidate]);

  const cancel = useCallback<Ctx["cancel"]>(async (id, alasan) => {
    await api.post(`/api/komplain/${id}/cancel`, { alasan });
    invalidate();
  }, [invalidate]);

  // patch & addSystemLog: legacy lokal — server adalah source of truth.
  const patch = useCallback((_id: string, _p: Partial<Komplain>): Komplain | null => {
    void _id;
    void _p;
    return null;
  }, []);
  const addSystemLog = useCallback((_id: string, _pesan: string) => {
    void _id;
    void _pesan;
  }, []);

  const adminAccept = useCallback<Ctx["adminAccept"]>(async (id) => {
    await api.post(`/api/admin/komplain/${id}/accept`);
    invalidate();
  }, [invalidate]);

  const adminReject = useCallback<Ctx["adminReject"]>(async (id, alasan) => {
    await api.post(`/api/admin/komplain/${id}/reject`, { alasan });
    invalidate();
  }, [invalidate]);

  const adminReply = useCallback<Ctx["adminReply"]>(async (id, pesan, files) => {
    await api.post(`/api/admin/komplain/${id}/chat`, { pesan, files: files ?? [] });
    invalidate();
  }, [invalidate]);

  const value = useMemo<Ctx>(
    () => ({ items, hydrated: isFetched, add, get, byOrderId, sendChat, cancel, patch, addSystemLog, adminAccept, adminReject, adminReply }),
    [items, isFetched, add, get, byOrderId, sendChat, cancel, patch, addSystemLog, adminAccept, adminReject, adminReply],
  );

  return <KomplainCtx.Provider value={value}>{children}</KomplainCtx.Provider>;
}

export function useKomplain() {
  const ctx = useContext(KomplainCtx);
  if (!ctx) throw new Error("useKomplain must be used within KomplainProvider");
  return ctx;
}

export function resolveKomplainStatusInfo(k: {
  status: string;
  tindakan: string;
  refund?: { status: string } | null;
  tukar?: { status: string } | null;
}) {
  const status = String(k.status).toLowerCase();
  const tindakan = String(k.tindakan).toLowerCase();

  if (status === "diproses") {
    if (tindakan === "refund" && k.refund) {
      const rStatus = String(k.refund.status).toLowerCase();
      if (rStatus === "dikirim_balik") {
        return { label: "Retur Dikirim Customer", color: "bg-blue-100 text-blue-700" };
      }
      if (rStatus === "diterima_admin") {
        return { label: "Retur Diterima Admin", color: "bg-cyan-100 text-cyan-700" };
      }
      if (rStatus === "transfer_dikirim" || rStatus === "ditransfer") {
        return { label: "Refund Dana Ditransfer", color: "bg-violet-100 text-violet-700" };
      }
    }
    if (tindakan === "tukar" && k.tukar) {
      const tStatus = String(k.tukar.status).toLowerCase();
      if (tStatus === "dikirim_balik") {
        return { label: "Retur Dikirim Customer", color: "bg-blue-100 text-blue-700" };
      }
      if (tStatus === "diterima_admin") {
        return { label: "Retur Diterima Admin", color: "bg-cyan-100 text-cyan-700" };
      }
      if (tStatus === "varian_baru_dikirim") {
        return { label: "Produk Pengganti Dikirim", color: "bg-violet-100 text-violet-700" };
      }
    }
  }

  // Fallback ke status default
  const baseLabel =
    KOMPLAIN_STATUS_LABEL[status as keyof typeof KOMPLAIN_STATUS_LABEL] || k.status;
  const baseColor =
    KOMPLAIN_STATUS_COLOR[status as keyof typeof KOMPLAIN_STATUS_COLOR] ||
    "bg-zinc-100 text-zinc-700";
  return { label: baseLabel, color: baseColor };
}