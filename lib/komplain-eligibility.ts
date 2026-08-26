/**
 * lib/komplain-eligibility.ts
 * Source of truth: tindakan komplain apa saja yang boleh diajukan customer
 * untuk sebuah order, berdasarkan status order + riwayat komplain.
 *
 * Aturan:
 *  - REFUND : barang harus DITERIMA + masih dalam garansi 72 jam
 *  - TUKAR  : barang harus DITERIMA + masih dalam garansi 72 jam
 *  - KOMPLAIN_SAJA : selalu boleh, kecuali ada komplain aktif/berhasil
 *  - Batas banding: setelah 1x ditolak, tidak boleh ajukan lagi
 */

import type { Order } from "./orders-storage";
import type {
  Komplain,
  KomplainTindakan,
} from "./komplain-context";
import { KOMPLAIN_AKTIF_STATUS } from "./komplain-context";

const BANDING_LIMIT = 1;
const GARANSI_JAM = 72;

export interface ActionEligibility {
  allowed: boolean;
  reason?: string;
}

export interface KomplainEligibility {
  refund: ActionEligibility;
  tukar: ActionEligibility;
  komplain_saja: ActionEligibility;
  anyAllowed: boolean;
  defaultAction: KomplainTindakan;
  hasAktif: boolean;
  hasBerhasil: boolean;
  bandingCount: number;
  bandingLimitReached: boolean;
  windowOpen: boolean;
  diterima: boolean;
}

/** Shape minimal Order yang dibutuhkan helper ini */
export type OrderForEligibility = Pick<
  Order,
  "status" | "deliveredAt" | "konfirmasiDiterimaAt" | "ekspedisi"
>;

function barangDiterima(o: OrderForEligibility): boolean {
  return Boolean(
    o.konfirmasiDiterimaAt || o.deliveredAt || o.status === "selesai",
  );
}

function garansiOpen(o: OrderForEligibility, now: number): boolean {
  // Garansi hanya valid setelah ada bukti barang diterima (delivered/konfirmasi).
  // shippedAt TIDAK dipakai supaya garansi tidak menghitung saat barang masih di jalan.
  const start = o.konfirmasiDiterimaAt || o.deliveredAt || null;
  if (!start) return false;
  const t = new Date(start).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t < GARANSI_JAM * 60 * 60 * 1000;
}

export function getKomplainEligibility(
  order: OrderForEligibility,
  komplains: Komplain[],
  now: number = Date.now(),
): KomplainEligibility {
  const hasAktif = komplains.some((k) =>
    KOMPLAIN_AKTIF_STATUS.includes(k.status),
  );
  const hasBerhasil = komplains.some((k) => k.status === "berhasil");
    /* Banding limit hanya dipakai ketika admin MENOLAK.
     Customer yang membatalkan sendiri TIDAK mengurangi kuota banding. */
  const bandingCount = komplains.filter(
    (k) => k.status === "ditolak",
  ).length;
  const bandingLimitReached =
    bandingCount >= BANDING_LIMIT && !hasAktif && !hasBerhasil;

  const diterima = barangDiterima(order);
  const windowOpen = garansiOpen(order, now);

  /* GUARD GLOBAL: block semua kalau ada komplain aktif / berhasil / banding habis */
  if (hasAktif || hasBerhasil || bandingLimitReached) {
    const reason = hasAktif
      ? "Ada komplain aktif yang sedang berjalan."
      : hasBerhasil
        ? "Komplain sebelumnya sudah berhasil ditangani."
        : "Batas pengajuan ulang (1x banding) sudah tercapai.";
    const blocked: ActionEligibility = { allowed: false, reason };
    return {
      refund: blocked,
      tukar: blocked,
      komplain_saja: blocked,
      anyAllowed: false,
      defaultAction: "komplain_saja",
      hasAktif,
      hasBerhasil,
      bandingCount,
      bandingLimitReached,
      windowOpen,
      diterima,
    };
  }

  const dibatalkan =
    order.status === "dibatalkan" || order.status === "kadaluarsa";

  /* KOMPLAIN_SAJA: selalu boleh di semua status (termasuk dibatalkan/kadaluarsa) */
  const komplain_saja: ActionEligibility = { allowed: true };

  /* REFUND & TUKAR: butuh barang diterima + garansi aktif + bukan dibatalkan */
  const buildRefundTukar = (): ActionEligibility => {
    if (dibatalkan) {
      return {
        allowed: false,
        reason: "Pesanan sudah dibatalkan / kadaluarsa.",
      };
    }
    if (!diterima) {
      return {
        allowed: false,
        reason: "Hanya bisa diajukan setelah barang diterima.",
      };
    }
    if (!windowOpen) {
      return {
        allowed: false,
        reason: "Masa garansi 72 jam sudah berakhir.",
      };
    }
    return { allowed: true };
  };

  const refund = buildRefundTukar();
  const tukar = buildRefundTukar();

  const defaultAction: KomplainTindakan = refund.allowed
    ? "refund"
    : tukar.allowed
      ? "tukar"
      : "komplain_saja";

    return {
    refund,
    tukar,
    komplain_saja,
    anyAllowed:
      refund.allowed || tukar.allowed || komplain_saja.allowed,
    defaultAction,
    hasAktif,
    hasBerhasil,
    bandingCount,
    bandingLimitReached,
    windowOpen,
    diterima,
  };
}