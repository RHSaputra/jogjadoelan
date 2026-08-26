"use client";

/* ============================================================
 *  Admin Custom Options — CMS untuk form custom helm
 *  Semua opsi & gambar referensi di customer (/custom) bisa
 *  diedit dari sini.
 *  Data disimpan di Database (SiteSetting) via API.
 * ============================================================ */

import { emitSync } from "@/lib/sync-events";

export interface CustomOptionItem {
  id: string;
  label: string;
}

export interface CustomSectionOption {
  title: string;
  description: string;
  imageUrl: string;
  options: CustomOptionItem[];
}

export interface CustomColorSwatch {
  id: string;
  nama: string;
  hex: string;
}

export interface CustomFormConfig {
  jenis: CustomSectionOption;
  finishing: CustomSectionOption;
  strap: CustomSectionOption;
  ukuran: CustomSectionOption;
  motifBusa: CustomSectionOption;
  bahan: CustomSectionOption;
  aksesoris: CustomSectionOption;
  palette: CustomColorSwatch[];
  warnaMax: number;
}

export const CUSTOM_FORM_DEFAULT: CustomFormConfig = {
  jenis: {
    title: "Jenis Helm",
    description: "Pilihan jenis helm: Sim Head, Half Face, Full Face, Bisa Half, atau Chips.",
    imageUrl: "/custom/jenis.png",
    options: [
      { id: "sim-head", label: "Sim Head" },
      { id: "half-face", label: "Half Face" },
      { id: "full-face", label: "Full Face" },
      { id: "bisa-half", label: "Bisa Half" },
      { id: "chips", label: "Chips" },
    ],
  },
  finishing: {
    title: "Finishing",
    description: "Doff matte tanpa kilap atau Clear Glossy mengkilap.",
    imageUrl: "/custom/finishing.png",
    options: [
      { id: "doff", label: "Doff" },
      { id: "clear-glossy", label: "Clear Glossy" },
    ],
  },
  strap: {
    title: "Strap / Tali",
    description: "Pilihan tali pengait helm.",
    imageUrl: "/custom/strap.png",
    options: [
      { id: "dd-ring-std", label: "DD Ring Standard" },
      { id: "dd-ring-multi", label: "DD Ring Standard Multi Boot" },
      { id: "dd-ring-decker", label: "DD Ring Decker Knop (Kulit Sapi)" },
      { id: "tali-busa-biru", label: "Tali Busa Biru" },
      { id: "tali-busa-hitam", label: "Tali Busa Hitam" },
      { id: "tali-busa-brown", label: "Tali Busa Brown" },
    ],
  },
  ukuran: {
    title: "Ukuran",
    description: "Tabel ukuran lingkar kepala: S (54-55cm), M (56-57cm), L (58-59cm), XL (60-61cm).",
    imageUrl: "/custom/ukuran.png",
    options: [
      { id: "xs", label: "XS" },
      { id: "s", label: "S" },
      { id: "m", label: "M" },
      { id: "l", label: "L" },
      { id: "xl", label: "XL" },
      { id: "xxl", label: "XXL" },
    ],
  },
  motifBusa: {
    title: "Motif Cover Busa",
    description: "Motif kain pelapis busa dalam helm.",
    imageUrl: "/custom/motif-busa.png",
    options: [
      { id: "polos-hitam", label: "Polos Hitam" },
      { id: "leopard", label: "Motif Leopard" },
      { id: "checkerboard", label: "Motif Checkerboard" },
      { id: "bandana", label: "Motif Bandana" },
      { id: "lurik", label: "Motif Lurik/Wajik" },
    ],
  },
  bahan: {
    title: "Bahan Helm",
    description: "ABS Plastic standar SNI. Fiberglass lebih kuat & premium.",
    imageUrl: "/custom/bahan.png",
    options: [
      { id: "abs", label: "ABS (Baru)" },
      { id: "vintage", label: "Vintage Second" },
      { id: "fiberglass", label: "Fiber Glass" },
    ],
  },
  aksesoris: {
    title: "Aksesoris",
    description: "Pilihan tambahan aksesoris helm.",
    imageUrl: "/custom/aksesoris.png",
    options: [
      { id: "pet-visir-smoke", label: "Pet Visor (Smoke)" },
      { id: "pet-visir-clear", label: "Pet Visor (Clear)" },
      { id: "pet-transparan-hitam", label: "Pet Transparan (Hitam)" },
      { id: "pet-transparan-putih", label: "Pet Transparan (Putih)" },
      { id: "random", label: "Random" },
    ],
  },
  palette: [
    { id: "hitam-klasik", nama: "Hitam Klasik", hex: "#0F0F0F" },
    { id: "putih-cream", nama: "Putih Cream", hex: "#FAF4E5" },
    { id: "orange-vintage", nama: "Orange Vintage", hex: "#FF6B1A" },
    { id: "cokelat-tanah", nama: "Cokelat Tanah", hex: "#7C2D12" },
    { id: "hijau-army", nama: "Hijau Army", hex: "#3F4A2A" },
  ],
  warnaMax: 5,
};

const SETTINGS_KEY = "custom_form_options";

/** Load custom form config dari Database via API */
export async function getCustomFormAsync(): Promise<CustomFormConfig> {
  try {
    const res = await fetch(`/api/settings?keys=${SETTINGS_KEY}`);
    const j = await res.json();
    const val = j?.data?.[SETTINGS_KEY];
    return val ? { ...CUSTOM_FORM_DEFAULT, ...val } : CUSTOM_FORM_DEFAULT;
  } catch {
    return CUSTOM_FORM_DEFAULT;
  }
}

/** Simpan custom form config ke Database via API */
export async function saveCustomFormAsync(v: CustomFormConfig): Promise<void> {
  await fetch("/api/admin/settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SETTINGS_KEY, value: v }),
  });
  emitSync("custom");
}

/** @deprecated Gunakan getCustomFormAsync() — localStorage sudah tidak didukung */
export function getCustomForm(): CustomFormConfig {
  return CUSTOM_FORM_DEFAULT;
}

/** @deprecated Gunakan saveCustomFormAsync() — localStorage sudah tidak didukung */
export function saveCustomForm(v: CustomFormConfig) {
  if (typeof window === "undefined") return;
  saveCustomFormAsync(v).catch(() => {});
  window.dispatchEvent(new Event("jogjadoelan_custom_form_changed"));
}
