"use client";

import type { Alamat } from "@/lib/auth-context";

export interface AlamatValidationResult {
  ok: boolean;
  error?: string;
  alamat?: Alamat;
}

const REQUIRED_FIELDS: Array<keyof Alamat> = [
  "penerima",
  "noHp",
  "provinsi",
  "kota",
  "kecamatan",
  "kodePos",
  "detail",
];

const FIELD_LABELS: Record<string, string> = {
  penerima: "Nama Penerima",
  noHp: "No HP",
  provinsi: "Provinsi",
  kota: "Kota/Kabupaten",
  kecamatan: "Kecamatan",
  kodePos: "Kode Pos",
  detail: "Detail Alamat",
};

function isStringFilled(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function getAlamatUtama(
  list: Alamat[] | undefined | null,
): Alamat | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const utama = list.find((a) => a?.isUtama === true);
  if (utama) return utama;
  return list[0] ?? null;
}

export function isAlamatValid(a: Alamat | null | undefined): boolean {
  if (!a) return false;
  for (const k of REQUIRED_FIELDS) {
    if (!isStringFilled((a as unknown as Record<string, unknown>)[k as string])) {
      return false;
    }
  }
  return true;
}

export function getMissingFields(a: Alamat | null | undefined): string[] {
  if (!a) return REQUIRED_FIELDS.map((k) => FIELD_LABELS[k as string] ?? String(k));
  const out: string[] = [];
  for (const k of REQUIRED_FIELDS) {
    if (!isStringFilled((a as unknown as Record<string, unknown>)[k as string])) {
      out.push(FIELD_LABELS[k as string] ?? String(k));
    }
  }
  return out;
}

export function validateAlamatForOrder(
  list: Alamat[] | undefined | null,
): AlamatValidationResult {
  if (!Array.isArray(list) || list.length === 0) {
    return {
      ok: false,
      error:
        "Belum ada alamat pengiriman. Tambahkan alamat dulu di Profil → Alamat sebelum melanjutkan pembayaran.",
    };
  }
  const utama = getAlamatUtama(list);
  if (!utama) {
    return {
      ok: false,
      error:
        "Belum ada alamat utama. Set salah satu alamat sebagai alamat utama di Profil → Alamat.",
    };
  }
  if (!isAlamatValid(utama)) {
    const missing = getMissingFields(utama);
    return {
      ok: false,
      error: `Alamat utama belum lengkap. Field kosong: ${missing.join(", ")}. Lengkapi dulu di Profil → Alamat.`,
      alamat: utama,
    };
  }
  return { ok: true, alamat: utama };
}

export function formatAlamatRingkas(a: Alamat | null | undefined): string {
  if (!a) return "";
  const parts = [a.detail, a.kecamatan, a.kota, a.provinsi, a.kodePos]
    .filter((s) => typeof s === "string" && s.trim().length > 0);
  return parts.join(", ");
}
