"use client";

import { api } from "@/lib/api/fetcher";
import type { Refund } from "@/lib/refund-helpers";
import type { Tukar } from "@/lib/tukar-helpers";

/** Admin-only: ambil seluruh refund di sistem (semua user). */
export async function getAllRefundsGlobal(): Promise<Refund[]> {
  try {
    return await api.get<Refund[]>("/api/admin/refund");
  } catch {
    return [];
  }
}

/** Admin-only: ambil seluruh tukar di sistem (semua user). */
export async function getAllTukarsGlobal(): Promise<Tukar[]> {
  try {
    return await api.get<Tukar[]>("/api/admin/tukar");
  } catch {
    return [];
  }
}

export interface ReturnRow {
  kind: "refund" | "tukar";
  id: string;
  komplainId: string;
  orderId: string;
  userId: string;
  status: string;
  createdAt: string;
  nominal?: number;
  productNama?: string;
}

export async function getAllReturnsUnified(): Promise<ReturnRow[]> {
  const [refunds, tukars] = await Promise.all([getAllRefundsGlobal(), getAllTukarsGlobal()]);
  const r: ReturnRow[] = refunds.map((x) => ({
    kind: "refund",
    id: x.id,
    komplainId: x.komplainId,
    orderId: x.orderId,
    userId: x.userId,
    status: x.status,
    createdAt: x.createdAt,
    nominal: x.nominalRefund,
  }));
  const t: ReturnRow[] = tukars.map((x) => ({
    kind: "tukar",
    id: x.id,
    komplainId: x.komplainId,
    orderId: x.orderId,
    userId: x.userId,
    status: x.status,
    createdAt: x.createdAt,
    productNama: x.productNama,
  }));
  return [...r, ...t].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}