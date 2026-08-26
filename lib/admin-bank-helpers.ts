"use client";
// lib/admin-bank-helpers.ts
// Semua operasi bank/QRIS/instruksi sekarang melalui API → Database.
// Tidak ada lagi localStorage.

import { emitSync } from "@/lib/sync-events";

/* === TYPES === */
export interface BankInfo {
  id?: string;
  key: string;       // mapped dari keyUnik (backward compat)
  keyUnik?: string;
  nama: string;
  noRek: string;
  anNama: string;
  color: string;
  logoPath?: string | null;
  urutan?: number;
  aktif?: boolean;
}

export interface QrisInfo {
  id?: number;
  url: string;       // mapped dari qrPath (display + storage reference)
  qrPath?: string | null; // database field name
  merchantName: string;
  aktif?: boolean;
}

export interface InstruksiPembayaran {
  readyStok: string;
  customDp: string;
  pelunasan: string;
}

/* === DB row → BankInfo shape === */
interface BankRow {
  id: string;
  keyUnik: string;
  nama: string;
  noRek: string;
  anNama: string;
  color?: string | null;
  logoPath?: string | null;
  urutan?: number | null;
  aktif?: boolean | null;
}

interface QrisRow {
  id: number;
  qrPath?: string | null;
  merchantName?: string | null;
  aktif?: boolean | null;
}

function rowToBank(row: BankRow): BankInfo {
  return {
    id: row.id,
    key: row.keyUnik,
    keyUnik: row.keyUnik,
    nama: row.nama,
    noRek: row.noRek,
    anNama: row.anNama,
    color: row.color ?? "#0E2148",
    logoPath: row.logoPath ?? null,
    urutan: row.urutan ?? 0,
    aktif: row.aktif ?? true,
  };
}

function rowToQris(row: QrisRow): QrisInfo {
  return {
    id: row.id,
    url: row.qrPath ?? "",
    qrPath: row.qrPath ?? null,
    merchantName: row.merchantName ?? "Jogjadoelan QRIS",
    aktif: row.aktif ?? true,
  };
}

/* === BANK === */
export async function getAdminBanks(): Promise<BankInfo[]> {
  try {
    const res = await fetch("/api/admin/bank", { credentials: "include" });
    const j = await res.json();
    return Array.isArray(j?.data) ? j.data.map(rowToBank) : [];
  } catch { return []; }
}

export async function saveAdminBanks(list: BankInfo[]): Promise<void> {
  const payload = list.map((b, i) => ({
    keyUnik: b.keyUnik ?? b.key ?? `bank-${i}`,
    nama: b.nama,
    noRek: b.noRek,
    anNama: b.anNama,
    color: b.color,
    logoPath: b.logoPath ?? null,
    urutan: b.urutan ?? i,
    aktif: b.aktif ?? true,
  }));
  await fetch("/api/admin/bank", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  emitSync("bank");
}

/* === QRIS === */
export async function getAdminQris(): Promise<QrisInfo> {
  try {
    const res = await fetch("/api/admin/qris", { credentials: "include" });
    const j = await res.json();
    return j?.data ? rowToQris(j.data) : { url: "", merchantName: "Jogjadoelan QRIS" };
  } catch { return { url: "", merchantName: "Jogjadoelan QRIS" }; }
}

export async function saveAdminQris(q: QrisInfo): Promise<void> {
  await fetch("/api/admin/qris", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantName: q.merchantName,
      qrPath: q.qrPath || q.url || null,
      aktif: q.aktif ?? true,
    }),
  });
  emitSync("qris");
}

/* === INSTRUKSI === */
const DEF_INSTRUKSI: InstruksiPembayaran = {
  readyStok: "Lakukan pembayaran sesuai total tagihan ke salah satu rekening di atas.",
  customDp: "Bayar DP minimal 50% agar pesanan custom Anda segera mulai diproduksi.",
  pelunasan: "Lakukan pelunasan sisa tagihan. Barang akan dikirim setelah pelunasan dikonfirmasi.",
};

export async function getAdminInstruksi(): Promise<InstruksiPembayaran> {
  try {
    const res = await fetch("/api/admin/instruksi", { credentials: "include" });
    const j = await res.json();
    return j?.data ? { ...DEF_INSTRUKSI, ...j.data } : DEF_INSTRUKSI;
  } catch { return DEF_INSTRUKSI; }
}

export async function saveAdminInstruksi(ins: InstruksiPembayaran): Promise<void> {
  await fetch("/api/admin/instruksi", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ins),
  });
  emitSync("instruksi");
}
