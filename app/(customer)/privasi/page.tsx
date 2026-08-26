import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  CalendarClock,
  ShieldCheck,
  Database,
  Cookie,
  Share2,
  EyeOff,
  UserCog,
  Bell,
  KeyRound,
  Mail,
  Baby,
  Server,
} from "lucide-react";

export const metadata = {
  title: "Kebijakan Privasi — Jogjadoelan",
  description:
    "Kebijakan privasi Jogjadoelan: bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda.",
};

const TERAKHIR_DIPERBARUI = "1 Mei 2026";

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Data Aman",
    desc: "Disimpan terenkripsi & dilindungi sesuai standar industri.",
  },
  {
    icon: EyeOff,
    title: "Tidak Dijual",
    desc: "Data Anda tidak akan pernah dijual ke pihak ketiga.",
  },
  {
    icon: UserCog,
    title: "Anda Berkuasa",
    desc: "Akses, ubah, atau hapus data kapan pun melalui Akun.",
  },
];

const SECTIONS = [
  {
    id: "data-yang-dikumpulkan",
    icon: Database,
    title: "Data yang Kami Kumpulkan",
    paragraphs: [
      "Data identitas: nama lengkap, alamat email, nomor telepon, dan foto profil yang Anda berikan saat mendaftar.",
      "Data transaksi: alamat pengiriman, riwayat pesanan, metode pembayaran (tanpa menyimpan nomor kartu/CVV), dan bukti pembayaran.",
      "Data perangkat: alamat IP, jenis perangkat, sistem operasi, browser, dan informasi log akses untuk keperluan keamanan.",
      "Data interaksi: produk yang dilihat, dimasukkan ke keranjang, atau ditandai sebagai favorit guna meningkatkan rekomendasi.",
    ],
  },
  {
    id: "tujuan-penggunaan",
    icon: ShieldCheck,
    title: "Tujuan Penggunaan Data",
    paragraphs: [
      "Memproses pesanan, pembayaran, dan pengiriman barang ke alamat Anda.",
      "Menyediakan layanan pelanggan, termasuk komunikasi via chat dan notifikasi.",
      "Meningkatkan kualitas layanan, melakukan analisis penggunaan, dan menampilkan rekomendasi produk yang relevan.",
      "Mematuhi kewajiban hukum dan regulasi yang berlaku di Indonesia.",
    ],
  },
  {
    id: "pembagian-data",
    icon: Share2,
    title: "Pembagian Data ke Pihak Ketiga",
    paragraphs: [
      "Mitra ekspedisi (JNE, J&T, SiCepat, AnterAja, dll) — terbatas pada data yang dibutuhkan untuk pengiriman.",
      "Penyedia layanan pembayaran resmi (bank mitra, agregator QRIS) — terbatas pada data verifikasi transaksi.",
      "Penyedia infrastruktur teknologi (cloud hosting, analitik) yang terikat perjanjian kerahasiaan.",
      "Aparat penegak hukum apabila diwajibkan oleh perintah resmi pengadilan atau peraturan perundang-undangan.",
      "Data Anda tidak akan pernah dijual untuk kepentingan iklan pihak ketiga.",
    ],
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "Cookies & Teknologi Serupa",
    paragraphs: [
      "Kami menggunakan cookies untuk menjaga sesi login, mengingat preferensi, dan menganalisis penggunaan platform.",
      "Anda dapat menonaktifkan cookies melalui pengaturan browser, namun beberapa fitur (keranjang, login) mungkin tidak berfungsi optimal.",
      "Kami tidak menggunakan cookies untuk pelacakan iklan lintas situs di luar platform Jogjadoelan.",
    ],
  },
  {
    id: "keamanan",
    icon: KeyRound,
    title: "Keamanan Data",
    paragraphs: [
      "Data sensitif dienkripsi saat transmisi (TLS) dan saat penyimpanan (encryption-at-rest).",
      "Akses ke data internal dibatasi pada personel berwenang berdasarkan prinsip kebutuhan minimum (least-privilege).",
      "Audit keamanan berkala dilakukan untuk mengidentifikasi dan memperbaiki potensi celah.",
    ],
  },
  {
    id: "hak-pengguna",
    icon: UserCog,
    title: "Hak Anda atas Data",
    paragraphs: [
      "Hak akses: meminta salinan data pribadi yang kami simpan.",
      "Hak koreksi: memperbarui data yang tidak akurat melalui menu Akun.",
      "Hak penghapusan: meminta penghapusan akun beserta data terkait, kecuali yang wajib dipertahankan untuk kewajiban hukum (mis. catatan transaksi pajak).",
      "Hak menarik persetujuan: menarik izin pemrosesan data tertentu kapan saja melalui pengaturan notifikasi atau menghubungi admin.",
    ],
  },
  {
    id: "retensi",
    icon: Server,
    title: "Penyimpanan & Retensi Data",
    paragraphs: [
      "Data akun aktif disimpan selama akun masih digunakan.",
      "Data transaksi disimpan minimal 5 tahun sesuai ketentuan perpajakan dan akuntansi.",
      "Data log keamanan disimpan maksimal 12 bulan dan dihapus secara bertahap.",
    ],
  },
  {
    id: "anak",
    icon: Baby,
    title: "Privasi Anak di Bawah Umur",
    paragraphs: [
      "Layanan kami ditujukan untuk pengguna berusia minimal 17 tahun.",
      "Apabila Anda mengetahui anak di bawah umur menggunakan layanan kami tanpa pengawasan, mohon segera laporkan agar akun dapat ditinjau.",
    ],
  },
  {
    id: "perubahan",
    icon: Bell,
    title: "Perubahan Kebijakan",
    paragraphs: [
      "Kami dapat memperbarui Kebijakan Privasi ini sewaktu-waktu untuk mencerminkan perubahan layanan atau regulasi.",
      "Pemberitahuan perubahan signifikan akan disampaikan melalui notifikasi platform atau email terdaftar.",
      "Penggunaan layanan setelah perubahan berlaku dianggap sebagai persetujuan terhadap kebijakan terbaru.",
    ],
  },
];

export default function PrivasiPage() {
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
          <Lock className="h-5 w-5 text-brand-orange" />
          <h1 className="text-lg font-black text-brand-black">
            Kebijakan Privasi
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
            {/* Hero — gradient biru/hijau supaya beda dari Syarat (oranye) */}
            <section className="overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-600 shadow-md">
                  <Lock className="h-7 w-7 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-brand-black sm:text-2xl">
                    Privasi Anda Adalah Prioritas Kami
                  </h2>
                  <p className="mt-1 text-sm text-brand-black/70">
                    Dokumen ini menjelaskan bagaimana Jogjadoelan
                    mengumpulkan, menggunakan, melindungi, dan membagikan data
                    pribadi Anda. Kami berkomitmen menerapkan standar tertinggi
                    dalam menjaga kepercayaan Anda.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-brand-black/70 ring-1 ring-emerald-200">
                      <CalendarClock className="h-3.5 w-3.5 text-emerald-600" />
                      Terakhir diperbarui: {TERAKHIR_DIPERBARUI}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-brand-black/70 ring-1 ring-emerald-200">
                      Sesuai UU PDP RI
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Highlights 3 kolom */}
            <section className="grid gap-3 sm:grid-cols-3">
              {HIGHLIGHTS.map((h) => {
                const Icon = h.icon;
                return (
                  <div
                    key={h.title}
                    className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                      <Icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="mt-3 text-sm font-black text-brand-black">
                      {h.title}
                    </p>
                    <p className="mt-1 text-xs text-brand-black/60">
                      {h.desc}
                    </p>
                  </div>
                );
              })}
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
                    className="flex items-center gap-2 rounded-lg bg-brand-cream-light px-3 py-2 text-[11px] font-semibold text-brand-black hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-black text-white">
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
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                      <Icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
                        Bagian {i + 1}
                      </p>
                      <h3 className="text-base font-black text-brand-black sm:text-lg">
                        {s.title}
                      </h3>
                    </div>
                  </header>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-brand-black/80">
                    {s.paragraphs.map((p, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                        <span className="flex-1">{p}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            {/* CTA */}
            <section className="rounded-2xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 text-center">
              <Mail className="mx-auto h-8 w-8 text-emerald-600" />
              <h3 className="mt-3 text-base font-black text-brand-black">
                Ingin meminta data atau menghapus akun?
              </h3>
              <p className="mt-1 text-xs text-brand-black/70">
                Hubungi tim kami — permintaan Anda akan diproses paling lama
                7 hari kerja.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link
                  href="/chat"
                  className="rounded-md bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow hover:bg-emerald-700"
                >
                  Chat Admin
                </Link>
                <Link
                  href="/akun"
                  className="rounded-md border-2 border-brand-cream bg-white px-5 py-2.5 text-xs font-black text-brand-black hover:border-emerald-500"
                >
                  Pengaturan Akun
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}