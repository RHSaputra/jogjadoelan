"use client";

import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  Wallet,
  Truck,
  ShieldAlert,
  Calculator,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function KebijakanRefundPage() {
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

        <div className="mb-6">
          <h1 className="text-2xl font-black text-brand-black">Kebijakan Refund</h1>
          <p className="mt-1 text-sm text-brand-black/60 font-medium">
            Ketentuan pengembalian dana transaksi Jogjadoelan.
          </p>
        </div>

        <Card className="rounded-2xl border-brand-orange/20 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-brand-orange uppercase tracking-wider">
            <CheckCircle2 className="h-5 w-5" /> Syarat Kelayakan Refund
          </h2>
          <ul className="space-y-3">
            <Bullet>Produk yang diterima rusak, cacat produksi, atau hilang.</Bullet>
            <Bullet>Wajib menyertakan video unboxing utuh tanpa jeda.</Bullet>
            <Bullet>Nominal refund <strong>BERVARIASI</strong> dan tidak selalu 100% dari harga barang.</Bullet>
            <Bullet>Admin memiliki hak mutlak menentukan besaran nominal refund setelah evaluasi.</Bullet>
          </ul>
        </Card>

        <div className="mt-8 space-y-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-black/40 px-1">Prosedur Pengajuan</h2>
          <Step
            n={1}
            title="Ajukan Komplain"
            desc="Gunakan fitur 'Ajukan Komplain' pada detail pesanan Anda paling lambat 3x24 jam."
            icon={<ShieldAlert />}
          />
          <Step
            n={2}
            title="Evaluasi Nominal oleh Admin"
            desc="Admin akan mengevaluasi tingkat kerusakan dan menetapkan nominal dana yang layak direfund."
            icon={<Calculator />}
          />
          <Step
            n={3}
            title="Kirim Balik Barang"
            desc="Jika disetujui, bungkus rapi barang dan kirim via Anteraja ke alamat gudang kami."
            icon={<Truck />}
          />
          <Step
            n={4}
            title="Pencairan Dana"
            desc="Dana sesuai nominal yang disetujui akan ditransfer ke rekening Anda setelah barang tiba."
            icon={<Wallet />}
          />
        </div>

        <Card className="mt-8 rounded-2xl border border-brand-cream bg-white p-6 shadow-sm space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-brand-black uppercase tracking-wider">
            <Calculator className="h-5 w-5 text-brand-orange" /> Nominal & Biaya
          </h2>
          <div className="grid gap-4 text-xs font-medium text-brand-black/70">
            <div className="flex justify-between border-b border-brand-cream pb-3">
              <span>Dana yang Direfund</span>
              <span className="font-black text-brand-orange uppercase text-right">Bervariasi<br/><span className="text-[9px] text-brand-black/40">(Ditetapkan Admin)</span></span>
            </div>
            <div className="flex justify-between border-b border-brand-cream pb-3">
              <span>Biaya Kirim Balik</span>
              <span className="font-black text-emerald-600 uppercase">Ditanggung Penjual*</span>
            </div>
          </div>
          <p className="text-[10px] italic text-brand-black/40">
            * Hanya jika refund disebabkan murni oleh kesalahan/cacat dari tim Jogjadoelan.
          </p>
        </Card>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] font-medium text-amber-900 leading-relaxed shadow-sm">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Pengajuan refund yang menyalahi aturan dapat ditolak tanpa pemberitahuan lanjut. Keputusan admin terkait nominal bersifat final dan mengikat.
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link href="/kebijakan/tukar" className="block">
            <Button variant="outline" className="w-full rounded-full border-2 border-brand-cream bg-white h-12 text-[11px] font-black uppercase tracking-widest text-brand-black hover:bg-brand-cream-light">
              Kebijakan Tukar
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