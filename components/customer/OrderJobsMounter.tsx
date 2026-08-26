"use client";

import { useOrderJobs } from "@/lib/order-jobs";

/**
 * Mount-only component. Pasang SEKALI di app/providers.tsx.
 *
 * Memicu useOrderJobs() yang menjalankan periodic jobs:
 *   - Auto-expire order menunggu_pembayaran (lewat batas) + restore stok
 *   - Auto-selesai order dikirim (lewat 24 jam dari deliveredAt)
 *
 * Tidak render apapun (return null).
 *
 * BATCH C4+R4: pengganti AutoSelesaiMounter (yang sudah dihapus).
 */
export function OrderJobsMounter() {
  useOrderJobs();
  return null;
}

export default OrderJobsMounter;
