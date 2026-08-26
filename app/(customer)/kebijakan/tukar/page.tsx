"use client";

import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  Truck,
  ShieldAlert,
  Phone,
  Package,
  ClipboardCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function KebijakanTukarPage() {
  return (
    <div className="min-h-screen bg-brand-cream-light pb-24 pt-4 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/kebijakan/pengembalian"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-cream bg-white shadow-sm hover:bg-brand-cream-light transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-brand-black" />
          </Link>
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-black/30">Berlaku per 1 Mei 2026</span>
        </div>

        <div className="mb-6 text-left">
          <h1 className="text-2xl font-black text-brand-black">Tukar / Redesain</h1>
          <p className="mt-1 text-sm text-brand-black/60 font-medium">
            Ketentuan penukaran varian dan perbaikan desain Jogjadoelan.
          </p>
        </div>

        <Card className="rounded-2xl border-brand-orange/20 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-brand-orange uppercase tracking-wider">
            <Package className="h-5 w-5" /> Aturan Penukaran & Perbaikan
          </h2>
          <ul className="space-y-3">
            <Bullet>Berlaku untuk ganti ukuran, warna, maupun <strong>Request Desain Ulang</strong>.</Bullet>
            <Bullet><strong>Jalur Ambil Stok:</strong> Jika varian tersedia, langsung dikirim penggantinya.</Bullet>
            <Bullet><strong>Jalur Redesain:</strong> Jika ada request custom/perbaikan, Admin akan mengestimasi <strong>biaya tambahan</strong> yang wajib disetujui.</Bullet>
            <Bullet>Wajib diajukan maksimal 3x24 jam sejak paket tiba.</Bullet>
          </ul>
        </Card>

        <div className="mt-8 space-y-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-black/40 px-1">Langkah Proses</h2>
          
          <Step
            n={1}
            title="Isi Form Varian / Desain"
            desc="Isi ukuran, warna, atau ketik detail request redesain yang Anda inginkan di form."
            icon={<ClipboardCheck />}
          />
          <Step
            n={2}
            title="Keputusan & Estimasi Admin"
            desc="Admin akan merespons dengan Jalur Ambil Stok ATAU memberikan tagihan estimasi biaya Redesain."
            icon={<Clock />}
          />
          <Step
            n={3}
            title="Kirim Barang Lama"
            desc="Kirim kembali produk asli Anda ke gudang Jogjadoelan via Anteraja."
            icon={<Truck />}
          />
          <Step
            n={4}
            title="Produk Baru Dikirim"
            desc="Produk pengganti atau hasil perbaikan redesain akan segera dikirimkan ke alamat Anda."
            icon={<CheckCircle2 />}
          />
        </div>

        <Card className="mt-8 rounded-2xl border border-brand-cream bg-white p-6 shadow-sm space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-brand-black uppercase tracking-wider">
            <Phone className="h-5 w-5 text-brand-orange" /> Ketentuan Biaya
          </h2>
          <div className="grid gap-4 text-xs font-medium text-brand-black/70">
            <div className="flex justify-between border-b border-brand-cream pb-3">
              <span>Biaya Redesain / Perbaikan</span>
              <span className="font-black text-brand-orange uppercase text-right">Sesuai Estimasi Admin</span>
            </div>
            <div className="flex justify-between border-b border-brand-cream pb-3">
              <span>Ongkir Tukar (Salah Ukuran/Custom)</span>
              <span className="font-black text-brand-black uppercase">Ditanggung Pembeli</span>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] font-medium text-amber-900 leading-relaxed shadow-sm">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Pengajuan yang menyalahi aturan dapat ditolak admin. Keputusan admin mengenai ketersediaan stok atau estimasi harga redesain bersifat final.
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link href="/kebijakan/refund" className="block">
            <Button variant="outline" className="w-full rounded-full border-2 border-brand-cream bg-white h-12 text-[11px] font-black uppercase tracking-widest text-brand-black hover:bg-brand-cream-light">
              Kebijakan Refund
            </Button>
          </Link>
          <Link href="/return" className="block">
            <Button className="w-full rounded-full bg-brand-orange hover:bg-brand-orange-dark h-12 text-[11px] font-black uppercase tracking-widest text-white shadow-lg">
              Daftar Retur
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
      <span className="text-xs font-bold text-brand-black/80">{children}</span>
    </li>
  );
}

function Step({
  n,
  title,
  desc,
  icon,
}: {
  n: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-cream-light text-brand-orange shadow-inner">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-brand-black/40">Step 0{n}</h3>
        <p className="mt-0.5 text-sm font-black text-brand-black">{title}</p>
        <p className="mt-1 text-xs font-medium leading-relaxed text-brand-black/60">{desc}</p>
      </div>
    </div>
  );
}