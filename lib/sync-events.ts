"use client";

/**
 * lib/sync-events.ts
 *
 * Pusat sinkronisasi event antar tab/komponen.
 * Tujuan:
 *  - Semua write admin/customer bisa pakai 1 helper: `emitSync(channel)`
 *  - Semua listener pakai 1 helper: `subscribeSync(channel, handler)`
 *  - Alias singular/plural otomatis di-broadcast supaya kode lama yg listen
 *    "jogjadoelan_orders_changed" tetap dapat dari dispatch "_order_changed".
 */

export type SyncChannel =
  | "order"
  | "notif"
  | "komplain"
  | "refund"
  | "tukar"
  | "chat"
  | "stock"
  | "product"
  | "voucher"
  | "promo"
  | "toko"
  | "tampilan"
  | "branding"
  | "ekspedisi"
  | "bank"
  | "qris"
  | "instruksi"
  | "broadcast"
  | "ulasan"
  | "custom";

/** Map 1 channel → daftar nama event yang DIPANCARKAN bersamaan (alias). */
const CHANNEL_EVENTS: Record<SyncChannel, string[]> = {
  order:     ["jogjadoelan_order_changed", "jogjadoelan_orders_changed"],
  notif:     ["jogjadoelan_notif_changed"],
  komplain:  ["jogjadoelan_komplain_changed"],
  refund:    ["jogjadoelan_refund_changed", "jogjadoelan_komplain_changed"],
  tukar:     ["jogjadoelan_tukar_changed", "jogjadoelan_komplain_changed"],
  chat:      ["jogjadoelan_chat_changed"],
  stock:     ["jogjadoelan_stock_changed", "jogjadoelan:stock-changed"],
  product:   ["jogjadoelan_product_changed"],
  voucher:   ["jogjadoelan_voucher_used_changed", "jogjadoelan_promo_changed"],
  promo:     ["jogjadoelan_promo_changed"],
  toko:      ["jogjadoelan_toko_changed"],
  tampilan:  ["jogjadoelan_tampilan_changed", "jogjadoelan_toko_changed"],
  branding:  ["jogjadoelan_branding_changed", "jogjadoelan_toko_changed"],
  ekspedisi: ["jogjadoelan_ekspedisi_changed"],
  bank:      ["jogjadoelan_bank_changed"],
  qris:      ["jogjadoelan_qris_changed", "jogjadoelan_bank_changed"],
  instruksi: ["jogjadoelan_instruksi_changed"],
  broadcast: ["jogjadoelan_broadcast_changed", "jogjadoelan_notif_changed"],
  ulasan:    ["jogjadoelan_ulasan_changed"],
  custom:    ["jogjadoelan_custom_changed"],
};

// MEDIUM FIX: Singleton BroadcastChannel — dibuat sekali, di-reuse tiap emit.
// Sebelumnya: new BC() + bc.close() setiap kali emitSync() dipanggil = overhead.
let _bcEmitter: BroadcastChannel | null = null;
function getBcEmitter(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!_bcEmitter) {
    try { _bcEmitter = new BroadcastChannel("jogjadoelan_sync"); } catch { return null; }
  }
  return _bcEmitter;
}

/** Pancarkan event utk channel (+semua aliasnya). Aman saat SSR. */
export function emitSync(channel: SyncChannel): void {
  if (typeof window === "undefined") return;
  const evts = CHANNEL_EVENTS[channel] ?? [];
  for (const name of evts) {
    try {
      window.dispatchEvent(new Event(name));
    } catch {
      /* abaikan */
    }
  }
  // Cross-tab sync via BroadcastChannel (singleton — dibuat sekali, di-reuse)
  try {
    const bc = getBcEmitter();
    if (bc) bc.postMessage({ channel });
  } catch {
    /* abaikan */
  }
  // Fallback: trigger storage event for legacy tab sync
  try {
    localStorage.setItem("jogjadoelan_sync_trigger", `${channel}:${Date.now()}`);
  } catch {
    /* abaikan */
  }
}

/**
 * Subscribe ke 1 channel (dengar SEMUA aliasnya).
 * Return fungsi unsubscribe. Cocok dipakai di useEffect.
 *
 * Contoh:
 *   useEffect(() => subscribeSync("order", reload), [user, params.orderId]);
 */
export function subscribeSync(
  channel: SyncChannel,
  handler: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const evts = CHANNEL_EVENTS[channel] ?? [];
  const wrapped = () => handler();
  for (const name of evts) {
    window.addEventListener(name, wrapped);
  }
  // Refresh juga saat window di-focus (multi-tab safety net)
  window.addEventListener("focus", wrapped);

  // BroadcastChannel listener
  let bc: BroadcastChannel | null = null;
  const bcHandler = (e: MessageEvent) => {
    if (e.data && e.data.channel === channel) {
      wrapped();
    }
  };
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("jogjadoelan_sync");
      bc.addEventListener("message", bcHandler);
    }
  } catch {
    /* abaikan */
  }

  // Cross-tab via `storage` event (BroadcastChannel-free fallback)
  // CRITICAL FIX: Hanya trigger jika key = jogjadoelan_sync_trigger dengan channel yang tepat.
  // Jangan trigger untuk semua key jogjadoelan_* (cart, chat, dll.) — menyebabkan cascade loop.
  const storageHandler = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key === "jogjadoelan_sync_trigger" && e.newValue?.startsWith(`${channel}:`)) {
      wrapped();
    }
    // NOTE: Sengaja dihapus else-if "e.key.startsWith('jogjadoelan_')" karena
    // menyebabkan SEMUA handler terpicu saat cart/chat/apapun ditulis ke localStorage.
  };
  window.addEventListener("storage", storageHandler);

  return () => {
    for (const name of evts) {
      window.removeEventListener(name, wrapped);
    }
    window.removeEventListener("focus", wrapped);
    window.removeEventListener("storage", storageHandler);
    if (bc) {
      bc.removeEventListener("message", bcHandler);
      bc.close();
    }
  };
}

/**
 * Subscribe ke BANYAK channel sekaligus.
 *
 * Contoh:
 *   useEffect(() => subscribeSyncMany(["order","notif"], reload), [user]);
 */
export function subscribeSyncMany(
  channels: SyncChannel[],
  handler: () => void,
): () => void {
  const unsubs = channels.map((c) => subscribeSync(c, handler));
  return () => unsubs.forEach((u) => u());
}