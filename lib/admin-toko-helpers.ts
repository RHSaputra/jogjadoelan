"use client";

/**
 * @deprecated Adaptor tipis ke `admin-toko-master-helpers`.
 *
 * File ini DULUNYA punya storage sendiri (KEY_TOKO, KEY_TAMPILAN) yang
 * BERDUPLIKASI dengan data di `admin-toko-master-helpers` (Kontak, Cabang,
 * Branding, Landing). Sekarang seluruh get/save di sini diteruskan ke MASTER
 * agar SATU sumber kebenaran — dari DATABASE via API async.
 *
 * UI yang masih pakai file ini:
 *   - /admin/pengaturan  → TokoConfig
 *   - /admin/tampilan    → TampilanConfig
 *
 * Setelah migrasi DB (Batch 4), 2 halaman admin di atas boleh DIHAPUS karena
 * fungsionalitasnya sudah dicakup oleh:
 *   - /admin/profil-toko        → kontak + identitas
 *   - /admin/toko/cabang        → alamat + jam operasional
 *   - /admin/toko/branding      → warna + logo
 *   - /admin/toko/landing       → hero slides + announcement
 *
 * SAAT ITU TIBA, hapus file ini.
 */

import {
  getBrandingAsync, saveBrandingAsync,
  getKontakAsync, saveKontakAsync,
  getCabangListAsync, saveCabangListAsync, type Cabang,
  getLandingAsync, saveLandingAsync, type HeroSlide,
  getIdentitasAsync, saveIdentitasAsync,
  getBannerPromoListAsync, saveBannerPromoListAsync, type BannerPromoItem,
} from "@/lib/admin-toko-master-helpers";

/* ============================================================
 *  TIPE LEGACY (dipakai UI lama — JANGAN ubah shape-nya)
 * ============================================================ */
export interface TokoConfig {
  namaToko: string; tagline: string; deskripsi: string;
  alamat: string; kota: string; kodePos: string;
  noHp: string; email: string; whatsapp: string; instagram: string;
  jamBuka: string; jamTutup: string; hariBuka: string;
  logoUrl?: string;
}

export interface TampilanConfig {
  heroTitle: string; heroSubtitle: string;
  heroBannerUrl?: string; heroCtaText: string; heroCtaLink: string;
  bannerPromo: BannerPromoItem[];
  primaryColor: string; accentColor: string;
}

/* ============================================================
 *  DEFAULTS (fallback bila MASTER masih kosong)
 * ============================================================ */
export const TOKO_DEFAULT: TokoConfig = {
  namaToko: "Jogjadoelan",
  tagline: "Helm Vintage Asli Yogyakarta",
  deskripsi: "Spesialis helm bogo & retro custom sejak 2018.",
  alamat: "Jl. Malioboro No. 123",
  kota: "Yogyakarta",
  kodePos: "55271",
  noHp: "",
  email: "",
  whatsapp: "",
  instagram: "",
  jamBuka: "09:00",
  jamTutup: "21:00",
  hariBuka: "Senin - Minggu",
  logoUrl: "",
};

export const TAMPILAN_DEFAULT: TampilanConfig = {
  heroTitle: "Helm Vintage Khas Jogja",
  heroSubtitle: "Custom by request, kirim ke seluruh Indonesia",
  heroCtaText: "Belanja Sekarang",
  heroCtaLink: "/belanja",
  bannerPromo: [],
  primaryColor: "#0E2148",
  accentColor: "#FF6B1A",
};

/* ============================================================
 *  HELPER INTERNAL: cabang utama (async)
 * ============================================================ */
async function getCabangUtamaAsync(): Promise<Cabang | null> {
  const list = await getCabangListAsync();
  return list.find((c) => c.utama) ?? list[0] ?? null;
}

async function upsertCabangUtamaAsync(patch: Partial<Cabang>) {
  const list = await getCabangListAsync();
  const idx = list.findIndex((c) => c.utama);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
  } else if (list.length > 0) {
    list[0] = { ...list[0], ...patch, utama: true };
  } else {
    list.push({
      id: `cabang-utama-${Date.now()}`,
      nama: "Workshop Utama",
      alamat: "", kota: "", kodePos: "",
      noHp: "", jamBuka: "", jamTutup: "", hariBuka: "",
      utama: true,
      ...patch,
    });
  }
  await saveCabangListAsync(list);
}

/* ============================================================
 *  TOKO CONFIG — ASYNC (DB as single source of truth)
 * ============================================================ */
export async function getTokoConfigAsync(): Promise<TokoConfig> {
  try {
    const [id, branding, kontak, cabang] = await Promise.all([
      getIdentitasAsync(),
      getBrandingAsync(),
      getKontakAsync(),
      getCabangUtamaAsync(),
    ]);
    return {
      namaToko: id.namaToko || TOKO_DEFAULT.namaToko,
      tagline: id.tagline || TOKO_DEFAULT.tagline,
      deskripsi: id.deskripsi || TOKO_DEFAULT.deskripsi,
      logoUrl: id.logoUrl || branding.logoHeader || "",
      alamat: cabang?.alamat ?? TOKO_DEFAULT.alamat,
      kota: cabang?.kota ?? TOKO_DEFAULT.kota,
      kodePos: cabang?.kodePos ?? TOKO_DEFAULT.kodePos,
      noHp: kontak.hpUtama || TOKO_DEFAULT.noHp,
      email: kontak.email || TOKO_DEFAULT.email,
      whatsapp: kontak.waUtama || TOKO_DEFAULT.whatsapp,
      instagram: kontak.instagram || TOKO_DEFAULT.instagram,
      jamBuka: cabang?.jamBuka ?? TOKO_DEFAULT.jamBuka,
      jamTutup: cabang?.jamTutup ?? TOKO_DEFAULT.jamTutup,
      hariBuka: cabang?.hariBuka ?? TOKO_DEFAULT.hariBuka,
    };
  } catch {
    return TOKO_DEFAULT;
  }
}

export async function saveTokoConfigAsync(c: TokoConfig) {
  // 1. Identitas
  await saveIdentitasAsync({
    namaToko: c.namaToko,
    tagline: c.tagline,
    deskripsi: c.deskripsi,
    logoUrl: c.logoUrl ?? "",
  });
  // 2. Logo ke branding (sinkron biar header logo ikut)
  const branding = await getBrandingAsync();
  if ((c.logoUrl ?? "") !== branding.logoHeader) {
    await saveBrandingAsync({ ...branding, logoHeader: c.logoUrl ?? "" });
  }
  // 3. Kontak
  const kontak = await getKontakAsync();
  await saveKontakAsync({
    ...kontak,
    hpUtama: c.noHp,
    email: c.email,
    waUtama: c.whatsapp,
    instagram: c.instagram,
  });
  // 4. Cabang utama
  await upsertCabangUtamaAsync({
    alamat: c.alamat,
    kota: c.kota,
    kodePos: c.kodePos,
    jamBuka: c.jamBuka,
    jamTutup: c.jamTutup,
    hariBuka: c.hariBuka,
  });
  // 5. Trigger event legacy (untuk listener lama yg subscribe nama ini)
  if (typeof window !== "undefined") window.dispatchEvent(new Event("jogjadoelan_toko_changed"));
}

/** @deprecated Gunakan getTokoConfigAsync() — versi sync hanya return defaults */
export function getTokoConfig(): TokoConfig { return TOKO_DEFAULT; }
/** @deprecated Gunakan saveTokoConfigAsync() — versi sync tidak guaranteed */
export function saveTokoConfig(c: TokoConfig) { void saveTokoConfigAsync(c); }

/* ============================================================
 *  TAMPILAN CONFIG — ASYNC (DB as single source of truth)
 *  hero* di-mapping ke heroSlides[0]
 * ============================================================ */
export async function getTampilanConfigAsync(): Promise<TampilanConfig> {
  try {
    const [branding, landing, bannerPromo] = await Promise.all([
      getBrandingAsync(),
      getLandingAsync(),
      getBannerPromoListAsync(),
    ]);
    const slide0 = landing.heroSlides?.[0] as HeroSlide | undefined;
    return {
      heroTitle: slide0?.title || TAMPILAN_DEFAULT.heroTitle,
      heroSubtitle: slide0?.subtitle || TAMPILAN_DEFAULT.heroSubtitle,
      heroBannerUrl: slide0?.bgImage || slide0?.image || "",
      heroCtaText: slide0?.cta || TAMPILAN_DEFAULT.heroCtaText,
      heroCtaLink: slide0?.ctaLink || TAMPILAN_DEFAULT.heroCtaLink,
      bannerPromo,
      primaryColor: branding.primaryColor || TAMPILAN_DEFAULT.primaryColor,
      accentColor: branding.accentColor || TAMPILAN_DEFAULT.accentColor,
    };
  } catch {
    return TAMPILAN_DEFAULT;
  }
}

export async function saveTampilanConfigAsync(c: TampilanConfig) {
  // 1. Warna brand → branding
  const branding = await getBrandingAsync();
  if (c.primaryColor !== branding.primaryColor || c.accentColor !== branding.accentColor) {
    await saveBrandingAsync({
      ...branding,
      primaryColor: c.primaryColor,
      accentColor: c.accentColor,
    });
  }
  // 2. Hero → landing.heroSlides[0] (create kalau belum ada)
  const landing = await getLandingAsync();
  const slides: HeroSlide[] = [...(landing.heroSlides ?? [])];
  if (slides.length === 0) {
    slides.push({
      id: `slide-utama-${Date.now()}`,
      title: c.heroTitle,
      subtitle: c.heroSubtitle,
      cta: c.heroCtaText,
      ctaLink: c.heroCtaLink,
      image: "",
      bgImage: c.heroBannerUrl ?? "",
      aktif: true,
      urutan: 0,
    });
  } else {
    slides[0] = {
      ...slides[0],
      title: c.heroTitle,
      subtitle: c.heroSubtitle,
      cta: c.heroCtaText,
      ctaLink: c.heroCtaLink,
      bgImage: c.heroBannerUrl || slides[0].bgImage,
    };
  }
  await saveLandingAsync({ ...landing, heroSlides: slides });
  // 3. Banner promo
  await saveBannerPromoListAsync(c.bannerPromo ?? []);
  // 4. Event legacy
  if (typeof window !== "undefined") window.dispatchEvent(new Event("jogjadoelan_tampilan_changed"));
}

/** @deprecated Gunakan getTampilanConfigAsync() — versi sync hanya return defaults */
export function getTampilanConfig(): TampilanConfig { return TAMPILAN_DEFAULT; }
/** @deprecated Gunakan saveTampilanConfigAsync() — versi sync tidak guaranteed */
export function saveTampilanConfig(c: TampilanConfig) { void saveTampilanConfigAsync(c); }