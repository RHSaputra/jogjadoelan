"use client";

/**
 * lib/auto-selesai.ts
 *
 * Pure helpers untuk auto-selesai logic.
 *
 * BATCH C4+R4: hook useAutoSelesai() DIHAPUS — sekarang di-orchestrate
 * dari runOrderJobs() (lib/order-jobs.ts) yang juga handle auto-expire.
 * React hook publiknya: useOrderJobs().
 *
 * Helper yang TETAP di-export (dipakai dari pesanan/[orderId] & order-jobs):
 *   - shouldAutoSelesai(o)        eligibility check
 *   - sisaWaktuAutoSelesai(o)     countdown UI
 *   - runAutoSelesai(userId)      batch update, dipanggil orchestrator
 */

import {
  getOrders,
  type Order,
} from "@/lib/orders-storage";

const AUTO_SELESAI_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 hari (72 jam)

/** Cari waktu pengiriman dari order.ekspedisi.shippedAt -> timeline -> null. */
function getShippedAt(o: Order): string | null {
  if (o.ekspedisi?.shippedAt) return o.ekspedisi.shippedAt;
  const timeline = o.timeline ?? [];
  const ev = timeline.find((t) => t.step === "dikirim");
  return ev?.at ?? null;
}

export function shouldAutoSelesai(o: Order): boolean {
  if (o.status !== "dikirim") return false;
  const shipped = getShippedAt(o);
  if (!shipped) return false;
  const t = new Date(shipped).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t >= AUTO_SELESAI_WINDOW_MS;
}
/**
 * Status countdown auto-selesai untuk satu order.
 * Selalu return object (tidak pernah null) — caller cukup cek `result.aktif`.
 *   aktif  = order memenuhi syarat countdown (dikirim + deliveredAt + belum 24 jam)
 *   sisaMs = sisa millisecond sebelum auto-selesai
 *   ms     = alias sisaMs (backward-compat)
 *   label  = teks human-readable
 */
export function sisaWaktuAutoSelesai(o: Order): {
  aktif: boolean;
  sisaMs: number;
  ms: number;
  label: string;
} {
  const inactive = { aktif: false, sisaMs: 0, ms: 0, label: "" };

    if (o.status !== "dikirim") return inactive;
  const shipped = getShippedAt(o);
  if (!shipped) return inactive;
  const t = new Date(shipped).getTime();
  if (!Number.isFinite(t)) return inactive;

  const remaining = Math.max(0, t + AUTO_SELESAI_WINDOW_MS - Date.now());
  if (remaining === 0) {
    return { aktif: true, sisaMs: 0, ms: 0, label: "Akan otomatis selesai" };
  }

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return {
    aktif: true,
    sisaMs: remaining,
    ms: remaining,
    label: h >= 1 ? `${h} jam ${m} menit lagi` : `${m} menit lagi`,
  };
}

/** Status komplain yang dianggap "masih berjalan" — order TIDAK boleh auto-selesai. */
const KOMPLAIN_AKTIF: ReadonlySet<string> = new Set([
  "baru",
  "ditinjau",
  "disetujui",
  "menunggu_review_admin",
  "menunggu_balikan",
  "diproses",
]);

/** Cek apakah order sedang punya komplain aktif via DB API (A3). */
async function orderHasActiveKomplain(_userId: string, orderId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/komplain?orderId=${encodeURIComponent(orderId)}`, {
      credentials: "include",
    });
    if (!res.ok) return false;
    const j = await res.json() as { data?: Array<{ status: string }> };
    const arr = j?.data ?? [];
    return arr.some((k) => KOMPLAIN_AKTIF.has((k.status ?? "").toLowerCase()));
  } catch {
    return false;
  }
}

/** Scan semua order user, auto-selesai via DB API. Return jumlah ter-update. */
export async function runAutoSelesai(userId: string): Promise<number> {
  if (!userId) return 0;
  const all = await getOrders(userId);
  let count = 0;
  for (const o of all) {
    if (!shouldAutoSelesai(o)) continue;
    if (await orderHasActiveKomplain(userId, o.id)) continue;
    try {
      await fetch(`/api/order/${o.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "konfirmasi-diterima" }),
      });
      count++;
    } catch { /* non-critical */ }
  }
  return count;
}
