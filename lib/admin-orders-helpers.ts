"use client";

import {
  findOrderGlobal,
  getAllOrdersGlobal,
  type Order,
  type OrderStatus,
} from "@/lib/orders-storage";
import { emitSync } from "@/lib/sync-events";

/* ====================  LIST & FILTER  ====================
 * Masih pakai localStorage. Akan dimigrasikan ke /api/admin/orders
 * pada fase berikutnya.
 */

export interface AdminOrderFilter {
  status?: OrderStatus | "all";
  jenis?: "all" | "reguler" | "custom";
  q?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
}

export async function listOrdersForAdmin(f: AdminOrderFilter = {}): Promise<Order[]> {
  let arr = await getAllOrdersGlobal();
  if (f.status && f.status !== "all") arr = arr.filter((o) => o.status === f.status);
  if (f.jenis && f.jenis !== "all") {
    arr = arr.filter((o) => {
      const isCustom = o.jenisOrder === "custom" || !!o.customMeta;
      return f.jenis === "custom" ? isCustom : !isCustom;
    });
  }
  if (f.q) {
    const q = f.q.toLowerCase();
    arr = arr.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.alamat?.nama ?? "").toLowerCase().includes(q) ||
        (o.alamat?.noHp ?? "").includes(q),
    );
  }
  if (f.from) {
    const t = new Date(f.from).getTime();
    arr = arr.filter((o) => new Date(o.createdAt).getTime() >= t);
  }
  if (f.to) {
    const t = new Date(f.to).getTime() + 24 * 60 * 60 * 1000;
    arr = arr.filter((o) => new Date(o.createdAt).getTime() <= t);
  }
  return arr;
}

export async function getAdminOrder(id: string): Promise<Order | null> {
  return findOrderGlobal(id);
}

/* ====================  STATS  ==================== */

export async function getAdminOrderStats() {
  const all = await getAllOrdersGlobal();
  const byStatus: Partial<Record<OrderStatus, number>> = {};
  let omzet = 0;
  for (const o of all) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (["diproses", "dikirim", "selesai"].includes(o.status)) omzet += o.total;
  }
  return { total: all.length, byStatus, omzet };
}

/* ====================  AKSI YANG DIIZINKAN  ==================== */

export interface AdminActionAvailability {
  canConfirm: boolean;
  canReject: boolean;
  canInputResi: boolean;
  canEditResi: boolean;
  canMarkDelivered: boolean;
  canForceSelesai: boolean;
  canCancel: boolean;
  canEditCatatan: boolean;
}

export function getActionAvailability(o: Order): AdminActionAvailability {
  return {
    canConfirm: o.status === "menunggu_konfirmasi",
    canReject: o.status === "menunggu_konfirmasi",
    canInputResi: o.status === "diproses",
    canEditResi: o.status === "dikirim",
    canMarkDelivered: o.status === "dikirim" && !o.deliveredAt,
    canForceSelesai: o.status === "dikirim",
    canCancel: !["dikirim", "selesai", "dibatalkan", "kadaluarsa"].includes(o.status),
    canEditCatatan: !["selesai", "dibatalkan", "kadaluarsa"].includes(o.status),
  };
}

/* ====================  AKSI ADMIN — ASYNC API  ==================== */

async function callAction(
  orderId: string,
  action: string,
  payload?: Record<string, unknown>,
): Promise<Order | null> {
  const res = await fetch(`/api/admin/order/${orderId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, ...(payload ? { payload } : {}) }),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message ?? "Aksi gagal";
    throw new Error(msg);
  }
  emitSync("order");
  return (json as { data: Order }).data;
}

export async function adminConfirmPayment(
  orderId: string,
  catatan?: string,
): Promise<Order | null> {
  return callAction(orderId, "confirm-payment", catatan ? { catatan } : undefined);
}

export async function adminRejectPayment(
  orderId: string,
  alasan: string,
): Promise<Order | null> {
  return callAction(orderId, "reject-payment", { alasan });
}

export async function adminInputResi(
  orderId: string,
  data: { kurir: string; resi: string },
): Promise<Order | null> {
  return callAction(orderId, "input-resi", data);
}

export async function adminEditResi(
  orderId: string,
  data: { kurir: string; resi: string },
): Promise<Order | null> {
  return callAction(orderId, "edit-resi", data);
}

export async function adminMarkDelivered(orderId: string): Promise<Order | null> {
  return callAction(orderId, "mark-delivered");
}

export async function adminForceSelesai(orderId: string): Promise<Order | null> {
  return callAction(orderId, "force-selesai");
}

export async function adminCancelOrder(
  orderId: string,
  alasan: string,
): Promise<Order | null> {
  return callAction(orderId, "cancel", { alasan });
}

export async function adminEditCatatan(
  orderId: string,
  catatan: string,
): Promise<Order | null> {
  return callAction(orderId, "edit-catatan", { catatan });
}
