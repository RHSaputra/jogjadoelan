import Link from "next/link";
import { ArrowLeft, Wallet, Repeat, ChevronRight, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Kebijakan Pengembalian — Jogjadoelan",
  description:
    "Pilihan kebijakan pengembalian: Refund (uang kembali) and Tukar (ganti varian/desain).",
};

export default function KebijakanPengembalianHubPage() {
  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      <div className="sticky top-0 z-30 border-b border-brand-cream bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-brand-cream-light transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5 text-brand-black" />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-brand-orange">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h1 className="text-base font-black text-brand-black uppercase tracking-tight">
            Kebijakan Pengembalian
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-6">
        <section className="rounded-2xl border border-brand-cream bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-brand-black">Pusat Bantuan Retur</h2>
          <p className="mt-1 text-sm text-brand-black/60 leading-relaxed">
            Kami berkomitmen memberikan pengalaman belanja terbaik. Jika produk yang Anda terima tidak sesuai, silakan pilih salah satu opsi kebijakan di bawah ini.
          </p>
        </section>

        <section className="grid gap-4">
          <Link
            href="/kebijakan/refund"
            className="group block rounded-2xl border border-brand-cream bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-orange/40 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-inner mb-4">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-brand-black">Pengembalian Dana (Refund)</h3>
            <p className="mt-2 text-xs leading-relaxed text-brand-black/60">
              Opsi pengembalian dana transaksi. Nominal dana yang dikembalikan bervariasi dan akan dievaluasi serta ditetapkan sepenuhnya oleh Admin.
            </p>
            <div className="mt-4 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-brand-orange">
              <span>Pelajari Prosedur Refund</span>
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/kebijakan/tukar"
            className="group block rounded-2xl border border-brand-cream bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-orange/40 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-brand-orange shadow-inner mb-4">
              <Repeat className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-brand-black">Tukar Unit / Perbaikan Desain</h3>
            <p className="mt-2 text-xs leading-relaxed text-brand-black/60">
              Opsi untuk menukar ukuran, warna, atau request redesain. Terdapat 2 jalur: Ambil Stok (jika ready) atau Perbaikan/Redesain dengan biaya tambahan dari Admin.
            </p>
            <div className="mt-4 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-brand-orange">
              <span>Pelajari Prosedur Tukar</span>
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        </section>

        <section className="rounded-2xl border border-brand-cream bg-brand-black p-6 shadow-lg">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Ingin langsung mengajukan?
          </h3>
          <p className="mt-2 text-xs text-white/60 leading-relaxed">
            Buka halaman pesanan Anda, pilih pesanan yang bermasalah, lalu ajukan komplain dengan tindakan Refund atau Tukar.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link
              href="/pesanan"
              className="flex-1 flex items-center justify-center rounded-full bg-brand-orange py-3 text-[11px] font-black text-white shadow-md hover:bg-brand-orange-dark transition-all uppercase tracking-widest"
            >
              Buka Pesanan Saya
            </Link>
            <Link
              href="/return"
              className="flex-1 flex items-center justify-center rounded-full border-2 border-white/20 bg-white/10 py-3 text-[11px] font-black text-white hover:bg-white hover:text-brand-black transition-all uppercase tracking-widest"
            >
              Dashboard Retur
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}