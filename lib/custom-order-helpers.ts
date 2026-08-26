"use client";
// NOTE: Storage layer dihapus (Phase 3 migration → DB).
// File ini hanya berisi utility helpers murni yang tidak bergantung pada localStorage.

import {
  type OrderTimelineEntry,
  buildDefaultTimeline,
  formatRangeTanggalID,
} from "@/lib/orders-storage";

/* ====================  STORED TYPE (tetap di-export untuk kompatibilitas)  ==================== */

export interface StoredCustomOrder {
  id: string;
  userId: string;
  jenis: string;
  warnaList: { hex: string; nama?: string }[];
  finishing?: string;
  strap?: string;
  ukuran?: string;
  motifBusa?: string;
  bahan?: string;
  aksesoris?: string;
  notes?: string;
  totalHarga: number;
  createdAt: string;

  dpStatus?: "pending" | "paid" | "confirmed";
  dpAmount?: number;
  dpProofUrl?: string;
  dpProofAt?: string;
  dpConfirmedAt?: string;

  pelunasanStatus?: "pending" | "ready" | "paid" | "confirmed";
  pelunasanAmount?: number;
  pelunasanProofUrl?: string;
  pelunasanProofAt?: string;
  pelunasanConfirmedAt?: string;

  estimasiPembuatan?: string;
  estimasiTiba?: { from: string; to: string } | null;
  pelunasanCompleteAt?: string;
  timeline?: OrderTimelineEntry[];
  resi?: string | null;
  kurir?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  konfirmasiDiterimaAt?: string | null;

  transferDp?: { bank: string; norek: string; nominal: number; at: string } | null;
  transferPelunasan?: { bank: string; norek: string; nominal: number; at: string } | null;

  catatanAdmin?: string | null;
}

export type CustomOrderFull = StoredCustomOrder;

/* ====================  ID HELPERS  ==================== */

export function isCustomOrderId(id?: string | null): boolean {
  return !!id && id.toUpperCase().startsWith("CO-");
}

export function generateCustomOrderId(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CO-${ymd}-${rnd}`;
}

/* ====================  PELUNASAN STATE  ==================== */

export function isPelunasanReady(o: StoredCustomOrder): boolean {
  if (!o) return false;
  const dpPaid =
    o.dpStatus === "paid" ||
    o.dpStatus === "confirmed" ||
    !!o.transferDp ||
    !!o.dpProofUrl;
  const lunasNotYet =
    o.pelunasanStatus !== "paid" &&
    o.pelunasanStatus !== "confirmed" &&
    !o.pelunasanProofUrl;
  return dpPaid && lunasNotYet;
}

export function isCustomLunas(o: StoredCustomOrder): boolean {
  return (
    (o.dpStatus === "paid" || o.dpStatus === "confirmed" || !!o.transferDp) &&
    (o.pelunasanStatus === "paid" ||
      o.pelunasanStatus === "confirmed" ||
      !!o.transferPelunasan)
  );
}

/* ====================  TIMELINE  ==================== */

export function buildCustomTimeline(o: StoredCustomOrder): OrderTimelineEntry[] {
  if (o.timeline && o.timeline.length > 0) return o.timeline;

  const tl: OrderTimelineEntry[] = [];
  tl.push({ step: "dibuat", at: o.createdAt, label: "Permintaan Custom Dibuat" });

  if (o.dpProofAt || o.transferDp?.at) {
    tl.push({
      step: "dibayar",
      at: o.transferDp?.at ?? o.dpProofAt ?? o.createdAt,
      label: "DP Diunggah",
    });
  }
  if (o.dpStatus === "confirmed") {
    tl.push({
      step: "dikonfirmasi",
      at: o.dpConfirmedAt ?? o.createdAt,
      label: "DP Dikonfirmasi — Produksi Mulai",
      sub: o.estimasiPembuatan,
    });
  }
  if (o.pelunasanProofAt || o.transferPelunasan?.at) {
    tl.push({
      step: "dibayar",
      at: o.transferPelunasan?.at ?? o.pelunasanProofAt ?? o.createdAt,
      label: "Pelunasan Diunggah",
    });
  }
  if (o.pelunasanStatus === "confirmed" || o.pelunasanCompleteAt) {
    tl.push({
      step: "diproses",
      at: o.pelunasanCompleteAt ?? o.pelunasanConfirmedAt ?? o.createdAt,
      label: "Helm Custom Dipersiapkan untuk Pengiriman",
    });
  }
  if (o.shippedAt || o.resi) {
    tl.push({
      step: "dikirim",
      at: o.shippedAt ?? o.createdAt,
      label: "Helm Custom Dikirim",
      sub: o.kurir ?? undefined,
    });
  }
  if (o.deliveredAt) {
    tl.push({ step: "sampai", at: o.deliveredAt, label: "Paket Tiba di Alamat" });
  }
  if (o.konfirmasiDiterimaAt) {
    tl.push({
      step: "selesai",
      at: o.konfirmasiDiterimaAt,
      label: "Pesanan Selesai",
    });
  }
  return tl;
}

export function labelEstimasi(o: StoredCustomOrder): string {
  if (o.estimasiTiba) return formatRangeTanggalID(o.estimasiTiba);
  if (o.estimasiPembuatan) return o.estimasiPembuatan;
  return "Estimasi belum ditentukan";
}

export function deriveTimelineFromAny(
  o:
    | StoredCustomOrder
    | { timeline?: OrderTimelineEntry[]; createdAt: string; status?: string },
): OrderTimelineEntry[] {
  const anyO = o as StoredCustomOrder;
  if (anyO.dpStatus !== undefined || anyO.pelunasanStatus !== undefined) {
    return buildCustomTimeline(anyO);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return buildDefaultTimeline(o as any);
}
