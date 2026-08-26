export const TOKO_INFO = {
  nama: "Jogjadoelan",
  tagline: "Toko Helm Jadul Yogyakarta",
  deskripsi: "Pelopor helm jadul autentik dari kota gudeg.",
  alamat: "Jalan Imogiri Siluk Jetis, Miri, Sriharjo, Kec. Imogiri, Kab. Bantul, DIY 55782",
  telepon: "+62 812-3456-7890",
  email: "jogjadoelan@gmail.com",
  jamOperasional: "Senin - Sabtu: 08:00 - 17:00 WIB",
  sosmed: {
    instagram: "https://instagram.com/jogjadoelan",
    tiktok: "https://tiktok.com/@jogjadoelan",
    facebook: "https://facebook.com/jogjadoelan",
  },
};

export const JENIS_HELM = [
  { value: "semua", label: "Semua" },
  { value: "half-face", label: "Half Face" },
  { value: "full-face", label: "Full Face" },
  { value: "chips", label: "Chips" },
];

/* ============================================================
   HERO SLIDES — sekarang punya bgImage (admin editable nanti)
   ============================================================ */
export interface HeroSlide {
  id: number;
  judul: string;
  subjudul: string;
  cta: string;
  href: string;
  /* URL gambar produk (foreground). Kosong = pakai placeholder svg */
  image?: string;
  /* URL gambar BACKGROUND (akan di-blur). Kosong = pakai foreground sbg bg blur */
  bgImage?: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    judul: "Hai, Selamat Datang di Jogjadoelan",
    subjudul:
      "Toko helm jadul terlengkap di Yogyakarta. Bogo, Retro, Cakil semua ada.",
    cta: "Belanja Sekarang",
    href: "/belanja",
    image: "/images/hero/hero-6.png",
    bgImage: "/images/hero/hero-7.png",
  },
  {
    id: 2,
    judul: "Custom Helm Sesuai Selera Anda",
    subjudul:
      "Buat helm impian Anda. Pilih warna, motif, dan aksesoris sesuai keinginan.",
    cta: "Mulai Custom",
    href: "/custom",
    image: "/images/kategori/custom1.png",
    bgImage: "/images/hero/hero-7.png",
  },
  {
    id: 3,
    judul: "Free Ongkir Wilayah Yogyakarta",
    subjudul:
      "Belanja minimal Rp 500.000 gratis ongkir untuk seluruh wilayah Yogyakarta.",
    cta: "Lihat Promo",
    href: "/promo",
    image: "/images/hero/hero-5.png",
    bgImage: "/images/hero/hero-7.png",
  },
];

export const KATEGORI_UTAMA = [
  {
    id: "ready-stock",
    nama: "Ready Stock",
    deskripsi: "Helm siap kirim, langsung pakai.",
    href: "/belanja",
    icon: "package",
  },
  {
    id: "custom",
    nama: "Custom Helm",
    deskripsi: "Desain helm sesuai selera Anda.",
    href: "/custom",
    icon: "brush",
  },
];

/* ============================================================
   PRODUK — sekarang gambar JADI ARRAY (1-5 per produk)
   ============================================================ */
const DETAIL_DEFAULTS = {
  deskripsiSingkat:
    "Helm berkualitas premium dengan material pilihan dan desain modern, nyaman dipakai harian.",
  deskripsi: [
    "Material outer shell ABS premium tahan benturan",
    "Inner foam EPS density tinggi untuk perlindungan maksimal",
    "Lining nyaman, anti-bakteri, dapat dilepas dan dicuci",
    "Visor anti-gores dengan lapisan UV protection",
    "Tali pengikat sistem D-ring stainless steel",
  ],
  ukuran: ["S", "M", "L", "XL"],
  kondisi: "Baru",
  spesifikasi: "Berat ±1,2 kg | Standar SNI | Garansi 6 bulan",
  gambar: "" as string | "",
  gambars: [] as string[],
  /* === BARU: PROMO PRODUK (admin editable) === */
  /** Harga asli sebelum diskon (untuk efek coret). 0 = tidak ada diskon */
  hargaCoret: 0,
  /** Persen diskon yang ditampilkan sebagai badge (0-99). 0 = tidak ada badge */
  diskonPersen: 0,
  /** Label promo opsional (mis. "FLASH SALE", "PROMO SPESIAL") */
  promoLabel: "" as string,
};

/* DEMO image set — pakai aset hero yang ada di /public/images/hero
   Ganti per-produk kalau sudah punya foto asli. */
const DEMO_IMG = [
  "/images/hero/hero-1.png",
  "/images/hero/hero-4.png",
  "/images/hero/hero-5.png",
  "/images/hero/hero-6.png",
];
/* helper: bikin array gambar 5 slot dengan rotasi offset agar tiap produk beda urutan */
const pickImgs = (offset: number, count = 5): string[] =>
  Array.from({ length: count }, (_, i) => DEMO_IMG[(offset + i) % DEMO_IMG.length]);

const PRODUK_BASE = [
  { id: "p1",  nama: "Helm Bogo Vintage Cream",     jenis: "half-face", jenisLabel: "Half Face", harga: 459000, hargaCoret: 575000, diskonPersen: 20, promoLabel: "PROMO SPESIAL", stok: 12, rating: 5, terjual: 60, },
  { id: "p2",  nama: "Helm Retro Cafe Racer",       jenis: "half-face", jenisLabel: "Half Face", harga: 525000, hargaCoret: 650000, diskonPersen: 19, stok: 8,  rating: 5, terjual: 42,  gambars: pickImgs(1) },
  { id: "p3",  nama: "Helm Bogo Doff Black",        jenis: "half-face", jenisLabel: "Half Face", harga: 395000, stok: 15, rating: 4, terjual: 87,  gambars: pickImgs(2) },
  { id: "p4",  nama: "Helm Bogo Klasik Brown",      jenis: "half-face", jenisLabel: "Half Face", harga: 475000, hargaCoret: 550000, diskonPersen: 14, stok: 6,  rating: 5, terjual: 35,  gambars: pickImgs(3) },
  { id: "p5",  nama: "Helm Full Face Retro Vespa",  jenis: "full-face", jenisLabel: "Full Face", harga: 685000, hargaCoret: 850000, diskonPersen: 19, promoLabel: "FLASH SALE", stok: 10, rating: 5, terjual: 28,  gambars: pickImgs(0) },
  { id: "p6",  nama: "Helm Full Face Glossy Red",   jenis: "full-face", jenisLabel: "Full Face", harga: 750000, stok: 5,  rating: 4, terjual: 19,  gambars: pickImgs(1) },
  { id: "p7",  nama: "Helm Full Face Matte Olive",  jenis: "full-face", jenisLabel: "Full Face", harga: 695000, stok: 9,  rating: 5, terjual: 51,  gambars: pickImgs(2) },
  { id: "p8",  nama: "Helm Full Face Krem Vintage", jenis: "full-face", jenisLabel: "Full Face", harga: 720000, hargaCoret: 880000, diskonPersen: 18, stok: 4,  rating: 5, terjual: 22,  gambars: pickImgs(3) },
  { id: "p9",  nama: "Helm Chips Cap Cream",        jenis: "chips",     jenisLabel: "Chips",     harga: 285000, hargaCoret: 350000, diskonPersen: 18, stok: 20, rating: 4, terjual: 95,  gambars: pickImgs(0) },
  { id: "p10", nama: "Helm Chips Polos Black",      jenis: "chips",     jenisLabel: "Chips",     harga: 250000, stok: 25, rating: 5, terjual: 110, gambars: pickImgs(1) },
  { id: "p11", nama: "Helm Chips Stripe Vintage",   jenis: "chips",     jenisLabel: "Chips",     harga: 320000, hargaCoret: 400000, diskonPersen: 20, promoLabel: "FLASH SALE", stok: 14, rating: 5, terjual: 73,  gambars: pickImgs(2) },
  { id: "p12", nama: "Helm Chips Doff Brown",       jenis: "chips",     jenisLabel: "Chips",     harga: 295000, stok: 18, rating: 4, terjual: 64,  gambars: pickImgs(3) },
];

/** @internal Hanya untuk prisma/seed-produk.ts — jangan import di UI/pages */
export const PRODUK_DUMMY = PRODUK_BASE.map((p) => ({
  ...DETAIL_DEFAULTS,
  ...p,
  __seed: true as const,
}));

export type Produk = (typeof PRODUK_DUMMY)[number];

/* ============================================================
   PARTNER LOGOS — upgrade: logoUrl, deskripsi, MAX 10
   ============================================================ */
export interface PartnerInfo {
  id: number;
  nama: string;
  /** URL gambar logo (admin upload). Kosong = fallback inisial */
  logoUrl?: string;
  /** Inisial fallback kalau logo belum diupload */
  inisial: string;
  /** Warna fallback kalau pakai inisial */
  warna: string;
  /** Deskripsi panjang (admin editable). 1-3 paragraf */
  deskripsi: string;
}

const RAW_PARTNERS: PartnerInfo[] = [
  {
    id: 1,
    nama: "KYT Helmet",
    logoUrl: "/images/partners/kyt.png",
    inisial: "KYT",
    warna: "#DC2626",
    deskripsi:
      "KYT adalah brand helm asli Indonesia yang sudah mendunia. Kami bekerja sama menyediakan produk KYT original lengkap dengan garansi resmi distributor. Cocok untuk pengendara harian hingga rider profesional.",
  },
  {
    id: 2,
    nama: "GM Helmet",
    logoUrl: "/images/partners/gm.png",
    inisial: "GM",
    warna: "#1E40AF",
    deskripsi:
      "GM (General Motor) terkenal dengan desain stylish dan harga terjangkau. Jogjadoelan menjadi mitra resmi untuk wilayah DIY dengan stok lengkap semua varian.",
  },
  {
    id: 3,
    nama: "NHK Helmet",
    logoUrl: "/images/partners/nhk.png",
    inisial: "NHK",
    warna: "#059669",
    deskripsi:
      "NHK menghadirkan helm full face berstandar racing dengan teknologi tinggi. Tersedia varian R-series, GP, dan touring di toko kami.",
  },
];

/** Maksimal 10 partner — bila admin tambah lebih, di-cut */
export const PARTNER_LOGOS: PartnerInfo[] = RAW_PARTNERS.slice(0, 10);
export const PARTNER_MAX = 10;

export const KEUNGGULAN = [
  { id: 1, judul: "Garansi Kualitas", deskripsi: "Semua produk bergaransi resmi 30 hari tukar barang baru.", icon: "award" },
  { id: 2, judul: "Produk Original",  deskripsi: "100% asli, bukan KW. Kami bekerjasama langsung dengan brand resmi.", icon: "shield-check" },
  { id: 3, judul: "Free Ongkir",      deskripsi: "Gratis ongkos kirim wilayah Yogyakarta minimal order Rp 500.000.", icon: "truck" },
  { id: 4, judul: "Custom Design",    deskripsi: "Bisa pesan helm dengan desain custom sesuai selera Anda.", icon: "brush" },
];

export const FOOTER_LINKS = {
  layananPelanggan: [
    { label: "Chat Admin", href: "/chat" },
    { label: "Return & Komplain", href: "/return" },
  ],
    tentangKami: [
    { label: "Deskripsi Toko", href: "/tentang" },
    { label: "Kebijakan Pengembalian", href: "/kebijakan/pengembalian" },
    { label: "Hubungi Kami", href: "/kontak" },
  ],
    metodePembayaran: [
    { label: "Transfer Bank Mandiri", href: "/pembayaran/transfer-bank" },
    { label: "QRIS", href: "/pembayaran/qris" },
  ],
  socialMedia: [
    { label: "Instagram", href: "https://instagram.com/jogjadoelan", icon: "instagram" },
    { label: "Facebook",  href: "https://facebook.com/jogjadoelan", icon: "facebook" },
    { label: "jogjadoelantechforlocal.id@gmail.com", href: "mailto:jogjadoelantechforlocal.id@gmail.com", icon: "mail" },
  ],
  metodePengiriman: [
    { label: "JNE", href: "/pengiriman#jne" },
    { label: "J&T", href: "/pengiriman#jnt" },
    { label: "SiCepat", href: "/pengiriman#sicepat" },
    { label: "Anteraja", href: "/pengiriman#anteraja" },
    { label: "Gosend", href: "/pengiriman#gosend" },
    { label: "Grab Express", href: "/pengiriman#grab" },
  ],
};

/* ============================================================
   CUSTOM ORDER OPTIONS
   ============================================================ */
export const CUSTOM_JENIS = ["Sim Head", "Half Face", "Full Face", "Bisa Half", "Chips"];
export const CUSTOM_FINISHING = ["Doff", "Clear Glossy"];
export const CUSTOM_STRAP = [
  "DD Ring Standard",
  "DD Ring Standard Multi Boot",
  "DD Ring Decker Knop (Kulit Sapi)",
  "Tali Busa Biru",
  "Tali Busa Hitam",
  "Tali Busa Brown",
];
export const CUSTOM_UKURAN = ["XS", "S", "M", "L", "XL", "XXL"];
export const CUSTOM_MOTIF_BUSA = [
  "Polos Hitam",
  "Motif Leopard",
  "Motif Checkerboard",
  "Motif Bandana",
  "Motif Lurik/Wajik",
];
export const CUSTOM_BAHAN = ["ABS (Baru)", "Vintage Second", "Fiber Glass"];
export const CUSTOM_AKSESORIS = [
  "Pet Visor (Smoke)",
  "Pet Visor (Clear)",
  "Pet Transparan (Hitam)",
  "Pet Transparan (Putih)",
  "Random",
];

/** PALETTE PRESETS — 5 swatch siap pilih (admin editable nanti) */
export interface PaletteSwatch {
  id: string;
  nama: string;
  hex: string;
}
export const CUSTOM_PALETTE_PRESETS: PaletteSwatch[] = [
  { id: "hitam-klasik",  nama: "Hitam Klasik",  hex: "#0F0F0F" },
  { id: "putih-cream",   nama: "Putih Cream",   hex: "#FAF4E5" },
  { id: "orange-vintage",nama: "Orange Vintage",hex: "#FF6B1A" },
  { id: "cokelat-tanah", nama: "Cokelat Tanah", hex: "#7C2D12" },
  { id: "hijau-army",    nama: "Hijau Army",    hex: "#3F4A2A" },
];
export const CUSTOM_WARNA_MAX = 5;

export const CUSTOM_HARGA_DUMMY = {
  jenis: {
    "Sim Head": 400000, "Half Face": 450000, "Full Face": 600000,
    "Bisa Half": 380000, Chips: 280000,
  } as Record<string, number>,
  aksesoris: {
    "Pet Visor (Smoke)": 60000, "Pet Visor (Clear)": 50000,
    "Pet Transparan (Hitam)": 65000, "Pet Transparan (Putih)": 65000, Random: 0,
  } as Record<string, number>,
  strap: {
    "DD Ring Standard": 50000, "DD Ring Standard Multi Boot": 75000,
    "DD Ring Decker Knop (Kulit Sapi)": 120000,
    "Tali Busa Biru": 30000, "Tali Busa Hitam": 30000, "Tali Busa Brown": 35000,
  } as Record<string, number>,
  motif: {
    "Polos Hitam": 20000, "Motif Leopard": 50000, "Motif Checkerboard": 50000,
    "Motif Bandana": 45000, "Motif Lurik/Wajik": 55000,
  } as Record<string, number>,
  bahan: { "ABS (Baru)": 0, "Vintage Second": 150000, "Fiber Glass": 300000 } as Record<string, number>,
  /** Per warna kombinasi tambahan (di luar 1 warna pertama) */
  warnaKombinasi: 25000,
  referensiPerFile: 25000,
};

/* ====================================================================
 *  TAMBAHAN BATCH C2 — Konstanta untuk komplain, ekspedisi, rekening,
 *  FAQ, promo, voucher, ulasan dummy.
 * ==================================================================== */

export type AdminInfo = {
  email: string;
  waNumber: string;
  noHp: string;
  ongkirDefault: number;
  customDp: number;
  ordExpiryHours: number;
};

export const ADMIN_INFO: AdminInfo = {
  email: "jogjadoelantechforlocal.id@gmail.com",
  waNumber: "6281234567890",
  noHp: "081234567890",
  ongkirDefault: 15000,
  customDp: 100000,
  ordExpiryHours: 24,
};

/* ----- 12 JENIS KOMPLAIN ----- */
export interface JenisKomplainItem {
  id: string;
  label: string;
  deskripsi: string;
  needsFoto: boolean;
}

export const JENIS_KOMPLAIN: JenisKomplainItem[] = [
  { id: "barang_rusak", label: "Barang Rusak", deskripsi: "Helm sampai dalam kondisi rusak/cacat fisik", needsFoto: true },
  { id: "tidak_sesuai", label: "Tidak Sesuai Pesanan", deskripsi: "Warna/ukuran/jenis berbeda dari pesanan", needsFoto: true },
  { id: "tidak_lengkap", label: "Barang Tidak Lengkap", deskripsi: "Aksesoris/strap/visor tidak ada di paket", needsFoto: true },
  { id: "salah_kirim", label: "Salah Kirim Produk", deskripsi: "Produk yang diterima berbeda total", needsFoto: true },
  { id: "telat_kirim", label: "Pengiriman Terlambat", deskripsi: "Lewat dari estimasi tapi belum sampai", needsFoto: false },
  { id: "tidak_sampai", label: "Barang Tidak Sampai", deskripsi: "Status terkirim tapi tidak diterima", needsFoto: false },
  { id: "kemasan_rusak", label: "Kemasan Rusak", deskripsi: "Kardus/segel rusak saat sampai", needsFoto: true },
  { id: "ukuran_salah", label: "Ukuran Tidak Pas", deskripsi: "Ukuran tidak sesuai keterangan size chart", needsFoto: true },
  { id: "warna_beda", label: "Warna Berbeda", deskripsi: "Warna asli berbeda jauh dari foto produk", needsFoto: true },
  { id: "custom_tidak_sesuai", label: "Custom Tidak Sesuai", deskripsi: "Hasil custom tidak sesuai approval", needsFoto: true },
  { id: "double_tagih", label: "Double Tagih/Bayar", deskripsi: "Terbayar 2x untuk 1 pesanan", needsFoto: true },
  { id: "lainnya", label: "Lainnya", deskripsi: "Keluhan lain yang belum tercantum", needsFoto: false },
];

/* ----- EKSPEDISI / KURIR (Yogyakarta) ----- */
export interface EkspedisiItem {
  id: string;
  nama: string;
  layanan: string;
  ongkir: number;
  estimasi: string;
  logo?: string;
}

export const EKSPEDISI_LIST: EkspedisiItem[] = [
  { id: "jne_reg", nama: "JNE", layanan: "Reguler", ongkir: 15000, estimasi: "1-2 hari" },
  { id: "jne_yes", nama: "JNE", layanan: "YES", ongkir: 25000, estimasi: "1 hari" },
  { id: "jnt_reg", nama: "J&T", layanan: "Reguler", ongkir: 14000, estimasi: "1-2 hari" },
  { id: "sicepat_reg", nama: "SiCepat", layanan: "Reguler", ongkir: 13000, estimasi: "1-2 hari" },
  { id: "anteraja_reg", nama: "AnterAja", layanan: "Reguler", ongkir: 13000, estimasi: "1-2 hari" },
  { id: "gosend_sameday", nama: "GoSend", layanan: "Sameday", ongkir: 22000, estimasi: "Hari ini (≤6 jam)" },
  { id: "grab_sameday", nama: "GrabExpress", layanan: "Sameday", ongkir: 22000, estimasi: "Hari ini (≤6 jam)" },
];

/* ----- REKENING BANK (transfer manual) ----- */
export interface RekeningBank {
  id: "bca" | "bni" | "bri" | "mandiri";
  nama: string;
  norek: string;
  atasNama: string;
  warna: string;
  logoBg: string;
}

export const REKENING_BANK: RekeningBank[] = [
  { id: "bca", nama: "BCA", norek: "8730568990", atasNama: "JOGJADOELAN", warna: "#0066AE", logoBg: "bg-blue-600" },
  { id: "bni", nama: "BNI", norek: "0987654321", atasNama: "JOGJADOELAN", warna: "#EE6E29", logoBg: "bg-orange-500" },
  { id: "bri", nama: "BRI", norek: "1122334455", atasNama: "JOGJADOELAN", warna: "#003D79", logoBg: "bg-blue-900" },
  { id: "mandiri", nama: "Mandiri", norek: "5566778899", atasNama: "JOGJADOELAN", warna: "#003B5C", logoBg: "bg-blue-800" },
];

/* ----- FAQ ITEMS ----- */
export interface FaqItem { id: string; kategori: string; pertanyaan: string; jawaban: string; }

export const FAQ_ITEMS: FaqItem[] = [
  { id: "f1", kategori: "Pesanan", pertanyaan: "Bagaimana cara memesan helm di Jogjadoelan?",
    jawaban: "Pilih helm di menu Belanja, klik tombol Beli, isi alamat pengiriman, pilih ekspedisi, lalu lakukan pembayaran via transfer atau QRIS." },
  { id: "f2", kategori: "Pesanan", pertanyaan: "Berapa lama proses pengemasan?",
    jawaban: "Pesanan diproses 1×24 jam setelah pembayaran terkonfirmasi pada hari kerja (Senin-Sabtu)." },
  { id: "f3", kategori: "Pembayaran", pertanyaan: "Metode pembayaran apa saja yang tersedia?",
    jawaban: "Saat ini kami menerima transfer Bank Mandiri dan QRIS (semua e-wallet/m-banking pendukung QRIS). Bukti bayar wajib diunggah agar pesanan diproses." },
  { id: "f4", kategori: "Pembayaran", pertanyaan: "Berapa lama batas waktu pembayaran?",
    jawaban: "Pembayaran wajib dilakukan dalam 24 jam setelah checkout. Lewat batas, pesanan otomatis kadaluarsa." },
  { id: "f5", kategori: "Pengiriman", pertanyaan: "Ekspedisi apa saja yang tersedia?",
    jawaban: "JNE, J&T, SiCepat, AnterAja, GoSend, dan GrabExpress untuk wilayah Yogyakarta." },
  { id: "f6", kategori: "Pengiriman", pertanyaan: "Apakah ada gratis ongkir?",
    jawaban: "Ya, gratis ongkir berlaku untuk pembelian min Rp 500.000 wilayah Yogyakarta." },
  { id: "f7", kategori: "Custom", pertanyaan: "Berapa lama proses custom helm?",
    jawaban: "Estimasi 14-21 hari kerja tergantung kompleksitas desain dan antrian pengerjaan." },
  { id: "f8", kategori: "Custom", pertanyaan: "Bagaimana sistem pembayaran custom?",
    jawaban: "DP Rp 100.000 setelah estimasi disetujui. Pelunasan dibayar setelah helm selesai diproduksi sebelum pengiriman." },
  { id: "f9", kategori: "Garansi", pertanyaan: "Apakah helm bergaransi?",
    jawaban: "Ya, garansi 7 hari untuk cacat produksi. Bukan termasuk kerusakan akibat pemakaian." },
  { id: "f10", kategori: "Komplain", pertanyaan: "Bagaimana cara komplain bila produk bermasalah?",
    jawaban: "Buka menu Pesanan → pilih pesanan bermasalah → tombol Komplain. Pilih jenis komplain dan unggah foto bukti." },
  { id: "f11", kategori: "Akun", pertanyaan: "Apakah saya wajib daftar akun?",
    jawaban: "Ya, untuk melacak pesanan dan menyimpan alamat pengiriman. Daftar gratis dengan email atau Google." },
  { id: "f12", kategori: "Akun", pertanyaan: "Lupa password, bagaimana?",
    jawaban: "Klik 'Lupa Password' di halaman login, masukkan email yang terdaftar, ikuti instruksi reset." },
];

/* ----- PROMO DUMMY ----- */
export type PromoTipe = "ongkir" | "diskon" | "cashback" | "voucher";

export interface PromoItem {
  id: string;
  judul: string;
  subjudul: string;
  kode: string;
  tipe: PromoTipe;
  diskonPersen?: number;
  diskonNominal?: number;
  minBelanja?: number;
  maxDiskon?: number;
  berlaku?: "all" | "ready" | "custom";
  berakhir: string;          // ISO date — wajib, dipakai UI
  warna: string;             // tailwind gradient class, ex: "from-amber-500 to-orange-600"
  banner?: string;           // optional URL gambar background
  syarat: string[];
  syaratProvinsi?: string[];
}

/* Helper: buat tanggal berakhir N hari ke depan */
const _exp = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();



export const PROMO_DUMMY: PromoItem[] = [
  {
    id: "p1",
    judul: "Gratis Ongkir Yogyakarta",
    subjudul: "Bebas ongkir untuk wilayah DIY",
    kode: "JOGJAFREE",
    tipe: "ongkir",
    minBelanja: 500000,
    berlaku: "ready",
    berakhir: _exp(30),
    warna: "from-emerald-500 to-teal-600",
    syarat: [
      "Min belanja Rp 500.000",
      "Khusus wilayah Yogyakarta",
      "Otomatis di checkout",
    ],
    syaratProvinsi: ["YOGYAKARTA", "DIY", "DI YOGYAKARTA", "DAERAH ISTIMEWA YOGYAKARTA"], 
  },
  {
    id: "p2",
    judul: "Diskon 15% Custom",
    subjudul: "Untuk pemesanan custom helm",
    kode: "CUSTOM15",
    tipe: "diskon",
    diskonPersen: 15,
    maxDiskon: 100000,
    berlaku: "custom",
    berakhir: _exp(30),
    warna: "from-amber-500 to-orange-600",
    syarat: [
      "Khusus custom helm",
      "Maks diskon Rp 100.000",
      "Berlaku hingga akhir bulan",
    ],
  },
  {
    id: "p3",
    judul: "Cashback Helm Full Face",
    subjudul: "Cashback Rp 50rb ke saldo",
    kode: "FULLFACE50",
    tipe: "cashback",
    diskonNominal: 50000,
    minBelanja: 600000,
    berlaku: "ready",
    berakhir: _exp(20),
    warna: "from-rose-500 to-red-600",
    syarat: [
      "Khusus helm Full Face",
      "Min belanja Rp 600.000",
      "Cashback ke saldo",
    ],
  },
  {
    id: "p4",
    judul: "Welcome Diskon Rp 25rb",
    subjudul: "Khusus member baru",
    kode: "WELCOME25",
    tipe: "diskon",
    diskonNominal: 25000,
    minBelanja: 200000,
    berlaku: "all",
    berakhir: _exp(60),
    warna: "from-sky-500 to-blue-600",
    syarat: [
      "Khusus akun baru",
      "1x pemakaian",
      "Min belanja Rp 200.000",
    ],
  },
  {
    id: "p5",
    judul: "Bundle Helm + Aksesoris",
    subjudul: "Diskon 10% beli paket",
    kode: "BUNDLE10",
    tipe: "diskon",
    diskonPersen: 10,
    maxDiskon: 50000,
    berlaku: "ready",
    berakhir: _exp(45),
    warna: "from-violet-500 to-purple-600",
    syarat: [
      "Beli helm + sarung tangan",
      "Maks diskon Rp 50.000",
    ],
  },
];

/* ----- VOUCHER (yang dimiliki user) ----- */
export interface VoucherItem {
  id: string;
  judul: string;
  kode: string;
  nominal: number;
  diskonPersen?: number;
  maxDiskon?: number;
  minBelanja: number;
  expired: string;
  digunakan: boolean;
  berlaku?: "all" | "ready" | "custom";
  promoId?: string;
  syaratProvinsi?: string[];
}

/* Default seeding kosong — user akan claim dari /promo */
export const VOUCHER_SEED: VoucherItem[] = [];

/* ----- STATUS TIMELINE 5-STEP (untuk reusable progress) ----- */
export interface TimelineStep { key: string; label: string; deskripsi: string; }
export const PESANAN_TIMELINE_STEPS: TimelineStep[] = [
  { key: "menunggu_pembayaran", label: "Menunggu Pembayaran", deskripsi: "Silakan transfer & upload bukti" },
  { key: "menunggu_konfirmasi", label: "Menunggu Konfirmasi", deskripsi: "Admin sedang verifikasi pembayaran" },
  { key: "diproses", label: "Diproses", deskripsi: "Pesanan sedang dikemas" },
  { key: "dikirim", label: "Dikirim", deskripsi: "Pesanan dalam perjalanan" },
  { key: "selesai", label: "Selesai", deskripsi: "Pesanan diterima" },
];
/* ====================================================================
 *  APP_CONFIG — sumber kebenaran tunggal untuk semua magic number
 *  (waktu, ongkir, toleransi). BATCH QW (I3).
 *
 *  Pindahkan SEMUA hardcode dari file lain ke sini supaya 1 perubahan
 *  affect seluruh app. Saat migrate ke MySQL, ini akan jadi config table.
 * ==================================================================== */

const _HOUR_MS = 60 * 60 * 1000;

export const APP_CONFIG = {
  /* === Order reguler === */
  ONGKIR_EKSPEDISI: 15000,
  ORDER_EXPIRY_HOURS: 24,
  ORDER_EXPIRY_MS: 24 * _HOUR_MS,

  /* === Auto-selesai (24 jam setelah barang sampai) === */
  AUTO_SELESAI_WINDOW_HOURS: 24,
  AUTO_SELESAI_WINDOW_MS: 24 * _HOUR_MS,

  /* === Ulasan edit window === */
  ULASAN_EDIT_WINDOW_HOURS: 24,
  ULASAN_EDIT_WINDOW_MS: 24 * _HOUR_MS,

  /* === Toleransi keterlambatan (order-status-extra) === */
  TOLERANSI_DIPROSES_HARI: 5,
  TOLERANSI_CUSTOM_HARI: 3,

  /* === Custom helm DP === */
  CUSTOM_DP_MINIMAL: 100000,
  CUSTOM_DP_PERSEN: 0.3,

  /* === Toko === */
  ALAMAT_TOKO: "Jalan Imogiri Siluk Jetis, Miri, Sriharjo, Kec. Imogiri, Kab. Bantul, DIY 55782",
} as const;

/* Alias top-level untuk import yang ringkas */
export const ONGKIR_EKSPEDISI = APP_CONFIG.ONGKIR_EKSPEDISI;
export const ALAMAT_TOKO = APP_CONFIG.ALAMAT_TOKO;
