"use client";

import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Package, Truck } from "lucide-react";
import { getEkspedisiList } from "@/lib/orders-storage";

export default function PengirimanPage() {
  const ekspedisiList = getEkspedisiList();

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link href="/akun" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-lg font-black text-brand-black">Info Pengiriman</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-5">
        <section className="rounded-2xl bg-gradient-to-br from-brand-orange to-brand-orange-dark p-5 text-white shadow-lg">
          <Truck className="h-8 w-8" />
          <h2 className="mt-2 text-xl font-black">Kami Kirim ke Seluruh Indonesia</h2>
          <p className="mt-1 text-sm opacity-95">Bekerja sama dengan ekspedisi terpercaya untuk pengiriman cepat & aman.</p>
        </section>

        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-brand-black">Estimasi Pengiriman</h3>
          <div className="mt-3 space-y-2">
            {[
              { icon: MapPin, area: "Jawa", est: "1-3 hari" },
              { icon: MapPin, area: "Sumatera & Bali", est: "2-5 hari" },
              { icon: MapPin, area: "Kalimantan & Sulawesi", est: "3-6 hari" },
              { icon: MapPin, area: "Indonesia Timur", est: "5-10 hari" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md bg-brand-cream-light p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
                  <r.icon className="h-4 w-4" />
                </div>
                <p className="flex-1 text-sm font-bold text-brand-black">{r.area}</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-brand-orange">{r.est}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-brand-black">Mitra Ekspedisi</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ekspedisiList.map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded-md bg-brand-cream-light p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-brand-orange/10 text-brand-orange">
                  <Package className="h-4 w-4" />
                </div>
                <p className="text-sm font-bold text-brand-black">{e.nama}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-brand-black">Cara Cek Resi</h3>
          <ol className="mt-3 space-y-2 text-sm text-brand-black/80">
            {[
              "Buka menu Pesanan Saya di akun Anda",
              "Pilih pesanan yang sudah berstatus Dikirim",
              "Salin nomor resi yang tertera",
              "Cek di website ekspedisi atau klik tombol Lacak",
            ].map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[11px] font-black text-white">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 shrink-0 text-amber-700" />
            <div className="text-sm text-amber-900">
              <p className="font-bold">Catatan</p>
              <p className="mt-1">Estimasi tidak termasuk hari libur nasional. Pengiriman ekspres tersedia untuk area Jogja & sekitarnya, hubungi admin untuk info lebih lanjut.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}