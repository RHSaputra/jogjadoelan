"use client";

import { logger } from "@/lib/logger";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  MessageCircle,
  Palette,
  Wallet,
  AlertCircle,
  Camera,
  Video,
  Eye,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useCustomOrder,
  CUSTOM_STATUS_LABEL,
  CUSTOM_STATUS_COLOR,
  type CustomOrder,
} from "@/lib/custom-order-context";

type CustomOrderWithProduksi = CustomOrder & {
  hasilProduksi?: Array<{ url: string; type: "image" | "video" }>;
  konfirmasiDiterimaAt?: string | number | null;
  deliveredAt?: string | number | null;
};

export default function CustomOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { getOrderById, setCurrentOrderId, cancelOrder, ordersLoading } = useCustomOrder();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const now = useSyncExternalStore(
    () => () => {},
    () => Date.now(),
    () => 0,
  );
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeMedia, setActiveMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(`/custom/${id}`)}`,
      );
    }
  }, [mounted, authLoading, isAuthenticated, router, id]);

  if (!mounted || authLoading || ordersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light">
        <p className="text-sm font-bold text-gray-500">Memuat detail pesanan...</p>
      </div>
    );
  }

  const order = id ? getOrderById(id) : undefined;
  if (!order) return notFound();

  const total = order.estimasi?.total ?? 0;
  const dpPaid = order.dpPayment?.amount ?? 0;
  const lunasPaid = order.lunasPayment?.amount ?? 0;
  const pelunasanPaid = order.pelunasanPayment?.amount ?? 0;
  const totalDibayar = dpPaid + lunasPaid + pelunasanPaid;
  const sisa = Math.max(0, total - totalDibayar);

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  const hasilProduksi = (order as CustomOrderWithProduksi).hasilProduksi ?? [];

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black text-brand-black">
              Detail Custom
            </h1>
            <p className="text-[11px] text-brand-black/50">{order.id}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${CUSTOM_STATUS_COLOR[order.status]}`}
          >
            {CUSTOM_STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-3 px-4 py-4">
        {/* === GALERI HASIL PRODUKSI CUSTOM === */}
        {hasilProduksi.length > 0 && (
          <section className="rounded-2xl border-2 border-brand-orange bg-white p-4 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-brand-orange text-white text-[10px] font-black px-3 py-1 rounded-bl-lg">
              BARU
            </div>
            <h2 className="flex items-center gap-2 text-sm font-black text-brand-black">
              <Camera className="h-4 w-4 text-brand-orange" />
              Hasil Production Custom Anda
            </h2>
            <p className="mt-1 text-[11px] text-brand-black/60">
              Pesanan helm custom Anda telah selesai! Silakan periksa hasil dokumentasi foto dan video dari tim kami sebelum paket dikirim.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {hasilProduksi.map((media, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveMedia(media)}
                  className="group relative aspect-square w-full overflow-hidden rounded-xl border border-brand-cream bg-brand-cream-light"
                >
                  {media.type === "image" ? (
                    <Image
                      src={media.url}
                      alt={`Hasil ${i + 1}`}
                      width={0}
                      height={0}
                      sizes="300px"
                      className="h-full w-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="relative h-full w-full">
                      <video src={media.url} className="h-full w-full object-cover opacity-80" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur">
                          <Video className="h-4 w-4 text-brand-orange ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-cream pb-3">
            <div className="flex items-center gap-2 text-xs text-brand-black/60">
              <Calendar className="h-3.5 w-3.5" />
              Dibuat {fmtDate(order.createdAt)}
            </div>

            {/* LOGIKA WAKTU ESTIMASI PENGERJAAN REALTIME & DINAMIS */}
            {order.estimasi && (() => {
              const totalHari = order.estimasi.items.reduce((s, x) => s + (x.hari ?? 0), 0);
              const durasiEstimasi = Math.max(5, Math.min(21, totalHari));

              let labelEstimasi = `Estimasi Jadi: ± ${durasiEstimasi} Hari`;
              let styleClass = "bg-amber-50 text-amber-800 ring-amber-200";

              // KONDISI 1: Sudah Selesai Diproduksi
              const finishedStatuses = ["siap_dilunasi", "selesai_produksi", "dikirim", "selesai"];
              if (finishedStatuses.includes(order.status)) {
                labelEstimasi = "Produksi Selesai ✅";
                styleClass = "bg-green-50 text-green-700 ring-green-200";
              }
              // KONDISI 2: Sedang Diproduksi (DP / Lunas sudah diverifikasi)
              else if (order.status === "diproses" && order.dpPayment?.at) {
                // Hitung batas selesai berdasarkan waktu DP + Durasi Hari (dikonversi ke Milidetik)
                const targetSelesai = order.dpPayment.at + (durasiEstimasi * 24 * 60 * 60 * 1000);
                const selisihMs = now - targetSelesai;

                if (selisihMs > 0) {
                  // Telat
                  const hariTelat = Math.ceil(selisihMs / (1000 * 60 * 60 * 24));
                  labelEstimasi = `Telat ${hariTelat} Hari`;
                  styleClass = "bg-red-50 text-red-700 ring-red-200 animate-pulse";
                } else {
                  // Masih jalan progress
                  const sisaHari = Math.ceil(Math.abs(selisihMs) / (1000 * 60 * 60 * 24));
                  const hariBerjalan = durasiEstimasi - sisaHari;
                  labelEstimasi = `Proses: Hari ke-${Math.max(1, hariBerjalan)} dari ${durasiEstimasi} Hari`;
                  styleClass = "bg-blue-50 text-blue-700 ring-blue-200";
                }
              }

              return (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${styleClass}`}>
                  <Clock className="h-3.5 w-3.5" />
                  {labelEstimasi}
                </span>
              );
            })()}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Field label="Jenis Helm" value={order.jenis} />
            <Field label="Ukuran" value={order.ukuran} />
            <Field label="Finishing" value={order.finishing} />
            <Field label="Strap" value={order.strap} />
            <Field label="Bahan" value={order.bahan} />
            <Field label="Aksesoris" value={order.aksesoris} />
            <Field label="Motif Cover Busa" value={order.motifBusa} />
          </div>
        </section>

        {order.warnaList.length > 0 && (
          <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-brand-black">
              <Palette className="h-4 w-4 text-brand-orange" />
              Kombinasi Warna ({order.warnaList.length})
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {order.warnaList.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-brand-cream bg-brand-cream-light px-2.5 py-1.5"
                >
                  <div
                    className="h-5 w-5 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: w.hex }}
                  />
                  <span className="text-xs font-bold text-brand-black">
                    {w.nama || w.hex}
                  </span>
                </div>
              ))}
            </div>
            {order.warnaCatatan && (
              <p className="mt-2 rounded-lg bg-brand-cream-light p-2 text-xs italic text-brand-black/70">
                Catatan: {order.warnaCatatan}
              </p>
            )}
          </section>
        )}

        {order.referensiFiles.length > 0 && (
          <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-brand-black">
              <FileText className="h-4 w-4 text-brand-orange" />
              Referensi Desain ({order.referensiFiles.length})
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {order.referensiFiles.map((f, i) =>
                f.dataUrl ? (
                  <Image
                    key={i}
                    src={f.dataUrl}
                    alt={f.name}
                    width={0}
                    height={0}
                    sizes="200px"
                    className="aspect-square w-full rounded-lg border object-cover"
                  />
                ) : (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center rounded-lg border bg-brand-cream-light text-[10px] text-brand-black/60"
                  >
                    {f.name}
                  </div>
                ),
              )}
            </div>
          </section>
        )}

        {order.notes && (
          <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-brand-black">
              Catatan Tambahan
            </h2>
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-brand-cream-light p-3 text-xs text-brand-black/80">
              {order.notes}
            </p>
          </section>
        )}

        {order.estimasi && (
          <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-brand-black">
              <Wallet className="h-4 w-4 text-brand-orange" />
              Rincian Biaya
            </h2>

            <ul className="mt-4 space-y-2 text-xs">
              {order.estimasi.items.map((it, i) => (
                <li key={i} className="flex justify-between items-start">
                  <span className="text-brand-black/70">
                    {it.label}
                    {it.sub && (
                      <span className="text-brand-black/50"> · {it.sub}</span>
                    )}
                    {(it.hari ?? 0) > 0 && (
                      <span className="ml-1 text-[9px] font-bold text-amber-600">
                        (+{it.hari} hari)
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-brand-black whitespace-nowrap ml-2">
                    {fmtRp(it.harga)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-brand-cream pt-3">
              <span className="text-sm font-bold text-brand-black">
                Total Estimasi Biaya
              </span>
              <span className="text-base font-black text-brand-orange">
                {fmtRp(total)}
              </span>
            </div>
          </section>
        )}

        {/* BARU (Batch E): Tanggal konkret produksi */}
        {order.estimasiTanggal && (
          <div className="mt-3 rounded-xl border-2 border-blue-100 bg-blue-50/50 p-3 text-xs">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700">
              📅 Janji Produksi Admin
            </p>
            <p className="mt-1 text-zinc-700">
              Mulai <b>{new Date(order.estimasiTanggal.mulai + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long" })}</b>
              {" → siap "}
              <b>{new Date(order.estimasiTanggal.selesai + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</b>
            </p>
          </div>
        )}

        {/* BARU (Batch E): Progress produksi dari admin */}
        {(order.progressUpdates?.length ?? 0) > 0 && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-800">
              📸 Update Progress dari Admin
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-[#FF6B1A]">
                {order.progressUpdates?.length ?? 0}
              </span>
            </p>
            <div className="space-y-3">
              {[...(order.progressUpdates ?? [])].reverse().map((p) => (
                <div key={p.id} className="flex gap-3 border-b border-dashed border-zinc-100 pb-3 last:border-0 last:pb-0">
                  {p.fotoUrl && (
                    <Image src={p.fotoUrl} alt={p.tahap} width={80} height={80} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-black text-zinc-800">{p.tahap}</p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(p.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {p.deskripsi && <p className="mt-1 whitespace-pre-line text-zinc-600">{p.deskripsi}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(dpPaid > 0 || lunasPaid > 0 || pelunasanPaid > 0) && (
          <section className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-brand-black">
              <CreditCard className="h-4 w-4 text-brand-orange" />
              Riwayat Pembayaran
            </h2>
            <ul className="mt-3 space-y-2 text-xs">
              {dpPaid > 0 && (
                <PaymentRow label="DP" amount={dpPaid} at={order.dpPayment?.at} />
              )}
              {lunasPaid > 0 && (
                <PaymentRow
                  label="Lunas (Full)"
                  amount={lunasPaid}
                  at={order.lunasPayment?.at}
                />
              )}
              {pelunasanPaid > 0 && (
                <PaymentRow
                  label="Pelunasan"
                  amount={pelunasanPaid}
                  at={order.pelunasanPayment?.at}
                />
              )}
            </ul>
            {order.paymentType === "dp" && sisa > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2">
                <span className="text-xs font-bold text-brand-orange">
                  Sisa Pelunasan
                </span>
                <span className="text-sm font-black text-brand-orange">
                  {fmtRp(sisa)}
                </span>
              </div>
            )}
          </section>
        )}

        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-wrap gap-2">
            {order.status === "menunggu_persetujuan" && (
              <Link
                href={`/custom/estimasi?id=${order.id}`}
                onClick={() => setCurrentOrderId(order.id)}
                className="flex-1 rounded-md bg-brand-orange py-2.5 text-center text-sm font-black text-white shadow"
              >
                Lihat Estimasi
              </Link>
            )}
            {order.status === "menunggu_pembayaran" && (
              <Link
                href={`/custom/dp?id=${order.id}`}
                onClick={() => setCurrentOrderId(order.id)}
                className="flex-1 rounded-md bg-brand-orange py-2.5 text-center text-sm font-black text-white shadow"
              >
                Bayar DP / Lunas
              </Link>
            )}
            {order.status === "siap_dilunasi" && (
              <Link
                href={`/pelunasan/${order.id}`}
                className="flex-1 animate-pulse rounded-md bg-brand-orange py-2.5 text-center text-sm font-black text-white shadow"
              >
                Lunasi Sekarang
              </Link>
            )}
          </div>

          {(order.status === "menunggu_estimasi" || order.status === "menunggu_persetujuan" || order.status === "menunggu_pembayaran") && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="mt-1 w-full rounded-md border-2 border-red-200 bg-white py-2 text-xs font-bold text-red-500 transition hover:bg-red-50"
            >
              Batalkan Pesanan
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-brand-cream pt-2">
            <Link
              href={`/chat?customId=${order.id}`}
              className="flex items-center justify-center gap-1.5 rounded-md border-2 border-brand-orange bg-white py-2.5 text-[11px] font-black text-brand-orange transition hover:bg-orange-50"
            >
              <MessageCircle className="h-4 w-4" />
              Chat Admin
            </Link>

            {(() => {
              const waktuSelesai = (order as CustomOrderWithProduksi).konfirmasiDiterimaAt || (order as CustomOrderWithProduksi).deliveredAt || order.createdAt;
              const isGaransiAktif = order.status === "selesai"
                ? (now - new Date(waktuSelesai).getTime()) / (1000 * 60 * 60) < 72
                : true;

              const showKomplain = order.status !== "ditolak" && order.status !== "dibatalkan" && isGaransiAktif;

              if (!showKomplain) return null;

              return (
                <Link
                  href={`/komplain/baru?orderId=${order.id}`}
                  className="flex items-center justify-center gap-1.5 rounded-md border-2 border-red-200 bg-white py-2.5 text-[11px] font-black text-red-600 transition hover:border-red-300 hover:bg-red-50"
                >
                  <AlertCircle className="h-4 w-4" />
                  {order.status === "selesai" ? "Klaim Garansi" : "Komplain"}
                </Link>
              );
            })()}
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-black text-brand-black">Batalkan Pesanan?</h3>
            <p className="mt-2 text-sm text-brand-black/70">
              Apakah Anda yakin ingin membatalkan pesanan custom ini? Tindakan ini tidak dapat diubah kembali.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-xl border-2 border-brand-cream bg-white py-2.5 text-sm font-bold text-brand-black hover:bg-gray-50"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await cancelOrder(order.id, "Dibatalkan oleh pelanggan");
                  } catch (e) {
                    logger.error("[custom] cancel gagal:", e);
                  }
                  setShowCancelModal(false);
                }}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow hover:bg-red-700"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FULLSCREEN UNTUK LIHAT FOTO/VIDEO HASIL JADI */}
      {activeMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => setActiveMedia(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/40"
            onClick={() => setActiveMedia(null)}
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl" onClick={e => e.stopPropagation()}>
            {activeMedia.type === "image" ? (
              <Image src={activeMedia.url} alt="Detail Hasil" width={0} height={0} sizes="100vw" className="w-full h-auto object-contain max-h-[85vh]" />
            ) : (
              <video src={activeMedia.url} controls autoPlay className="w-full h-auto max-h-[85vh] rounded-xl outline-none" />
            )}
          </div>
        </div>
      )}

    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-black/50">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-brand-black">{value}</p>
    </div>
  );
}

function PaymentRow({
  label,
  amount,
  at,
}: {
  label: string;
  amount: number;
  at?: number;
}) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-brand-cream-light px-3 py-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <div>
          <p className="font-bold text-brand-black">{label}</p>
          {at && (
            <p className="text-[10px] text-brand-black/50">
              {new Date(at).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
      <span className="font-black text-brand-black">
        Rp {amount.toLocaleString("id-ID")}
      </span>
    </li>
  );
}