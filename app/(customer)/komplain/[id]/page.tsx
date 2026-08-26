"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  Hourglass,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Clock,
  X,
  ZoomIn,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getOrder, formatTanggalJamID } from "@/lib/orders-storage";
import {
  useKomplain,
  KOMPLAIN_TINDAKAN_LABEL,
  resolveKomplainStatusInfo,
} from "@/lib/komplain-context";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/keys";

/* L4: status di mana customer TIDAK boleh cancel langsung dari halaman ini
   karena sudah masuk pipeline refund/tukar dengan kontrol khusus. */
const NON_CANCELABLE_STATUS = new Set([
  "berhasil",
  "ditolak",
  "dibatalkan",
  "menunggu_review_admin",
  "menunggu_balikan",
  "diproses",
]);

export default function KomplainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const {
    get,
    cancel,
    hydrated,
  } = useKomplain();

  const k = useMemo(() => get(id), [get, id]);
  const [order, setOrder] = useState<Awaited<ReturnType<typeof getOrder>>>(null);
  useEffect(() => {
    if (!k || !user?.id) {
      void Promise.resolve().then(() => setOrder(null));
      return;
    }
    let c = false;
    (async () => { const o = await getOrder(user.id, k.orderId); if (!c) setOrder(o); })();
    return () => { c = true; };
  }, [k, user?.id]);

  const qc = useQueryClient();
  const [preview, setPreview] = useState<string | null>(null);

  // Subscribe to real-time complaint chat updates via Pusher
  useEffect(() => {
    if (!id || !hydrated) return;
    let active = true;
    let pusherClient: import("pusher-js").default | null = null;
    let channel: import("pusher-js").Channel | null = null;

    (async () => {
      try {
        const Pusher = (await import("pusher-js")).default;
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "f3e9ef9647495d6eb53f";
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";
        pusherClient = new Pusher(key, { cluster, authEndpoint: "/api/pusher/auth" });
        channel = pusherClient.subscribe(`private-komplain-${id}`);

        channel.bind("message", () => {
          if (!active) return;
          // Invalidate React Query cache to load new messages and status updates
          qc.invalidateQueries({ queryKey: qk.komplain.list() });
        });

        // Status change event — admin melakukan accept/reject/approve/dll tanpa chat
        // Trigger invalidate agar customer langsung lihat status terbaru tanpa refresh
        channel.bind("status-change", () => {
          if (!active) return;
          qc.invalidateQueries({ queryKey: qk.komplain.list() });
        });
      } catch (e) {
        console.error("Pusher connection failed in customer komplain", e);
      }
    })();

    return () => {
      active = false;
      try {
        if (channel) channel.unbind_all();
        if (pusherClient) {
          pusherClient.unsubscribe(`private-komplain-${id}`);
          pusherClient.disconnect();
        }
      } catch {}
    };
  }, [id, hydrated, qc]);



  /* Tunggu hydration sebelum render apa pun */
  if (!hydrated) {
    return <div className="min-h-screen bg-brand-cream-light" />;
  }

  if (!k) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-zinc-500">
        <Link
          href="/pesanan"
          className="mb-4 inline-flex items-center text-sm text-zinc-600"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Link>
        <p>Komplain tidak ditemukan.</p>
      </div>
    );
  }

  /* S2: tindakan "komplain_saja" tidak punya formulir lanjutan */
  const adaForm = k.tindakan === "refund" || k.tindakan === "tukar";
  const tindakanLabel = KOMPLAIN_TINDAKAN_LABEL[k.tindakan] ?? k.tindakan;
  const showCancel = !NON_CANCELABLE_STATUS.has(k.status);

  /* Tujuan halaman pipeline (sukses page punya simulator admin Setujui/Tolak) */
  const pipelineHref =
    k.tindakan === "refund"
      ? `/refund/${k.id}/sukses`
      : k.tindakan === "tukar"
        ? `/tukar/${k.id}/sukses`
        : null;

  return (
    <div className="min-h-screen bg-brand-cream-light pb-20">
      {/* Header Signature Style */}
      <div className="sticky top-0 z-30 border-b border-brand-cream bg-white/80 backdrop-blur-md">
       <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
          <button 
            onClick={() => router.back()} 
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-brand-cream-light transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-brand-black" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-brand-black">Detail Komplain</h1>
            <p className="text-[10px] font-bold text-brand-black/40 uppercase tracking-widest">{k.id}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* Header status */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black text-brand-black/40 uppercase tracking-widest">Kode Komplain</div>
              <div className="font-mono text-sm font-black text-brand-orange">{k.id}</div>
            </div>
            {(() => {
              const info = resolveKomplainStatusInfo(k);
              return (
                <Badge className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${info.color}`}>
                  {info.label}
                </Badge>
              );
            })()}
          </div>
        </Card>

        {/* === STATUS BANNER === */}
        {(k.status === "baru" || k.status === "ditinjau") && (
          <Card className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 text-center shadow-sm">
            <Hourglass className="mx-auto mb-2 h-10 w-10 text-blue-600" />
            <h2 className="text-sm font-black text-blue-900 uppercase tracking-wider">
              Menunggu Admin Meninjau
            </h2>
            <p className="mt-1 text-xs text-blue-800">
              Pengajuan Anda sedang diperiksa. Proses biasanya 1–2 jam pada hari kerja.
            </p>
          </Card>
        )}

        {k.status === "disetujui" && (
          <Card className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
            <h2 className="text-sm font-black text-emerald-900 uppercase tracking-wider">
              {adaForm ? "Komplain Disetujui" : "Laporan Diterima"}
            </h2>
            <p className="mt-1 text-xs text-emerald-800">
              {k.tindakan === "refund" &&
                "Refund sudah disetujui. Silakan isi formulir refund."}
              {k.tindakan === "tukar" &&
                "Tukar sudah disetujui. Silakan isi formulir tukar."}
              {k.tindakan === "komplain_saja" &&
                "Terima kasih, laporan Anda sudah ditindaklanjuti admin. Tidak ada langkah tambahan yang perlu dilakukan."}
            </p>
            {adaForm && (
              <Link
                href={k.tindakan === "refund" ? `/refund/${k.id}` : `/tukar/${k.id}`}
                className="mt-4 inline-block w-full"
              >
                <Button className="w-full rounded-full bg-brand-orange hover:bg-brand-orange-dark shadow-md text-xs font-black uppercase tracking-widest h-12">
                  Isi Formulir {k.tindakan === "refund" ? "Refund" : "Tukar"}
                </Button>
              </Link>
            )}
          </Card>
        )}

        {/* === BANNER BARU: menunggu_review_admin === */}
        {k.status === "menunggu_review_admin" && (
          <Card className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 text-center shadow-sm">
            <Clock className="mx-auto mb-2 h-10 w-10 text-amber-600" />
            <h2 className="text-sm font-black text-amber-900 uppercase tracking-wider">
              Menunggu Verifikasi Admin
            </h2>
            <p className="mt-1 text-xs text-amber-800">
              {k.tindakan === "refund"
                ? "Data refund Anda sudah masuk. Admin akan memverifikasi & menetapkan nominal refund."
                : k.tindakan === "tukar"
                  ? "Pengajuan tukar Anda sudah masuk. Admin akan memverifikasi ketersediaan stok varian pengganti."
                  : "Pengajuan Anda sedang ditinjau admin."}
            </p>
            {pipelineHref && (
              <Link href={pipelineHref} className="mt-4 inline-block w-full">
                <Button variant="outline" className="w-full rounded-full border-amber-500 text-amber-800 bg-white hover:bg-amber-100 text-xs font-black uppercase tracking-widest h-12">
                  Lihat Detail Pengajuan
                </Button>
              </Link>
            )}
          </Card>
        )}

        {/* === BANNER: menunggu_balikan / diproses → progress pipeline === */}
        {(k.status === "menunggu_balikan" || k.status === "diproses") && (
          <Card className="rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-5 text-center shadow-sm">
            <Hourglass className="mx-auto mb-2 h-10 w-10 text-cyan-600" />
            <h2 className="text-sm font-black text-cyan-900 uppercase tracking-wider">
              {k.status === "menunggu_balikan"
                ? "Menunggu Pengiriman Balik"
                : "Sedang Diproses"}
            </h2>
            <p className="mt-1 text-xs text-cyan-800">
              {k.tindakan === "refund"
                ? "Cek halaman refund untuk update status & bukti transfer dari admin."
                : "Cek halaman tukar untuk update pengiriman & resi."}
            </p>
            {pipelineHref && (
              <Link href={pipelineHref} className="mt-4 inline-block w-full">
                <Button className="w-full rounded-full bg-brand-orange hover:bg-brand-orange-dark shadow-md text-xs font-black uppercase tracking-widest h-12">
                  Lihat Detail Pengajuan
                </Button>
              </Link>
            )}
          </Card>
        )}

        {k.status === "ditolak" && (
          <Card className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 flex-shrink-0 text-red-600" />
              <div>
                <h2 className="text-sm font-black text-red-900 uppercase tracking-wider">
                  {tindakanLabel} ditolak penjual
                </h2>
                <p className="mt-1 text-xs text-red-800">
                  Silakan negosiasi atau tanyakan kelanjutan via chat. Anda juga
                  bisa mengajukan komplain baru untuk pesanan yang sama.
                </p>
                {k.penolakan?.alasan && (
                  <p className="mt-3 rounded-xl bg-white p-3 text-xs text-red-700 shadow-sm">
                    <strong className="block mb-1">Alasan Penolakan:</strong> {k.penolakan.alasan}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {k.status === "berhasil" && (
          <Card className="rounded-2xl border-2 border-green-200 bg-green-50 p-5 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-600" />
            <h2 className="text-sm font-black text-green-900 uppercase tracking-wider">
              {adaForm ? `${tindakanLabel} Berhasil` : "Komplain Selesai"}
            </h2>
            {adaForm && pipelineHref && (
              <Link href={pipelineHref} className="mt-4 inline-block w-full">
                <Button variant="outline" className="w-full rounded-full border-green-500 text-green-700 bg-white hover:bg-green-100 text-xs font-black uppercase tracking-widest h-12">
                  Lihat Detail
                </Button>
              </Link>
            )}
          </Card>
        )}

        {/* === DETAIL KOMPLAIN === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-black/40">Detail Komplain</h3>
          <div>
            <div className="text-[10px] font-bold text-brand-black/60 uppercase">Jenis Kendala</div>
            <div className="mt-0.5 text-sm font-black text-brand-black">{k.jenisLabel}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-brand-black/60 uppercase">Tindakan Diminta</div>
            <div className="mt-0.5 text-sm font-black text-brand-orange uppercase italic">{tindakanLabel}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-brand-black/60 uppercase">Deskripsi</div>
            <p className="mt-1 text-sm text-brand-black/80 leading-relaxed bg-brand-cream-light/30 p-3 rounded-xl border border-brand-cream">
              &quot;{k.deskripsi}&quot;
            </p>
          </div>
          {k.files.length > 0 && (
            <div>
              <div className="mb-2 text-[10px] font-bold text-brand-black/60 uppercase">Bukti Lampiran</div>
              <div className="grid grid-cols-4 gap-2">
                {k.files.map((f, i) =>
                  f.type === "image" ? (
                    <button
                      key={i}
                      onClick={() => f.url && setPreview(f.url)}
                      className="group relative aspect-square w-full overflow-hidden rounded-xl border-2 border-brand-cream object-cover shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.url}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                        <ZoomIn className="h-4 w-4 text-white" />
                      </span>
                    </button>
                  ) : (
                    <video
                      key={i}
                      src={f.url}
                      controls
                      className="aspect-square w-full rounded-xl border-2 border-brand-cream object-cover shadow-sm"
                    />
                  ),
                )}
              </div>
            </div>
          )}
          <div className="text-[10px] text-brand-black/40 font-bold border-t border-brand-cream pt-3">
            Diajukan: {formatTanggalJamID(k.createdAt)}
          </div>
        </Card>

        {/* === ORDER REF === */}
        {order && (
          <Card className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-brand-black/40">Pesanan Terkait</h3>
            <div className="flex gap-4">
              {order.items[0]?.gambar ? (
                <Image
                  src={order.items[0].gambar}
                  alt={order.items[0].nama}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-xl border-2 border-brand-cream object-cover shadow-sm"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-brand-cream-light" />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-black text-brand-black">{order.items[0]?.nama}</div>
                <div className="text-xs text-brand-black/60 font-medium">
                  {order.items[0]?.ukuran} · x{order.items[0]?.qty} unit
                </div>
                <Link
                  href={`/pesanan/${order.id}`}
                  className="mt-1 inline-block text-[11px] font-black text-brand-orange hover:underline uppercase"
                >
                  Lihat Detail Pesanan
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* === CTA / Actions === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">

            <Link href={`/chat?komplainId=${k.id}`}>
              <Button variant="outline" className="w-full rounded-full border-2 border-brand-black bg-white h-12 text-[11px] font-black text-brand-black hover:bg-brand-black hover:text-white uppercase tracking-widest">
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat Admin
              </Button>
            </Link>

            {k.status === "disetujui" && adaForm ? (
              <Link
                href={
                  k.tindakan === "refund"
                    ? `/refund/${k.id}`
                    : `/tukar/${k.id}`
                }
              >
                <Button className="w-full rounded-full bg-brand-orange hover:bg-brand-orange-dark h-12 text-[11px] font-black text-white shadow-md uppercase tracking-widest">
                  Isi Form {k.tindakan === "refund" ? "Refund" : "Tukar"}
                </Button>
              </Link>
            ) : showCancel ? (
              <Button
                variant="outline"
                className="w-full rounded-full border-2 border-red-200 bg-white h-12 text-[11px] font-black text-red-600 hover:bg-red-50 uppercase tracking-widest disabled:opacity-50"
                onClick={async () => {
                  if (!confirm("Batalkan komplain ini?")) return;
                  try {
                    await cancel(k.id);
                    toast.success("Pengajuan komplain dibatalkan", {
                      description:
                        "Komplain telah dibatalkan dan tidak akan diproses lebih lanjut.",
                    });
                    router.push("/tukar");
                  } catch (e) {
                    alert(e instanceof Error ? e.message : "Gagal membatalkan");
                  }
                }}
              >
                Batalkan
              </Button>
            ) : (
              <div />
            )}

          </div>
        </Card>

        {/* Ruang chat inline telah dihapus. Customer menggunakan tombol Chat Admin di atas. */}
      </div>

      {/* Lightbox */}
      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <Image src={preview} alt="Preview" width={0} height={0} sizes="100vw" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}