import Link from "next/link";
import {
  ArrowLeft,
  ScrollText,
  CalendarClock,
  Printer,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  CreditCard,
  Truck,
  PackageX,
  AlertTriangle,
  Gavel,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "Syarat & Ketentuan — Jogjadoelan",
  description:
    "Syarat dan ketentuan penggunaan layanan Jogjadoelan, toko helm jadul Yogyakarta.",
};

const TERAKHIR_DIPERBARUI = "1 Mei 2026";

const SECTIONS = [
  {
    id: "definisi",
    icon: ScrollText,
    title: "Definisi & Penerimaan",
    paragraphs: [
      '"Jogjadoelan" merujuk pada toko helm jadul yang berkedudukan di Yogyakarta beserta seluruh layanan digital yang dioperasikannya, termasuk aplikasi, situs web, dan kanal media sosial resmi.',
      '"Pengguna" adalah setiap pihak yang mengakses, menjelajah, mendaftar, atau melakukan transaksi melalui platform Jogjadoelan.',
      "Dengan mengakses dan/atau menggunakan layanan kami, Pengguna dianggap telah membaca, memahami, dan menyetujui seluruh Syarat & Ketentuan ini secara menyeluruh.",
    ],
  },
  {
    id: "akun",
    icon: UserCheck,
    title: "Akun Pengguna",
    paragraphs: [
      "Pengguna wajib menyediakan data diri yang akurat, mutakhir, dan dapat dipertanggungjawabkan saat mendaftar akun.",
      "Kerahasiaan kata sandi dan keamanan akun adalah tanggung jawab penuh Pengguna. Jogjadoelan tidak bertanggung jawab atas kerugian akibat kelalaian Pengguna dalam menjaga akunnya.",
      "Jogjadoelan berhak menonaktifkan atau menangguhkan akun yang terindikasi melakukan penipuan, pelanggaran hukum, atau penyalahgunaan layanan.",
    ],
  },
  {
    id: "pemesanan",
    icon: ShoppingBag,
    title: "Pemesanan Produk",
    paragraphs: [
      "Pesanan dianggap sah setelah Pengguna menyelesaikan proses checkout dan menerima konfirmasi nomor pesanan.",
      "Stok produk bersifat dinamis. Apabila stok habis setelah pemesanan, Jogjadoelan akan menghubungi Pengguna untuk penggantian atau pengembalian dana.",
      "Untuk produk custom, spesifikasi yang telah disetujui pada estimasi tidak dapat diubah setelah proses produksi dimulai.",
    ],
  },
  {
    id: "pembayaran",
    icon: CreditCard,
    title: "Pembayaran",
    paragraphs: [
      "Metode pembayaran resmi adalah transfer bank dan QRIS sesuai yang tertera di halaman checkout dan halaman pesanan. Pembayaran ke rekening atau metode selain yang tertera adalah di luar tanggung jawab Jogjadoelan.",
      "Batas waktu pembayaran adalah 24 (dua puluh empat) jam sejak checkout. Pesanan yang melewati batas akan dibatalkan otomatis.",
      "Pengguna wajib mengunggah bukti pembayaran agar pesanan dapat diverifikasi. Verifikasi dilakukan maksimal 1×24 jam pada hari kerja.",
    ],
  },
  {
    id: "pengiriman",
    icon: Truck,
    title: "Pengiriman",
    paragraphs: [
      "Pengiriman dilakukan melalui mitra ekspedisi resmi yang dipilih Pengguna saat checkout.",
      "Estimasi waktu tiba bersifat perkiraan dari pihak ekspedisi dan dapat berubah karena faktor di luar kendali Jogjadoelan, seperti cuaca atau lonjakan volume pengiriman.",
      "Risiko kehilangan dan kerusakan barang selama pengiriman beralih kepada Pengguna sejak barang diserahkan kepada pihak ekspedisi, kecuali ditentukan lain oleh kebijakan asuransi pengiriman.",
    ],
  },
  {
    id: "pengembalian",
    icon: PackageX,
    title: "Pengembalian & Penukaran",
    paragraphs: [
      "Pengajuan pengembalian (refund) atau penukaran (tukar) dapat dilakukan paling lambat 3×24 jam sejak barang diterima Pengguna.",
      "Pengguna wajib menyertakan video unboxing yang utuh dan jelas sebagai dasar verifikasi klaim.",
      "Detail syarat dan tata cara mengikuti dokumen Kebijakan Pengembalian yang dapat diakses melalui menu Pusat Bantuan.",
    ],
  },
  {
    id: "larangan",
    icon: AlertTriangle,
    title: "Larangan Penggunaan",
    paragraphs: [
      "Pengguna dilarang menyalahgunakan layanan untuk kegiatan ilegal, penipuan, ujaran kebencian, atau pelanggaran hak kekayaan intelektual.",
      "Pengguna dilarang melakukan rekayasa balik, menyalin, atau mendistribusikan ulang konten dan kode platform tanpa izin tertulis.",
      "Pelanggaran terhadap larangan ini dapat menyebabkan pemblokiran akun dan/atau tindakan hukum sesuai peraturan yang berlaku.",
    ],
  },
  {
    id: "perubahan",
    icon: Gavel,
    title: "Perubahan & Hukum yang Berlaku",
    paragraphs: [
      "Jogjadoelan berhak mengubah Syarat & Ketentuan ini sewaktu-waktu. Perubahan akan diumumkan melalui platform dan berlaku sejak tanggal publikasi.",
      "Syarat & Ketentuan ini tunduk pada hukum Negara Republik Indonesia. Setiap sengketa akan diselesaikan secara musyawarah, dan apabila tidak tercapai, melalui Pengadilan Negeri Yogyakarta.",
    ],
  },
];

export default function SyaratPage() {
  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="rounded-md p-1.5 text-brand-black hover:bg-brand-cream"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <ScrollText className="h-5 w-5 text-brand-orange" />
          <h1 className="text-lg font-black text-brand-black">
            Syarat &amp; Ketentuan
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* TOC sticky desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
              <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-brand-black/50">
                Daftar Isi
              </p>
              <nav className="space-y-1">
                {SECTIONS.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-brand-black/80 transition hover:bg-brand-orange/10 hover:text-brand-orange"
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-[10px] font-black text-brand-orange">
                      {i + 1}
                    </span>
                    <span className="line-clamp-1">{s.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="space-y-6">
            {/* Hero */}
            <section className="overflow-hidden rounded-2xl border-2 border-brand-orange/20 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-orange shadow-md">
                  <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-brand-black sm:text-2xl">
                    Syarat &amp; Ketentuan Layanan
                  </h2>
                  <p className="mt-1 text-sm text-brand-black/70">
                    Mohon dibaca dengan seksama sebelum menggunakan layanan
                    Jogjadoelan. Dengan mengakses platform kami, Anda dianggap
                    menyetujui seluruh ketentuan di bawah ini.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-brand-black/70 ring-1 ring-brand-orange/20">
                      <CalendarClock className="h-3.5 w-3.5 text-brand-orange" />
                      Terakhir diperbarui: {TERAKHIR_DIPERBARUI}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-brand-black/70 ring-1 ring-brand-orange/20">
                      v2.0
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* TOC mobile */}
            <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm lg:hidden">
              <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-brand-black/50">
                Daftar Isi
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SECTIONS.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2 rounded-lg bg-brand-cream-light px-3 py-2 text-[11px] font-semibold text-brand-black hover:bg-brand-orange/10 hover:text-brand-orange"
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-orange text-[9px] font-black text-white">
                      {i + 1}
                    </span>
                    <span className="line-clamp-1">{s.title}</span>
                  </a>
                ))}
              </div>
            </section>

            {/* Sections */}
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              return (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-24 rounded-2xl border border-brand-cream bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <header className="flex items-center gap-3 border-b border-brand-cream pb-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-orange/10">
                      <Icon className="h-5 w-5 text-brand-orange" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-brand-orange">
                        Pasal {i + 1}
                      </p>
                      <h3 className="text-base font-black text-brand-black sm:text-lg">
                        {s.title}
                      </h3>
                    </div>
                  </header>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-brand-black/80">
                    {s.paragraphs.map((p, idx) => (
                      <p key={idx} className="flex gap-3">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-cream-light text-[10px] font-black text-brand-black/60">
                          {i + 1}.{idx + 1}
                        </span>
                        <span className="flex-1">{p}</span>
                      </p>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* CTA Hubungi Admin */}
            <section className="rounded-2xl border-2 border-dashed border-brand-orange/40 bg-gradient-to-br from-orange-50 to-amber-50 p-6 text-center">
              <Mail className="mx-auto h-8 w-8 text-brand-orange" />
              <h3 className="mt-3 text-base font-black text-brand-black">
                Ada pertanyaan terkait ketentuan ini?
              </h3>
              <p className="mt-1 text-xs text-brand-black/70">
                Tim kami siap membantu menjelaskan poin yang belum jelas.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link
                  href="/chat"
                  className="rounded-md bg-brand-orange px-5 py-2.5 text-xs font-black text-white shadow hover:bg-brand-orange-dark"
                >
                  Chat Admin
                </Link>
                <Link
                  href="/kontak"
                  className="rounded-md border-2 border-brand-cream bg-white px-5 py-2.5 text-xs font-black text-brand-black hover:border-brand-orange"
                >
                  Hubungi Kami
                </Link>
              </div>
            </section>

            {/* Footer info */}
            <p className="flex items-center justify-center gap-2 pt-2 text-center text-[11px] text-brand-black/40">
              <Printer className="h-3.5 w-3.5" />
              Dokumen ini dapat dicetak untuk arsip pribadi.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}