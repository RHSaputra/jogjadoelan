"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  Repeat,
  ChevronRight,
  ShieldCheck,
  Info,
  PackageX,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getRefunds, type Refund } from "@/lib/refund-helpers";
import { getTukars, type Tukar } from "@/lib/tukar-helpers";

export default function ReturnHubPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [tukars, setTukars] = useState<Tukar[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?next=" + encodeURIComponent("/return"));
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [r, t] = await Promise.all([getRefunds(), getTukars()]);
      if (cancelled) return;
      setRefunds(r);
      setTukars(t);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const refundAktif = useMemo(
    () =>
      refunds.filter(
        (r) => r.status !== "selesai" && r.status !== "ditolak" && r.status !== "dibatalkan"
      ),
    [refunds]
  );

  const tukarAktif = useMemo(
    () =>
      tukars.filter(
        (t) => t.status !== "selesai" && t.status !== "ditolak" && t.status !== "dibatalkan"
      ),
    [tukars]
  );

  if (authLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-brand-cream-light" />;
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      <div className="sticky top-0 z-30 border-b border-brand-cream bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-brand-cream-light transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5 text-brand-black" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-brand-orange">
            <PackageX className="h-4 w-4" />
          </div>
          <h1 className="text-base font-black text-brand-black">Pusat Komplain &amp; Retur</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 pt-4">
        <section className="space-y-3">
          <Link
            href="/tukar"
            className="group flex items-center gap-4 rounded-2xl border border-brand-cream bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange/40 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-inner">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-brand-black">Pengembalian Dana (Refund)</h2>
              <p className="mt-0.5 text-[11px] font-medium text-brand-black/50">
                Pantau seluruh status pencairan dana retur Anda
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loaded && refundAktif.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-black text-white">
                  {refundAktif.length}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-brand-black/30 group-hover:text-brand-orange transition-colors" />
            </div>
          </Link>

          <Link
            href="/tukar"
            className="group flex items-center gap-4 rounded-2xl border border-brand-cream bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange/40 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand-orange shadow-inner">
              <Repeat className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-brand-black">Tukar Unit / Varian</h2>
              <p className="mt-0.5 text-[11px] font-medium text-brand-black/50">
                Pantau seluruh proses pengiriman varian pengganti
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loaded && tukarAktif.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-orange px-1.5 text-[10px] font-black text-white">
                  {tukarAktif.length}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-brand-black/30 group-hover:text-brand-orange transition-colors" />
            </div>
          </Link>
        </section>

        <section className="rounded-2xl border border-brand-cream bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-brand-cream pb-3">
            <ShieldCheck className="h-4 w-4 text-brand-orange" />
            <h3 className="text-xs font-black uppercase tracking-wider text-brand-black">
              Alur Layanan Resolusi
            </h3>
          </div>
          <ol className="relative border-l border-brand-cream pl-4 ml-2 space-y-5">
            <li className="relative">
              <span className="absolute -left-[21px] top-0 flex h-3 w-3 items-center justify-center rounded-full bg-brand-orange ring-4 ring-orange-100" />
              <div className="text-xs font-black text-brand-black">1. Ajukan Komplain</div>
              <p className="mt-0.5 text-[11px] font-medium text-brand-black/60 leading-relaxed">
                Pilih menu komplain di halaman detail pesanan Anda.
              </p>
            </li>
            <li className="relative">
              <span className="absolute -left-[21px] top-0 flex h-3 w-3 items-center justify-center rounded-full bg-brand-black/30 ring-4 ring-zinc-100" />
              <div className="text-xs font-black text-brand-black">2. Verifikasi Admin</div>
              <p className="mt-0.5 text-[11px] font-medium text-brand-black/60 leading-relaxed">
                Tim Jogjadoelan memeriksa bukti foto atau video unboxing.
              </p>
            </li>
            <li className="relative">
              <span className="absolute -left-[21px] top-0 flex h-3 w-3 items-center justify-center rounded-full bg-brand-black/30 ring-4 ring-zinc-100" />
              <div className="text-xs font-black text-brand-black">3. Kirim Balik / Resolusi</div>
              <p className="mt-0.5 text-[11px] font-medium text-brand-black/60 leading-relaxed">
                Kirim produk lama kembali, lalu dana dicairkan atau produk pengganti dikirim.
              </p>
            </li>
          </ol>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <Info className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-700" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
                Syarat Pengembalian
              </h3>
              <ul className="mt-4 space-y-2.5 text-[11px] font-medium text-amber-900/90 leading-relaxed">
                <li>• Pengajuan paling lambat 3×24 jam setelah barang diterima.</li>
                <li>• Wajib menyertakan video unboxing yang jelas (tidak buram/terpotong).</li>
                <li>• Barang harus dalam kondisi lengkap (label, dus, aksesoris).</li>
                <li>• Pengiriman balik wajib via kurir Anteraja (sesuai SOP toko).</li>
                <li>• Khusus produk custom hanya dapat di-refund jika cacat produksi.</li>
              </ul>
            </div>
          </div>
        </section>

        {!loaded && (
          <p className="py-6 text-center text-[10px] font-bold uppercase tracking-widest text-brand-black/30 animate-pulse">
            Memuat ringkasan riwayat…
          </p>
        )}
      </div>
    </div>
  );
}