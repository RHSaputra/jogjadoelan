"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Landmark,
  ShieldCheck,
  Clock,
  Upload,
  CheckCircle2,
  AlertTriangle,
  CircleDollarSign,
} from "lucide-react";
import { useBankList } from "@/lib/use-bank-config";

export default function PembayaranTransferBankPage() {
  const banks = useBankList();

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="rounded-md p-1.5 text-brand-black hover:bg-brand-cream"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Landmark className="h-5 w-5 text-brand-orange" />
          <h1 className="text-lg font-black text-brand-black">
            Transfer Bank
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-4">
        {/* Hero — gradient generic, bukan Mandiri */}
        <section className="overflow-hidden rounded-2xl border-2 border-brand-orange/20 bg-gradient-to-br from-[#0E2148] via-[#1A3066] to-[#0E2148] p-6 text-white shadow-lg">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/20 backdrop-blur">
              <Landmark className="h-8 w-8 text-brand-orange" />
            </div>
            <h2 className="mt-4 text-xl font-black">Bank Resmi Jogjadoelan</h2>
            <p className="mt-1 text-sm text-white/80">
              {banks.length > 0
                ? `${banks.length} bank tersedia untuk transfer manual.`
                : "Belum ada bank aktif. Hubungi admin via chat untuk panduan."}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verifikasi manual oleh admin
            </span>
          </div>
        </section>

        {/* Informasi bank tujuan - nomor rekening tidak ditampilkan publik */}
        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-brand-black">
            Bank Tujuan
          </h3>

          <p className="mt-1 text-xs text-brand-black/60">
            {banks.length > 0
              ? "Pilih bank pada saat checkout. Nomor rekening akan diberikan di halaman pembayaran pesanan."
              : "Belum ada bank yang ditambahkan admin. Silakan hubungi admin via chat."}
          </p>

          {banks.length > 0 ? (
            <div className="mt-4 space-y-2">
              {banks.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-xl border border-brand-cream bg-brand-cream-light/60 p-3">
                  <div
                    className="flex h-8 w-20 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: b.warna || "#fc970a" }}
                  >
                    <span className="text-[10px] font-black text-white">{b.nama.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-brand-black">Bank {b.nama}</p>
                    <p className="text-[11px] text-brand-black/60">a.n. {b.atasNama || "JOGJADOELAN"}</p>
                  </div>
                </div>
              ))}
              <p className="mt-2 text-[11px] text-brand-black/50">
                Nomor rekening lengkap akan diberikan di halaman pembayaran pesanan setelah checkout.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-brand-cream bg-brand-cream-light/60 p-4 text-center">
              <p className="text-sm text-brand-black/60">Belum ada bank aktif.</p>
            </div>
          )}
        </section>

        {/* Cara bayar (tetap statis, sudah generic) */}
        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-brand-black">
            Cara Pembayaran
          </h3>
          <ol className="mt-4 space-y-4">
            {[
              {
                title: "Selesaikan checkout",
                desc: "Setelah memilih metode Transfer Bank pada halaman checkout, Anda akan menerima nomor rekening tujuan beserta nominal.",
              },
              {
                title: "Lakukan transfer",
                desc: "Transfer melalui m-banking, ATM, internet banking, atau teller. Pastikan nominal sesuai persis.",
              },
              {
                title: "Unggah bukti transfer",
                desc: "Buka halaman Pembayaran pesanan Anda, lalu unggah foto/screenshot bukti transfer yang jelas (nominal & waktu terbaca).",
              },
              {
                title: "Tunggu verifikasi admin",
                desc: "Admin memverifikasi pembayaran maksimal 1×24 jam pada hari kerja. Status pesanan otomatis berubah ke 'Diproses' setelah disetujui.",
              },
            ].map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-orange text-xs font-black text-white">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-brand-black">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-black/70">
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Info penting (statis, tetap) */}
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <Clock className="h-5 w-5 text-brand-orange" />
            <p className="mt-2 text-xs font-black text-brand-black">Batas Waktu</p>
            <p className="mt-1 text-xs text-brand-black/70">
              24 jam setelah checkout. Lewat batas, pesanan otomatis kadaluarsa.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <CircleDollarSign className="h-5 w-5 text-brand-orange" />
            <p className="mt-2 text-xs font-black text-brand-black">Nominal Persis</p>
            <p className="mt-1 text-xs text-brand-black/70">
              Transfer nominal sesuai yang tertera. Jangan dibulatkan.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <Upload className="h-5 w-5 text-brand-orange" />
            <p className="mt-2 text-xs font-black text-brand-black">Bukti Wajib</p>
            <p className="mt-1 text-xs text-brand-black/70">
              Tanpa bukti transfer, pesanan tidak akan diverifikasi.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-brand-orange" />
            <p className="mt-2 text-xs font-black text-brand-black">Konfirmasi</p>
            <p className="mt-1 text-xs text-brand-black/70">
              Maksimal 1×24 jam pada hari kerja (Senin–Sabtu).
            </p>
          </div>
        </section>

        {/* Catatan */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
            <div>
              <h3 className="text-sm font-black text-amber-900">
                Hal yang Perlu Diperhatikan
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-amber-900/90">
                <li>• Daftar rekening di atas adalah rekening resmi toko — jangan transfer ke rekening lain.</li>
                <li>• Pastikan a.n. rekening sama dengan yang tertera di halaman pembayaran pesanan Anda.</li>
                <li>• Jika 24 jam tidak ada konfirmasi, hubungi admin via Chat.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-wrap gap-2">
          <Link
            href="/pembayaran/qris"
            className="rounded-md border-2 border-brand-cream bg-white px-4 py-2 text-xs font-black text-brand-black hover:border-brand-orange"
          >
            Lihat QRIS
          </Link>
          <Link
            href="/chat"
            className="rounded-md bg-brand-orange px-4 py-2 text-xs font-black text-white shadow hover:bg-brand-orange-dark"
          >
            Chat Admin
          </Link>
        </section>
      </div>
    </div>
  );
}