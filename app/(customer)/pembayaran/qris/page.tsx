"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  QrCode,
  Smartphone,
  ScanLine,
  CheckCircle2,
  Upload,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ZoomIn,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useQrisConfig } from "@/lib/use-bank-config";

export default function PembayaranQrisPage() {
  const qris = useQrisConfig();
  const [showZoom, setShowZoom] = useState(false);

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
          <QrCode className="h-5 w-5 text-brand-orange" />
          <h1 className="text-lg font-black text-brand-black">QRIS</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-4">
        {/* Hero — preview QRIS resmi admin (kalau ada) */}
        <section className="overflow-hidden rounded-2xl border-2 border-[#ED1C24]/20 bg-gradient-to-br from-[#ED1C24] via-[#C8102E] to-[#7A0A1B] p-6 text-white shadow-lg">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <QrCode className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-black">
              {qris.merchantName || "QRIS Nasional"}
            </h2>
            <p className="mt-1 text-sm text-white/85">
              Bayar dari semua e-wallet & m-banking pendukung QRIS dalam satu QR.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              Standar resmi Bank Indonesia
            </span>
          </div>
        </section>

        {/* Preview QRIS resmi (live dari admin) */}
        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-brand-black">
            QRIS Resmi Jogjadoelan
          </h3>
          <p className="mt-1 text-xs text-brand-black/60">
            QR di bawah hanya preview. Saat checkout, QR yang sama (dengan
            nominal otomatis) akan tampil di halaman pembayaran pesanan Anda.
          </p>
          <div className="mt-4 flex flex-col items-center gap-3">
            <div
              className="flex h-52 w-52 items-center justify-center rounded-xl border-2 border-brand-cream bg-[#FAF9F5] p-2 cursor-pointer hover:border-brand-orange transition-colors"
              onClick={() => qris.url && setShowZoom(true)}
            >
              {qris.url ? (
                <Image
                  src={qris.url}
                  alt="QRIS Jogjadoelan"
                  width={180}
                  height={180}
                  className="object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 px-3 text-center">
                  <QrCode className="h-10 w-10 text-brand-black/20" />
                  <p className="text-[11px] font-black text-brand-black/60">
                    QRIS belum tersedia
                  </p>
                  <p className="text-[10px] text-brand-black/40">
                    Admin belum upload QR.
                  </p>
                </div>
              )}
            </div>
            {qris.url && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowZoom(true)}
                  className="flex items-center gap-1.5 rounded-full border border-brand-cream bg-white px-3 py-1.5 text-xs font-bold text-brand-black hover:border-brand-orange"
                >
                  <ZoomIn className="h-3 w-3" /> Perbesar
                </button>
                <a
                  href={qris.url}
                  download={`qris-${qris.merchantName || 'jogjadoelan'}.webp`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-brand-cream bg-white px-3 py-1.5 text-xs font-bold text-brand-black hover:border-brand-orange"
                >
                  <Download className="h-3 w-3" /> Simpan
                </a>
              </div>
            )}
            {qris.url && (
              <p className="text-[11px] text-brand-black/50">
                Nama merchant: <span className="font-bold text-brand-black">{qris.merchantName}</span>
              </p>
            )}
          </div>

          {/* Zoom Modal */}
          <Dialog open={showZoom} onOpenChange={setShowZoom}>
            <DialogContent className="max-w-md bg-white p-2">
              <DialogTitle className="sr-only">Zoom QRIS {qris.merchantName}</DialogTitle>
              <div className="flex flex-col items-center gap-4 p-4">
                <p className="text-sm font-black text-brand-black">{qris.merchantName}</p>
                <div className="relative h-72 w-72 overflow-hidden rounded-xl border-2 border-brand-cream">
                  <Image src={qris.url || ''} alt="QRIS" width={288} height={288} className="h-full w-full object-contain" />
                </div>
                <div className="flex gap-2">
                  <a
                    href={qris.url}
                    download={`qris-${qris.merchantName || 'jogjadoelan'}.webp`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full bg-brand-orange px-6 py-2.5 text-sm font-bold text-white"
                  >
                    <Download className="h-4 w-4" /> Simpan
                  </a>
                  <DialogClose className="flex items-center gap-2 rounded-full border-2 border-brand-cream bg-white px-6 py-2.5 text-sm font-bold text-brand-black">
                    Tutup
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </section>

        {/* E-wallet/Bank pendukung — statis, tetap */}
        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-brand-black">
            Aplikasi yang Didukung
          </h3>
          <p className="mt-1 text-xs text-brand-black/60">
            Semua aplikasi berlogo QRIS dapat digunakan, antara lain:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "GoPay", "OVO", "DANA", "ShopeePay", "LinkAja",
              "Livin' Mandiri", "BCA mobile", "BRImo", "BNI Mobile",
              "Jenius", "SeaBank",
            ].map((app) => (
              <span
                key={app}
                className="rounded-full border border-brand-cream bg-brand-cream-light px-3 py-1 text-[11px] font-bold text-brand-black"
              >
                {app}
              </span>
            ))}
          </div>
        </section>

        {/* Cara bayar — statis, tetap */}
        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-brand-black">
            Cara Pembayaran QRIS
          </h3>
          <ol className="mt-4 space-y-4">
            {[
              { icon: ScanLine, title: "Buka halaman pembayaran pesanan",
                desc: "Setelah checkout dengan metode QRIS, kode QR pembayaran akan tampil di halaman pembayaran pesanan Anda." },
              { icon: Smartphone, title: "Scan dengan aplikasi pendukung",
                desc: "Buka aplikasi e-wallet atau m-banking Anda, pilih menu Scan/QRIS, lalu arahkan ke kode QR yang tampil." },
              { icon: CheckCircle2, title: "Periksa & konfirmasi",
                desc: "Pastikan nama merchant 'Jogjadoelan' dan nominal sesuai tagihan, lalu konfirmasi pembayaran di aplikasi Anda." },
              { icon: Upload, title: "Unggah bukti pembayaran",
                desc: "Screenshot halaman sukses dari aplikasi Anda, lalu unggah pada halaman pembayaran pesanan sebagai bukti." },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-orange text-xs font-black text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-brand-orange" />
                      <p className="text-sm font-bold text-brand-black">{s.title}</p>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-brand-black/70">
                      {s.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Info ringkas (statis, tetap) */}
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <Clock className="h-5 w-5 text-brand-orange" />
            <p className="mt-2 text-xs font-black text-brand-black">Konfirmasi Cepat</p>
            <p className="mt-1 text-xs text-brand-black/70">
              Pembayaran QRIS umumnya tervalidasi dalam hitungan menit.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-brand-orange" />
            <p className="mt-2 text-xs font-black text-brand-black">Aman & Resmi</p>
            <p className="mt-1 text-xs text-brand-black/70">
              QRIS terstandar Bank Indonesia dan terdaftar di ASPI.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <Upload className="h-5 w-5 text-brand-orange" />
            <p className="mt-2 text-xs font-black text-brand-black">Bukti Wajib</p>
            <p className="mt-1 text-xs text-brand-black/70">
              Unggah screenshot sukses agar admin memverifikasi lebih cepat.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <QrCode className="h-5 w-5 text-brand-orange" />
            <p className="mt-2 text-xs font-black text-brand-black">Satu QR untuk Semua</p>
            <p className="mt-1 text-xs text-brand-black/70">
              Tidak perlu memilih bank/e-wallet — cukup scan satu QR.
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
                <li>• Kode QR pembayaran resmi muncul pada halaman pembayaran pesanan Anda dengan nominal otomatis.</li>
                <li>• Pastikan nama merchant yang muncul adalah <strong>{qris.merchantName || "Jogjadoelan"}</strong> sebelum konfirmasi.</li>
                <li>• Nominal akan otomatis terisi dari QR — jangan diubah manual.</li>
                <li>&bull; Bila aplikasi Anda gagal scan, gunakan opsi &apos;Pilih dari galeri&apos; lalu unggah gambar QR.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-wrap gap-2">
          <Link
            href="/pembayaran/transfer-bank"
            className="rounded-md border-2 border-brand-cream bg-white px-4 py-2 text-xs font-black text-brand-black hover:border-brand-orange"
          >
            Lihat Transfer Bank
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