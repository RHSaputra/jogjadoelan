"use client";

import { useEffect, useState } from "react";
import {
  getAdminInstruksi,
  type BankInfo,
  type QrisInfo,
  type InstruksiPembayaran,
} from "@/lib/admin-bank-helpers";
import { subscribeSync } from "@/lib/sync-events";

/* ── Normalized bank shape used by checkout / pelunasan / pembayaran ── */
export interface RekeningBank {
  id: string;
  nama: string;
  norek: string;
  atasNama: string;
  warna: string;
  logoBg: string;
}

/**
 * Convert BankInfo (admin) → RekeningBank (customer-facing).
 * id uses keyUnik so any bank key added by admin works.
 */
function toRekening(b: BankInfo): RekeningBank {
  const key = (b.keyUnik ?? b.key ?? "").toLowerCase();
  return {
    id: key,
    nama: b.nama,
    norek: b.noRek ?? "",
    atasNama: b.anNama ?? "JOGJADOELAN",
    warna: b.color || "#0E2148",
    logoBg: "bg-[#0E2148]",
  };
}

/**
 * Fetch banks dari public API endpoint.
 *
 * ⚠️ API mengembalikan { data: [...] }, jadi kita harus parse .data
 * terlebih dahulu.  Kalau kosong / error, fallback ke default constants
 * agar halaman tidak kosong total.
 */
async function fetchPublicBanks(): Promise<RekeningBank[]> {
  try {
    const res = await fetch("/api/bank", { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    // API wraps in { data: [...] }
    const raw: BankInfo[] = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : [];
    if (raw.length === 0) return [];
    return raw.map(toRekening);
  } catch {
    return [];
  }
}

/**
 * Fetch QRIS dari public API endpoint.
 *
 * ⚠️ API mengembalikan { data: {...} }, jadi kita harus parse .data.
 */
async function fetchPublicQris(): Promise<QrisInfo> {
  try {
    const res = await fetch("/api/qris", { cache: "no-store" });
    if (!res.ok) return { url: "", merchantName: "Jogjadoelan QRIS" };
    const json = await res.json();
    // API wraps in { data: {...} }
    const raw = json?.data ?? json;
    const qrPath = raw?.qrPath || null;
    return {
      url: qrPath || "",
      qrPath,
      merchantName: raw?.merchantName ?? "Jogjadoelan QRIS",
      aktif: raw?.aktif ?? true,
    };
  } catch {
    return { url: "", merchantName: "Jogjadoelan QRIS" };
  }
}

/** Bank list aktif: fetch dari public API, fallback ke default. */
export function useBankList(): RekeningBank[] {
  const [list, setList] = useState<RekeningBank[]>([]);
  useEffect(() => {
    const refresh = async () => {
      const banks = await fetchPublicBanks();
      setList(banks);
    };
    void refresh();
    return subscribeSync("bank", () => { void refresh(); });
  }, []);
  return list;
}

/** QRIS aktif: fetch dari public API. */
export function useQrisConfig(): QrisInfo {
  const [q, setQ] = useState<QrisInfo>({ url: "", merchantName: "Jogjadoelan QRIS" });
  useEffect(() => {
    const refresh = async () => {
      const qris = await fetchPublicQris();
      setQ(qris);
    };
    void refresh();
    return subscribeSync("qris", () => { void refresh(); });
  }, []);
  return q;
}

/** Instruksi pembayaran (admin set / default). */
export function useInstruksiPembayaran(): InstruksiPembayaran {
  const [ins, setIns] = useState<InstruksiPembayaran>(() => ({
    readyStok: "Lakukan pembayaran sesuai total tagihan ke salah satu rekening di atas.",
    customDp: "Bayar DP minimal 50% agar pesanan custom Anda segera mulai diproduksi.",
    pelunasan: "Lakukan pelunasan sisa tagihan. Barang akan dikirim setelah pelunasan dikonfirmasi.",
  }));
  useEffect(() => {
    const refresh = async () => setIns(await getAdminInstruksi());
    void refresh();
    return subscribeSync("instruksi", () => { void refresh(); });
  }, []);
  return ins;
}
