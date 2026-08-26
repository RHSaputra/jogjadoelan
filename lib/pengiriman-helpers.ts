"use client";

// Struktur data untuk estimasi area
export interface EstimasiArea {
  area: string;
  estimasi: string;
  icon?: string; // opsional, default MapPin
}

// Struktur data untuk mitra ekspedisi
export interface MitraEkspedisi {
  id: string;
  nama: string;
}

// Konten lengkap halaman pengiriman
export interface PengirimanContent {
  heroTitle: string;
  heroSubtitle: string;
  estimasiTitle: string;
  estimasiList: EstimasiArea[];
  mitraTitle: string;
  mitraList: MitraEkspedisi[];
  caraCekTitle: string;
  caraCekSteps: string[]; // array langkah
  catatanTitle: string;
  catatanText: string;
}

// Data default sesuai dengan yang tampil di halaman saat ini
export const PENGIRIMAN_DEFAULT: PengirimanContent = {
  heroTitle: "Kami Kirim ke Seluruh Indonesia",
  heroSubtitle: "Bekerja sama dengan ekspedisi terpercaya untuk pengiriman cepat & aman.",
  estimasiTitle: "Estimasi Pengiriman",
  estimasiList: [
    { area: "Jawa", estimasi: "1-3 hari" },
    { area: "Sumatera & Bali", estimasi: "2-5 hari" },
    { area: "Kalimantan & Sulawesi", estimasi: "3-6 hari" },
    { area: "Indonesia Timur", estimasi: "5-10 hari" },
  ],
  mitraTitle: "Mitra Ekspedisi",
  mitraList: [
    { id: "jne", nama: "JNE" },
    { id: "jnt", nama: "J&T" },
    { id: "sicepat", nama: "SiCepat" },
    { id: "anteraja", nama: "AnterAja" },
    { id: "gosend", nama: "GoSend" },
    { id: "grab", nama: "Grab Express" },
  ],
  caraCekTitle: "Cara Cek Resi",
  caraCekSteps: [
    "Buka menu Pesanan Saya di akun Anda",
    "Pilih pesanan yang sudah berstatus Dikirim",
    "Salin nomor resi yang tertera",
    "Cek di website ekspedisi atau klik tombol Lacak",
  ],
  catatanTitle: "Catatan",
  catatanText: "Estimasi tidak termasuk hari libur nasional. Pengiriman ekspres tersedia untuk area Jogja & sekitarnya, hubungi admin untuk info lebih lanjut.",
};

const SETTINGS_KEY = "pengiriman";

/**
 * Load pengiriman page content dari Database via API.
 * Dipakai oleh customer pages (/pengiriman) dan admin editor.
 */
export async function getPengirimanContentAsync(): Promise<PengirimanContent> {
  try {
    const res = await fetch(`/api/settings?keys=${SETTINGS_KEY}`);
    const j = await res.json();
    const val = j?.data?.[SETTINGS_KEY];
    return val ? { ...PENGIRIMAN_DEFAULT, ...val } : PENGIRIMAN_DEFAULT;
  } catch {
    return PENGIRIMAN_DEFAULT;
  }
}

/**
 * Simpan pengiriman page content ke Database via API.
 * Dipakai oleh admin editor.
 */
export async function savePengirimanContentAsync(content: PengirimanContent): Promise<void> {
  await fetch("/api/admin/settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: SETTINGS_KEY, value: content }),
  });
  window.dispatchEvent(new Event("jogjadoelan_pengiriman_updated"));
}

/** @deprecated Gunakan getPengirimanContentAsync() — localStorage sudah tidak didukung */
export function getPengirimanContent(): PengirimanContent {
  return PENGIRIMAN_DEFAULT;
}

/** @deprecated Gunakan savePengirimanContentAsync() — localStorage sudah tidak didukung */
export function savePengirimanContent(content: PengirimanContent) {
  if (typeof window === "undefined") return;
  savePengirimanContentAsync(content).catch(() => {});
  window.dispatchEvent(new Event("jogjadoelan_pengiriman_updated"));
}
