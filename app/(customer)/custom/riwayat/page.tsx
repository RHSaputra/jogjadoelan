"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Package,
  Palette,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useCustomOrder,
  CUSTOM_STATUS_LABEL,
  CUSTOM_STATUS_COLOR,
} from "@/lib/custom-order-context";

export default function CustomRiwayatPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { orders, konfirmasiTerima, setCurrentOrderId, cancelOrder } = useCustomOrder();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  /* --- BIAYA PACKING dari Settings API --- */
  const [biayaPackingDefault, setBiayaPackingDefault] = useState<number>(10000);
  useEffect(() => {
    fetch("/api/settings?keys=biayaPacking")
      .then(r => r.json())
      .then(j => {
        const val = Number(j?.biayaPacking) || 10000;
        if (val > 0) setBiayaPackingDefault(val);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/custom/riwayat")}`);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

  if (!mounted || authLoading) {
    return <div className="min-h-screen bg-brand-cream-light" />;
  }

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            href="/akun"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black text-brand-black">Riwayat Custom</h1>
            <p className="text-xs text-brand-black/50">
              {orders.length} order custom
            </p>
          </div>
          <Link
            href="/custom"
            className="rounded-md bg-brand-orange px-3 py-2 text-xs font-black text-white shadow hover:bg-brand-orange-dark"
          >
            + Custom Baru
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="container mx-auto max-w-2xl space-y-3 px-4 py-5">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-brand-cream bg-white py-16 text-center shadow-sm">
            <Palette className="mx-auto h-12 w-12 text-brand-black/30" />
            <p className="mt-3 text-sm font-bold text-brand-black">
              Belum ada order custom
            </p>
            <p className="mt-1 text-xs text-brand-black/60">
              Buat helm sesuai keinginanmu
            </p>
            <Link
              href="/custom"
              className="mt-4 inline-block rounded-md bg-brand-orange px-5 py-2.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark"
            >
              Mulai Custom
            </Link>
          </div>
        ) : (
          orders.map((o) => {
            const total = o.estimasi?.total ?? 0;
            const biayaPacking = (o.estimasi?.items?.length ?? 0) > 0 ? biayaPackingDefault : 0;
            const totalWithPacking = total + biayaPacking;
            const dpPaid = o.dpPayment?.amount ?? 0;
            const lunasPaid = o.lunasPayment?.amount ?? 0;
            const pelunasanPaid = o.pelunasanPayment?.amount ?? 0;
            const totalDibayar = dpPaid + lunasPaid + pelunasanPaid;
            const sisa = Math.max(0, totalWithPacking - totalDibayar);

            return (
              <div
                key={o.id}
                className="overflow-hidden rounded-2xl border border-brand-cream bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Header card — clickable */}
                <Link
                  href={`/custom/${o.id}`}
                  className="block transition hover:bg-brand-cream-light/50"
                >
                  <div className="flex items-center justify-between border-b border-brand-cream bg-brand-cream-light px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-brand-orange" />
                      <p className="text-xs font-black text-brand-black">{o.id}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${CUSTOM_STATUS_COLOR[o.status]}`}
                    >
                      {CUSTOM_STATUS_LABEL[o.status]}
                    </span>
                  </div>

                  {/* Body card */}
                  <div className="space-y-2 p-4">
                    <div className="flex items-center gap-2 text-xs text-brand-black/60">
                      <Clock className="h-3.5 w-3.5" /> {fmtDate(o.createdAt)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-brand-black/60">Jenis:</span>{" "}
                        <strong className="text-brand-black">{o.jenis}</strong>
                      </div>
                      <div>
                        <span className="text-brand-black/60">Ukuran:</span>{" "}
                        <strong className="text-brand-black">{o.ukuran}</strong>
                      </div>
                    </div>

                    {o.warnaList.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-brand-black/60">Warna:</span>
                        <div className="flex -space-x-1">
                          {o.warnaList.map((w, i) => (
                            <div
                              key={i}
                              className="h-5 w-5 rounded-full border-2 border-white shadow"
                              style={{ backgroundColor: w.hex }}
                              title={w.nama || w.hex}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pembayaran ringkas */}
                    {total > 0 && (
                      <div className="rounded-lg bg-brand-cream-light p-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-brand-black/60">Estimasi Produk</span>
                          <strong className="text-brand-black">
                            Rp {total.toLocaleString("id-ID")}
                          </strong>
                        </div>
                        {biayaPacking > 0 && (
                          <div className="flex justify-between">
                            <span className="text-brand-black/60">Biaya Packing</span>
                            <strong className="text-brand-black">
                              Rp {biayaPacking.toLocaleString("id-ID")}
                            </strong>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-brand-cream pt-1 my-1 font-bold">
                          <span className="text-brand-black">Total</span>
                          <span className="text-brand-orange">
                            Rp {totalWithPacking.toLocaleString("id-ID")}
                          </span>
                        </div>
                        {dpPaid > 0 && (
                          <div className="flex justify-between text-brand-black/70">
                            <span>DP Dibayar</span>
                            <span>Rp {dpPaid.toLocaleString("id-ID")}</span>
                          </div>
                        )}
                        {lunasPaid > 0 && (
                          <div className="flex justify-between text-brand-black/70">
                            <span>Lunas Dibayar</span>
                            <span>Rp {lunasPaid.toLocaleString("id-ID")}</span>
                          </div>
                        )}
                        {pelunasanPaid > 0 && (
                          <div className="flex justify-between text-brand-black/70">
                            <span>Pelunasan</span>
                            <span>Rp {pelunasanPaid.toLocaleString("id-ID")}</span>
                          </div>
                        )}
                        {sisa > 0 && o.paymentType === "dp" && (
                          <div className="mt-1 flex justify-between border-t border-brand-cream pt-1.5">
                            <span className="font-black text-brand-orange">Sisa</span>
                            <strong className="text-brand-orange">
                              Rp {sisa.toLocaleString("id-ID")}
                            </strong>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="pt-1 text-center text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                      Klik untuk lihat detail 
                    </p>
                  </div>
                </Link>

                {/* Tombol aksi Customer */}
                <div className="flex flex-wrap gap-2 border-t border-brand-cream bg-white px-4 py-3">
                  {o.status === "menunggu_persetujuan" && (
                    <Link
                      href={`/custom/estimasi?id=${o.id}`}
                      onClick={() => setCurrentOrderId(o.id)}
                      className="flex-1 rounded-md bg-brand-orange py-2 text-center text-xs font-black text-white"
                    >
                      Lihat Estimasi
                    </Link>
                  )}
                  {o.status === "menunggu_pembayaran" && (
                    <Link
                      href={`/custom/dp?id=${o.id}`}
                      onClick={() => setCurrentOrderId(o.id)}
                      className="flex-1 rounded-md bg-brand-orange py-2 text-center text-xs font-black text-white"
                    >
                      Bayar DP / Lunas
                    </Link>
                  )}
                  {o.status === "siap_dilunasi" && (
                    <Link
                      href={`/pelunasan/${o.id}`}
                      className="flex-1 animate-pulse rounded-md bg-brand-orange py-2 text-center text-xs font-black text-white shadow"
                    >
                      Lunasi Sekarang
                    </Link>
                  )}
                  {o.status === "dikirim" && (
                    <button
                      onClick={() => void konfirmasiTerima(o.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-500 py-2 text-center text-xs font-black text-white shadow"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Pesanan Diterima
                    </button>
                  )}
                   {(o.status === "menunggu_estimasi" || o.status === "menunggu_persetujuan" || o.status === "menunggu_pembayaran") && (
                    <button
                      onClick={async () => {
                        if (confirm("Yakin batalkan pesanan ini?")) {
                          await cancelOrder(o.id, "Dibatalkan dari riwayat");
                        }
                      }}
                      className="flex-1 rounded-md border-2 border-red-200 bg-white py-2 text-center text-xs font-black text-red-500"
                    >
                      Batalkan
                    </button>
                  )}
                   {o.status === "ditolak" && (
                    <Link
                      href={`/chat?customId=${o.id}`}
                      className="flex-1 rounded-md border-2 border-brand-orange bg-white py-2 text-center text-xs font-black text-brand-orange"
                    >
                      Negosiasi via Chat
                    </Link>
                  )}
                  {(o.status === "menunggu_verifikasi_dp" ||
                    o.status === "menunggu_verifikasi_lunas" ||
                    o.status === "menunggu_verifikasi_pelunasan") && (
                    <div className="flex-1 rounded-md bg-cyan-50 py-2 text-center text-xs font-bold text-cyan-700">
                      Menunggu verifikasi admin
                    </div>
                  )}
                  {o.status === "diproses" && (
                    <div className="flex-1 rounded-md bg-indigo-50 py-2 text-center text-xs font-bold text-indigo-700">
                      Proses pembuatan di workshop
                    </div>
                  )}
                  {o.status === "selesai" && (
                    <div className="flex-1 rounded-md bg-green-50 py-2 text-center text-xs font-bold text-green-700">
                      Order selesai
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}