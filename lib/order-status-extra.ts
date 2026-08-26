/**
 * lib/order-status-extra.ts
 * Helpers tambahan untuk status pesanan:
 * - Deteksi keterlambatan (terhadap estimasiTiba.to / estimasiHari)
 * - Label & warna visual gabungan (status normal + flag terlambat)
 *
 * Tidak menyentuh storage. Murni perhitungan dari Order.
 */

import type { Order } from "./orders-storage";

/* ================================================================ */
/*                       KONSTANTA                                   */
/* ================================================================ */

/** Toleransi diproses: jika status masih "diproses" lebih dari N hari sejak createdAt */
export const TOLERANSI_DIPROSES_HARI = 5;

/** Toleransi custom: tambahan hari di atas estimasiHari custom */
export const TOLERANSI_CUSTOM_HARI = 3;

/* ================================================================ */
/*                       HELPERS DATE                                */
/* ================================================================ */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toMs(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function diffHari(fromMs: number, toMs: number): number {
  return Math.floor((toMs - fromMs) / ONE_DAY_MS);
}

/* ================================================================ */
/*                       PUBLIC API                                  */
/* ================================================================ */

/**
 * Deteksi apakah pesanan terlambat.
 * Aturan:
 *  - status `dikirim` & belum deliveredAt & sekarang > estimasiTiba.to → TERLAMBAT
 *  - status `diproses` & sekarang > createdAt + TOLERANSI_DIPROSES_HARI → TERLAMBAT
 *  - custom order: estimasiHari + TOLERANSI_CUSTOM_HARI dari createdAt
 *  - status final (selesai/dibatalkan/kadaluarsa) → TIDAK terlambat
 */
export function isOrderTerlambat(order: Order, now: number = Date.now()): boolean {
  if (
    order.status === "selesai" ||
    order.status === "dibatalkan" ||
    order.status === "kadaluarsa"
  ) {
    return false;
  }

  /* Sudah delivered di kurir → bukan terlambat */
  if (order.deliveredAt) return false;

  /* === DIKIRIM: cek estimasiTiba.to === */
  if (order.status === "dikirim") {
    const toEstimasi = toMs(order.estimasiTiba?.to);
    if (toEstimasi && now > toEstimasi) return true;
    return false;
  }

  /* === DIPROSES: cek toleransi hari sejak createdAt === */
  if (order.status === "diproses") {
    const created = toMs(order.createdAt);
    if (!created) return false;

    /* Custom order pakai estimasiHari spesifik */
    if (order.customMeta?.estimasiHari && order.customMeta.estimasiHari > 0) {
      const batas =
        created +
        (order.customMeta.estimasiHari + TOLERANSI_CUSTOM_HARI) * ONE_DAY_MS;
      return now > batas;
    }

    const batas = created + TOLERANSI_DIPROSES_HARI * ONE_DAY_MS;
    return now > batas;
  }

  return false;
}

/**
 * Berapa hari keterlambatan (>=0).
 * Kalau tidak terlambat → 0.
 */
export function hariTerlambat(order: Order, now: number = Date.now()): number {
  if (!isOrderTerlambat(order, now)) return 0;

  if (order.status === "dikirim") {
    const toEstimasi = toMs(order.estimasiTiba?.to);
    if (!toEstimasi) return 0;
    const d = diffHari(toEstimasi, now);
    return d > 0 ? d : 1;
  }

  if (order.status === "diproses") {
    const created = toMs(order.createdAt);
    if (!created) return 0;
    const tolHari =
      order.customMeta?.estimasiHari && order.customMeta.estimasiHari > 0
        ? order.customMeta.estimasiHari + TOLERANSI_CUSTOM_HARI
        : TOLERANSI_DIPROSES_HARI;
    const batas = created + tolHari * ONE_DAY_MS;
    const d = diffHari(batas, now);
    return d > 0 ? d : 1;
  }

  return 0;
}

/* ================================================================ */
/*                  STATUS VISUAL (label + warna)                    */
/* ================================================================ */

export interface StatusVisual {
  label: string;
  /** Tailwind classes untuk badge */
  badgeClass: string;
  /** Tone tone untuk banner (gradient) */
  bannerClass: string;
  /** Apakah perlu tampilkan flag terlambat */
  terlambat: boolean;
}

const VISUAL_BASE: Record<
  Order["status"],
  Omit<StatusVisual, "terlambat">
> = {
  menunggu_pembayaran: {
    label: "Menunggu Pembayaran",
    badgeClass: "bg-amber-100 text-amber-800 border border-amber-200",
    bannerClass: "from-amber-50 to-amber-100 border-amber-200",
  },
  menunggu_konfirmasi: {
    label: "Menunggu Konfirmasi",
    badgeClass: "bg-sky-100 text-sky-800 border border-sky-200",
    bannerClass: "from-sky-50 to-sky-100 border-sky-200",
  },
  diproses: {
    label: "Diproses",
    badgeClass: "bg-orange-100 text-orange-800 border border-orange-200",
    bannerClass: "from-orange-50 to-amber-50 border-orange-200",
  },
  dikirim: {
    label: "Dikirim",
    badgeClass: "bg-violet-100 text-violet-800 border border-violet-200",
    bannerClass: "from-violet-50 to-violet-100 border-violet-200",
  },
  selesai: {
    label: "Selesai",
    badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    bannerClass: "from-emerald-50 to-emerald-100 border-emerald-200",
  },
  dibatalkan: {
    label: "Dibatalkan",
    badgeClass: "bg-rose-100 text-rose-800 border border-rose-200",
    bannerClass: "from-rose-50 to-rose-100 border-rose-200",
  },
  kadaluarsa: {
    label: "Kadaluarsa",
    badgeClass: "bg-rose-100 text-rose-800 border border-rose-200",
    bannerClass: "from-rose-50 to-rose-100 border-rose-200",
  },
};

/**
 * Dapatkan visual status — auto override warna ke merah kalau terlambat.
 */
export function getStatusVisual(
  order: Order,
  now: number = Date.now(),
): StatusVisual {
  const base = VISUAL_BASE[order.status];
  const terlambat = isOrderTerlambat(order, now);

  if (terlambat) {
    return {
      label: base.label,
      badgeClass: "bg-rose-100 text-rose-800 border border-rose-300",
      bannerClass: "from-rose-50 to-rose-100 border-rose-300",
      terlambat: true,
    };
  }

  return { ...base, terlambat: false };
}

/* Lookup cepat (kalau perlu hanya label) */
export const STATUS_VISUAL_LABEL: Record<Order["status"], string> =
  Object.fromEntries(
    (Object.keys(VISUAL_BASE) as Order["status"][]).map((k) => [
      k,
      VISUAL_BASE[k].label,
    ]),
  ) as Record<Order["status"], string>;