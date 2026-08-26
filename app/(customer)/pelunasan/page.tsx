"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, Package, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCustomOrder } from "@/lib/custom-order-context";

export default function PelunasanListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { orders } = useCustomOrder();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/pelunasan")}`);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

  if (!mounted || authLoading) {
    return <div className="min-h-screen bg-brand-cream-light" />;
  }

  const siapDilunasi = orders.filter((o) => o.status === "siap_dilunasi");
  const menungguVerif = orders.filter(
    (o) => o.status === "menunggu_verifikasi_pelunasan",
  );

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-brand-black">
              Pelunasan Custom
            </h1>
            <p className="text-xs text-brand-black/50">
              {siapDilunasi.length} order siap dilunasi
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-5">
        {/* Card Info */}
        <div className="rounded-2xl border-2 border-brand-orange bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-6 w-6 shrink-0 text-brand-orange" />
            <div>
              <p className="text-sm font-black text-brand-black">
                Pelunasan Custom Order
              </p>
              <p className="mt-1 text-xs text-brand-black/70">
                Setelah produk custom selesai diproduksi, sisa pembayaran (jika
                pakai DP) bisa dilunasi di sini. Cek status terbaru di{" "}
                <Link
                  href="/custom/riwayat"
                  className="font-bold text-brand-orange underline"
                >
                  Riwayat Custom
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Siap dilunasi */}
        <section>
          <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-brand-black/60">
            🔥 Siap Dilunasi ({siapDilunasi.length})
          </h2>
          {siapDilunasi.length === 0 ? (
            <div className="rounded-2xl border border-brand-cream bg-white py-10 text-center">
              <Package className="mx-auto h-10 w-10 text-brand-black/30" />
              <p className="mt-2 text-sm font-bold text-brand-black">
                Belum ada pelunasan
              </p>
              <p className="mt-1 text-xs text-brand-black/60">
                Tunggu admin tandai produk selesai diproduksi
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {siapDilunasi.map((o) => {
                const total = o.estimasi?.total ?? 0;
                const dpPaid = o.dpPayment?.amount ?? 0;
                const sisa = Math.max(0, total - dpPaid);
                return (
                  <li
                    key={o.id}
                    className="overflow-hidden rounded-2xl border-2 border-brand-orange bg-white shadow-sm"
                  >
                    <Link
                      href={`/pelunasan/${o.id}`}
                      className="block p-4 hover:bg-orange-50/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-brand-orange" />
                            <code className="text-xs font-black text-brand-black">
                              {o.id}
                            </code>
                          </div>
                          <p className="mt-1 text-sm font-bold text-brand-black">
                            {o.jenis} · Ukuran {o.ukuran}
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-brand-black/60">
                            <Clock className="h-3 w-3" /> {fmtDate(o.createdAt)}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                            <div>
                              <span className="text-brand-black/60">Total:</span>{" "}
                              <strong>Rp {total.toLocaleString("id-ID")}</strong>
                            </div>
                            <div>
                              <span className="text-brand-black/60">DP:</span>{" "}
                              <strong>Rp {dpPaid.toLocaleString("id-ID")}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                            Sisa
                          </p>
                          <p className="text-base font-black text-brand-orange">
                            Rp {sisa.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-md bg-brand-orange py-2 px-3 text-xs font-black text-white shadow">
                        Lunasi Sekarang <ChevronRight className="h-4 w-4" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Menunggu verifikasi */}
        {menungguVerif.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-brand-black/60">
              ⏳ Menunggu Verifikasi ({menungguVerif.length})
            </h2>
            <ul className="space-y-2">
              {menungguVerif.map((o) => (
                <li
                  key={o.id}
                  className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <code className="text-xs font-black text-brand-black">
                        {o.id}
                      </code>
                      <p className="mt-1 text-sm font-bold text-brand-black">
                        {o.jenis}
                      </p>
                      <p className="mt-1 text-[11px] text-brand-black/60">
                        Bukti pelunasan terkirim, menunggu konfirmasi admin
                      </p>
                    </div>
                    <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-black text-cyan-700">
                      Verifikasi
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}