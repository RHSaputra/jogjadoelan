"use client";
// lib/admin-voucher-helpers.ts
// Operasi promo/voucher sekarang melalui API → Database (SiteSetting key "promos").

import type { PromoItem } from "@/lib/constants";

export async function getAdminPromos(): Promise<PromoItem[]> {
  try {
    const res = await fetch("/api/admin/promo", { credentials: "include" });
    const j = await res.json();
    return Array.isArray(j?.data) ? (j.data as PromoItem[]) : [];
  } catch { return []; }
}

export async function saveAdminPromos(list: PromoItem[]): Promise<void> {
  await fetch("/api/admin/promo", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(list),
  });
  window.dispatchEvent(new Event("jogjadoelan_promo_changed"));
}

export async function addAdminPromo(p: PromoItem) {
  const cur = await getAdminPromos();
  await saveAdminPromos([...cur, p]);
}
export async function updateAdminPromo(id: string, patch: Partial<PromoItem>) {
  const cur = await getAdminPromos();
  await saveAdminPromos(cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
}
export async function deleteAdminPromo(id: string) {
  const cur = await getAdminPromos();
  await saveAdminPromos(cur.filter((x) => x.id !== id));
}
