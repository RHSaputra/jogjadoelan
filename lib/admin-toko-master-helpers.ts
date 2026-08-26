"use client";

// === BRANDING ===
export interface BrandingConfig {
  logoHeader: string; logoFooter: string; logoAdmin: string; favicon: string;
  fontPrimary: string; fontHeading: string;
  primaryColor: string; accentColor: string; bgColor: string; textColor: string;
  borderRadius: "sharp" | "rounded" | "pill";
}
export const BRANDING_DEFAULT: BrandingConfig = {
  logoHeader: "", logoFooter: "", logoAdmin: "", favicon: "",
  fontPrimary: "Inter", fontHeading: "Bebas Neue",
  primaryColor: "#FF6B1A", accentColor: "#fc970a", bgColor: "#F1F3F8", textColor: "#1a1a1a",
  borderRadius: "rounded",
};

// === HERO SLIDES (multi-CRUD) ===
export interface HeroSlide {
  id: string; title: string; subtitle: string; cta: string; ctaLink: string;
  image: string; bgImage: string; aktif: boolean; urutan: number;
}
// === SECTION VISIBILITY ===
export interface SectionVisibility {
  kategori: boolean; rekomendasi: boolean; partner: boolean;
  keunggulan: boolean; infoToko: boolean; follow: boolean;
}
export const SECTION_VIS_DEFAULT: SectionVisibility = {
  kategori: true, rekomendasi: true, partner: true,
  keunggulan: true, infoToko: true, follow: true,
};

// === ANNOUNCEMENT BAR (strip atas) ===
export interface AnnouncementBar {
  aktif: boolean; text: string; link?: string; warna: string;
}
export const ANNOUNCEMENT_DEFAULT: AnnouncementBar = { aktif: false, text: "", warna: "bg-amber-500" };

// === POPUP WELCOME ===
export interface PopupWelcome {
  aktif: boolean; judul: string; deskripsi: string; gambar?: string;
  ctaText: string; ctaLink: string; frequency: "once" | "daily" | "session";
}
export const POPUP_DEFAULT: PopupWelcome = { aktif: false, judul: "", deskripsi: "", ctaText: "Belanja", ctaLink: "/belanja", frequency: "once" };

// ============================================================
//  SECTION CONTENT — schema per section landing customer
// ============================================================

/** Header generik dipakai banyak section */
export interface SectionHeader {
  eyebrow: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
}

/** 1. KATEGORI — 2 kartu (Ready Stock & Custom) */
export interface KategoriCard {
  id: string;
  nama: string;
  deskripsi: string;
  ctaText: string;
  href: string;
  image: string;
}
export interface KategoriConfig {
  header: SectionHeader;
  cards: KategoriCard[];
}
export const KATEGORI_DEFAULT: KategoriConfig = {
  header: {
    eyebrow: "Kategori",
    title: "Pilih Kategori Favorit Anda",
    subtitle: "Temukan helm terbaik sesuai kebutuhan dan style Anda",
  },
  cards: [
    { id: "ready-stock", nama: "Ready Stock", deskripsi: "Helm siap kirim, langsung pakai.", ctaText: "Lihat Koleksi", href: "/belanja", image: "" },
    { id: "custom", nama: "Custom Helm", deskripsi: "Desain helm sesuai selera Anda.", ctaText: "Mulai Custom", href: "/custom", image: "" },
  ],
};

/** 2. REKOMENDASI — header only */
export interface RekomendasiConfig {
  title: string;
  subtitle?: string;
  ctaLihatSemua: string;
  ctaHref: string;
}
export const REKOMENDASI_DEFAULT: RekomendasiConfig = {
  title: "Rekomendasi Untuk Anda",
  subtitle: "Pilihan Eksklusif",
  ctaLihatSemua: "Lihat Semua",
  ctaHref: "/belanja",
};

/** 3. PARTNER / CULTURE — 3 kartu */
export interface CultureCard {
  id: string;
  iconKey: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
}
export interface PartnerConfig {
  header: SectionHeader;
  cards: CultureCard[];
  footnoteTitle: string;
  footnoteText: string;
}
export const PARTNER_DEFAULT: PartnerConfig = {
  header: {
    eyebrow: "BUKAN SEKADAR HELM · TAPI KARAKTER",
    title: "Vintage Rider",
    titleHighlight: "Culture",
    subtitle: "Jogjadoelan menghadirkan pengalaman riding bergaya vintage dengan karakter klasik, sentuhan custom personal, dan nuansa retro yang tetap relevan untuk rider modern masa kini.",
  },
  cards: [
    { id: "retro-daily", iconKey: "bike", title: "RETRO DAILY RIDE", subtitle: "Classic style for modern rider", description: "Helm vintage yang cocok dipakai harian dengan tampilan retro klasik yang tetap nyaman digunakan untuk riding modern maupun santai.", badge: "RETRO · DAILY USE" },
    { id: "express-style", iconKey: "palette", title: "EXPRESS YOUR STYLE", subtitle: "Every rider has unique character", description: "Pilih warna, visor, dan detail helm yang paling sesuai dengan karakter Anda untuk menciptakan gaya riding yang lebih personal.", badge: "CUSTOM · PERSONAL STYLE" },
    { id: "journey-story", iconKey: "coffee", title: "BUILT FOR THE JOURNEY", subtitle: "More than a helmet, it's an experience", description: "Mulai dari city ride, nongkrong malam, hingga touring santai — setiap perjalanan selalu punya cerita bersama helm vintage favorit.", badge: "RIDE · STORY · EXPERIENCE" },
  ],
  footnoteTitle: "✦ RIDE · STYLE · CULTURE ✦",
  footnoteText: "Jogjadoelan bukan hanya tentang helm vintage, tetapi juga tentang gaya hidup, karakter rider, dan cerita di setiap perjalanan.",
};

/** 4. KEUNGGULAN — 4 item */
export interface KeunggulanItem {
  id: string;
  iconKey: string;
  judul: string;
  deskripsi: string;
}
export interface KeunggulanConfig {
  header: SectionHeader;
  items: KeunggulanItem[];
  footnote: string;
}
export const KEUNGGULAN_DEFAULT: KeunggulanConfig = {
  header: {
    eyebrow: "WHY RIDE WITH US",
    title: "Keunggulan",
    titleHighlight: "Kami",
    subtitle: "Komitmen workshop Jogjadoelan untuk setiap rider — dari kualitas, originalitas, sampai layanan after-sales.",
  },
  items: [
    { id: "k1", iconKey: "award", judul: "Kualitas Terjamin", deskripsi: "Material premium dan jahitan rapi sesuai standar workshop." },
    { id: "k2", iconKey: "shield-check", judul: "Garansi Original", deskripsi: "Garansi resmi sampai 6 bulan untuk setiap helm." },
    { id: "k3", iconKey: "truck", judul: "Pengiriman Aman", deskripsi: "Packing aman dan dikirim ke seluruh Indonesia." },
    { id: "k4", iconKey: "brush", judul: "Custom Personal", deskripsi: "Bebas pilih warna, motif, dan aksesoris sesuai selera." },
  ],
  footnote: "CRAFTED IN YOGYAKARTA · SINCE 2019",
};

/** 5. INFO TOKO — alamat + jam buka */
export interface InfoTokoConfig {
  header: SectionHeader;
  labelAlamat: string;
  labelJam: string;
  ctaMapsText: string;
  jamCatatan: string;
  mapsUrl: string;
  footnote: string;
}
export const INFOTOKO_DEFAULT: InfoTokoConfig = {
  header: {
    eyebrow: "TEMUKAN KAMI · FIND THE WORKSHOP",
    title: " WORKSHOP",
    titleHighlight: "Workshop",
    subtitle: "Datang langsung ke workshop kami di Yogyakarta. Lihat koleksi helm vintage, konsultasi custom, atau sekedar ngobrol soal motor klasik.",
  },
  labelAlamat: "Alamat Workshop",
  labelJam: "Operational Hours",
  ctaMapsText: "Buka di Google Maps",
  jamCatatan: "Minggu & hari libur nasional tutup",
  mapsUrl: "https://share.google/l3NT59ugfxPa4TzEV",
  footnote: "✦ TAP CARD UNTUK MEMBUKA GOOGLE MAPS ✦",
};

/** 6. FOLLOW SOSMED — 4 kartu */
export interface SosmedCard {
  id: string;
  iconKey: string;
  label: string;
  handle: string;
  followers: string;
  desc: string;
  href: string;
}
export interface FollowConfig {
  header: SectionHeader;
  liveTicker: string;
  cards: SosmedCard[];
  ribbonText: string;
  ribbonNote: string;
}
export const FOLLOW_DEFAULT: FollowConfig = {
  header: {
    eyebrow: "JOIN THE RIDE · COMMUNITY",
    title: "Follow",
    titleHighlight: "Kami",
    subtitle: "Gabung komunitas Jogjadoelan di sosial media kami. Update koleksi terbaru, promo eksklusif, dan cerita di balik setiap helm vintage.",
  },
  liveTicker: "99RB+ FOLLOWERS · 4 PLATFORM · DAILY POSTS",
  cards: [
    { id: "ig", iconKey: "instagram", label: "INSTAGRAM", handle: "@jogjadoelan", followers: "68+K Followers", desc: "Foto produk, koleksi vintage, dan behind-the-scene workshop tiap hari.", href: "https://instagram.com/jogjadoelan" },
    { id: "tt", iconKey: "tiktok", label: "TIKTOK", handle: "@jogjadoelan", followers: "2+K Followers", desc: "Video proses custom helm, kolaborasi rider, dan konten viral mingguan.", href: "https://tiktok.com/@jogjadoelan" },
    { id: "fb", iconKey: "facebook", label: "FACEBOOK", handle: "Jogjadoelan", followers: "28+K Followers", desc: "Update promo, komunitas riders, dan event meet-up Jogja.", href: "https://facebook.com/jogjadoelan" },
    { id: "chat", iconKey: "chat", label: "LIVE CHAT", handle: "@admin", followers: "customer", desc: "Chat admin langsung untuk order, custom, dan konsultasi helm.", href: "/chat" },
  ],
  ribbonText: "TAG #JOGJADOELAN PADA HELM VINTAGE-MU",
  ribbonNote: "Best post tiap minggu kami feature di Instagram resmi",
};

// === LANDING CONFIG (gabungan) ===
export interface LandingConfig {
  heroSlides: HeroSlide[];
  sectionVis: SectionVisibility;
  announcement: AnnouncementBar;
  popup: PopupWelcome;
  kategori: KategoriConfig;
  rekomendasi: RekomendasiConfig;
  partner: PartnerConfig;
  keunggulan: KeunggulanConfig;
  infoToko: InfoTokoConfig;
  follow: FollowConfig;
}
export const LANDING_DEFAULT: LandingConfig = {
  heroSlides: [], sectionVis: SECTION_VIS_DEFAULT, announcement: ANNOUNCEMENT_DEFAULT, popup: POPUP_DEFAULT,
  kategori: KATEGORI_DEFAULT,
  rekomendasi: REKOMENDASI_DEFAULT,
  partner: PARTNER_DEFAULT,
  keunggulan: KEUNGGULAN_DEFAULT,
  infoToko: INFOTOKO_DEFAULT,
  follow: FOLLOW_DEFAULT,
};

/** Map lucide icon key → component (dipakai oleh customer section + admin picker) */
export const ICON_OPTIONS = [
  { key: "award", label: "Trophy / Award" },
  { key: "shield-check", label: "Perisai / Garansi" },
  { key: "truck", label: "Truk / Pengiriman" },
  { key: "brush", label: "Kuas / Custom" },
  { key: "package", label: "Paket / Box" },
  { key: "bike", label: "Sepeda / Motor" },
  { key: "palette", label: "Palet Warna" },
  { key: "coffee", label: "Coffee / Hangout" },
  { key: "star", label: "Bintang" },
  { key: "heart", label: "Hati / Love" },
  { key: "flame", label: "Api / Hot" },
  { key: "zap", label: "Petir / Power" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok (custom)" },
  { key: "whatsapp", label: "WhatsApp (custom)" },
  { key: "chat", label: "Chat Bubble" },
] as const;

// === CABANG ===
export interface Cabang {
  id: string; nama: string; alamat: string; kota: string; kodePos: string;
  noHp: string; lat?: number; lng?: number; mapsUrl?: string;
  jamBuka: string; jamTutup: string; hariBuka: string; utama: boolean;
}

// === KONTAK EXTENDED ===
export interface KontakExtended {
  hpUtama: string; hpCadangan: string; waUtama: string; waCadangan: string;
  email: string; instagram: string; facebook: string; tiktok: string;
  youtube: string; tokopedia: string; shopee: string; tiktokShop: string;
  waTemplate: string; floatingWa: boolean; floatingPosisi: "kanan" | "kiri";
}
export const KONTAK_DEFAULT: KontakExtended = {
  hpUtama: "081234567890", hpCadangan: "", waUtama: "6281234567890", waCadangan: "",
  email: "halo@jogjadoelan.id", instagram: "@jogjadoelan", facebook: "", tiktok: "",
  youtube: "", tokopedia: "", shopee: "", tiktokShop: "",
  waTemplate: "Halo Jogjadoelan, saya mau tanya tentang...",
  floatingWa: true, floatingPosisi: "kanan",
};

// === SHARED storage keys (dipakai oleh admin-toko-helpers untuk event dispatch) ===
export const TOKO_STORAGE_KEYS = {
  branding: "jogjadoelan_admin_branding",
  landing: "jogjadoelan_admin_landing",
  cabang: "jogjadoelan_admin_cabang",
  kontak: "jogjadoelan_admin_kontak",
  halaman: "jogjadoelan_admin_halaman",
  faq: "jogjadoelan_admin_faq",
  operasional: "jogjadoelan_admin_operasional",
  seo: "jogjadoelan_admin_seo",
  footer: "jogjadoelan_admin_footer",
  tema: "jogjadoelan_admin_tema",
};

// ================================================================
//  DB AS SINGLE SOURCE OF TRUTH
//  Sync versions: return defaults (SSR-safe). Admin pages should use async.
//  Async versions: read/write from DB API.
// ================================================================

async function apiGet<T>(key: string, def: T): Promise<T> {
  try {
    const res = await fetch(`/api/settings?keys=${key}`);
    if (!res.ok) return def;
    const j = await res.json();
    const val = j?.data?.[key];
    if (val === undefined || val === null) return def;
    // Deep merge: top-level spread agar field baru dari default tidak hilang
    // Array & primitive langsung dari DB (tidak di-overwrite default)
    if (typeof val === "object" && !Array.isArray(val)) {
      return deepMerge(def as Record<string, unknown>, val as Record<string, unknown>) as T;
    }
    return val as T;
  } catch { return def; }
}

/** Deep merge: rekursif gabungkan `base` (default) dengan `override` (dari DB).
 *  - Object: rekursif merge
 *  - Array: pakai nilai dari `override` (data DB lebih prioritas)
 *  - Primitive: pakai nilai dari `override`
 */
function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base } as T;
  for (const key of Object.keys(override) as (keyof T)[]) {
    const bVal = base[key];
    const oVal = override[key];
    if (
      oVal !== undefined &&
      oVal !== null &&
      typeof oVal === "object" &&
      !Array.isArray(oVal) &&
      typeof bVal === "object" &&
      bVal !== null &&
      !Array.isArray(bVal)
    ) {
      result[key] = deepMerge(
        bVal as Record<string, unknown>,
        oVal as Record<string, unknown>
      ) as T[keyof T];
    } else if (oVal !== undefined) {
      result[key] = oVal as T[keyof T];
    }
  }
  return result;
}


async function apiSave(key: string, val: unknown): Promise<void> {
  await fetch("/api/admin/settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: val }),
  });
}

// === BRANDING ===
/** @deprecated Gunakan getBrandingAsync() — sync versi hanya return defaults */
export const getBranding = (): BrandingConfig => BRANDING_DEFAULT;
export const saveBranding = (v: BrandingConfig) => { void apiSave("branding", v); };

// === LANDING ===
/** @deprecated Gunakan getLandingAsync() — sync versi hanya return defaults */
export const getLanding = (): LandingConfig => LANDING_DEFAULT;
export const saveLanding = (v: LandingConfig) => { void apiSave("landing", v); };

// === CABANG ===
/** @deprecated Gunakan getCabangListAsync() */
export function getCabangList(): Cabang[] { return []; }
/** @deprecated Gunakan saveCabangListAsync() */
export function saveCabangList(list: Cabang[]) { void apiSave("cabang", list); }

// === KONTAK ===
/** @deprecated Gunakan getKontakAsync() */
export const getKontak = (): KontakExtended => KONTAK_DEFAULT;
/** @deprecated Gunakan saveKontakAsync() */
export const saveKontak = (v: KontakExtended) => { void apiSave("kontak", v); };

// === OPERASIONAL ===
export interface LiburItem { id: string; tanggalMulai: string; tanggalSelesai: string; alasan: string; }
export interface OperasionalConfig {
  minOrder: number; maxItemCart: number;
  maintenanceMode: boolean; maintenancePesan: string;
  tutupOtomatisPesan: string;
  libur: LiburItem[];
}
export const OPERASIONAL_DEFAULT: OperasionalConfig = {
  minOrder: 0, maxItemCart: 99,
  maintenanceMode: false, maintenancePesan: "Toko sedang dalam pemeliharaan. Mohon kembali nanti.",
  tutupOtomatisPesan: "Toko sedang tutup. Pesan akan diproses saat buka kembali.",
  libur: [],
};
/** @deprecated Gunakan getOperasionalAsync() */
export const getOperasional = (): OperasionalConfig => OPERASIONAL_DEFAULT;
/** @deprecated Gunakan saveOperasionalAsync() */
export const saveOperasional = (v: OperasionalConfig) => { void apiSave("operasional", v); };

// === FOOTER CUSTOMIZER ===
export interface FooterLink { id: string; label: string; href: string; }
export interface FooterColumn { id: string; title: string; links: FooterLink[]; }
export interface FooterConfig {
  columns: FooterColumn[];
  copyright: string;
  newsletter: boolean;
  newsletterTitle: string;
  newsletterDesc: string;
  showSosmed: boolean;
  showMarketplace: boolean;
  showMetodePembayaran: boolean;
  bgColor: string;
  textColor: string;
}
export const FOOTER_DEFAULT: FooterConfig = {
  columns: [
    { id: "col-1", title: "Layanan", links: [
      { id: "l1", label: "Custom Helm", href: "/custom" },
      { id: "l2", label: "Garansi", href: "/garansi" },
      { id: "l3", label: "Bantuan", href: "/bantuan" },
    ]},
    { id: "col-2", title: "Tentang", links: [
      { id: "l4", label: "Tentang Kami", href: "/tentang" },
      { id: "l5", label: "Kebijakan Privasi", href: "/privasi" },
      { id: "l6", label: "Syarat & Ketentuan", href: "/syarat" },
    ]},
  ],
  copyright: "© 2025 Jogjadoelan. All rights reserved.",
  newsletter: true,
  newsletterTitle: "Dapat update terbaru",
  newsletterDesc: "Promo & rilis helm baru langsung ke email kamu",
  showSosmed: true, showMarketplace: true, showMetodePembayaran: true,
  bgColor: "", textColor: "#ffffff",
};
/** @deprecated Gunakan getFooterAsync() */
export const getFooter = (): FooterConfig => FOOTER_DEFAULT;
/** @deprecated Gunakan saveFooterAsync() */
export const saveFooter = (v: FooterConfig) => { void apiSave("footer", v); };

// === IDENTITAS ===
export interface IdentitasConfig {
  namaToko: string; tagline: string; deskripsi: string; logoUrl: string;
}
export const IDENTITAS_DEFAULT: IdentitasConfig = {
  namaToko: "Jogjadoelan",
  tagline: "Helm Vintage Asli Yogyakarta",
  deskripsi: "Spesialis helm bogo & retro custom sejak 2018.",
  logoUrl: "",
};
/** @deprecated Gunakan getIdentitasAsync() */
export const getIdentitas = (): IdentitasConfig => IDENTITAS_DEFAULT;
/** @deprecated Gunakan saveIdentitasAsync() */
export const saveIdentitas = (v: IdentitasConfig) => { void apiSave("identitas", v); };

// === BANNER PROMO ===
export interface BannerPromoItem { judul: string; warna: string; link?: string; }
/** @deprecated Gunakan getBannerPromoListAsync() */
export function getBannerPromoList(): BannerPromoItem[] { return []; }
/** @deprecated Gunakan saveBannerPromoListAsync() */
export function saveBannerPromoList(list: BannerPromoItem[]) { void apiSave("bannerPromo", list); }

// === FAQ ===
export interface FaqItem {
  id: string;
  kategori: string;
  pertanyaan: string;
  jawaban: string;
  urutan: number;
  aktif: boolean;
}
/** @deprecated Gunakan getFaqListAsync() */
export function getFaqList(): FaqItem[] { return []; }
/** @deprecated Gunakan saveFaqListAsync() */
export function saveFaqList(list: FaqItem[]) { void apiSave("faq", list); }

// ================================================================
//  ASYNC API VERSIONS (DB as single source of truth)
//  Admin: tulis ke SiteSetting via PUT /api/admin/settings
//  Customer: baca dari SiteSetting via GET /api/settings
// ================================================================

export const getBrandingAsync = () => apiGet("branding", BRANDING_DEFAULT);
export const saveBrandingAsync = (v: BrandingConfig) =>
  apiSave("branding", v).then(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("jogjadoelan_branding_changed"));
  });

export const getLandingAsync = () => apiGet("landing", LANDING_DEFAULT);
export const saveLandingAsync = (v: LandingConfig) =>
  apiSave("landing", v).then(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("jogjadoelan_landing_changed"));
      new BroadcastChannel("jogjadoelan_settings").postMessage({ type: "landing_changed" });
    }
  });

export const getKontakAsync = () => apiGet("kontak", KONTAK_DEFAULT);
export const saveKontakAsync = (v: KontakExtended) =>
  apiSave("kontak", v).then(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("jogjadoelan_kontak_changed"));
  });

export const getOperasionalAsync = () => apiGet("operasional", OPERASIONAL_DEFAULT);
export const saveOperasionalAsync = (v: OperasionalConfig) =>
  apiSave("operasional", v).then(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("jogjadoelan_operasional_changed"));
  });

export const getFooterAsync = () => apiGet("footer", FOOTER_DEFAULT);
export const saveFooterAsync = (v: FooterConfig) =>
  apiSave("footer", v).then(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("jogjadoelan_footer_changed"));
  });

export const getIdentitasAsync = () => apiGet("identitas", IDENTITAS_DEFAULT);
export const saveIdentitasAsync = (v: IdentitasConfig) =>
  apiSave("identitas", v).then(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("jogjadoelan_identitas_changed"));
  });

export async function getFaqListAsync(): Promise<FaqItem[]> {
  try {
    const res = await fetch("/api/settings?keys=faq");
    const j = await res.json();
    const val = j?.data?.faq;
    return Array.isArray(val) ? val : [];
  } catch { return []; }
}
export const saveFaqListAsync = (list: FaqItem[]) =>
  apiSave("faq", list).then(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("jogjadoelan_faq_changed"));
  });

export async function getCabangListAsync(): Promise<Cabang[]> {
  try {
    const res = await fetch("/api/settings?keys=cabang");
    const j = await res.json();
    const val = j?.data?.cabang;
    return Array.isArray(val) ? val : [];
  } catch { return []; }
}
export const saveCabangListAsync = (list: Cabang[]) =>
  apiSave("cabang", list).then(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("jogjadoelan_cabang_changed"));
  });

export async function getBannerPromoListAsync(): Promise<BannerPromoItem[]> {
  try {
    const res = await fetch("/api/settings?keys=bannerPromo");
    const j = await res.json();
    const val = j?.data?.bannerPromo;
    return Array.isArray(val) ? val : [];
  } catch { return []; }
}
export const saveBannerPromoListAsync = (list: BannerPromoItem[]) =>
  apiSave("bannerPromo", list).then(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("jogjadoelan_banner_promo_changed"));
  });