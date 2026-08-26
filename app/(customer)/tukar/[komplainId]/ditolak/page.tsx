"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, XCircle, MessageCircle, RotateCcw, Repeat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useKomplain } from "@/lib/komplain-context";
import {
  getTukarByKomplain,
  type Tukar,
} from "@/lib/tukar-helpers";

export default function TukarDitolakPage() {
  const { komplainId } = useParams<{ komplainId: string }>();
  const { user } = useAuth();
  const { get: getKomplain } = useKomplain();
  const [tukar, setTukar] = useState<Tukar | null>(null);

  const k = useMemo(() => getKomplain(komplainId), [getKomplain, komplainId]);

useEffect(() => {
  if (!user?.id) {
    void Promise.resolve().then(() => setTukar(null));
    return;
  }

  let active = true;

  async function loadTukar() {
    const data = await getTukarByKomplain(komplainId);

    if (active) {
      setTukar(data);
    }
  }

  void loadTukar();

  return () => {
    active = false;
  };
}, [user?.id, komplainId]);

if (!tukar) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-zinc-500">
        <Link
          href="/tukar"
          className="mb-4 inline-flex items-center text-sm text-zinc-600"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Link>
        <p>Memuat…</p>
      </div>
    );
  }

  const ajukanLagiHref = `/komplain/baru?orderId=${encodeURIComponent(
    k?.orderId ?? tukar.orderId,
  )}`;

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      {/* Header Premium */}
      <div className="sticky top-0 z-30 border-b border-brand-cream bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex max-w-md items-center gap-3 px-4 py-3.5">
          <Link
            href={`/komplain/${komplainId}`}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-brand-cream-light transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-brand-black" />
          </Link>
          <h1 className="text-base font-black text-brand-black">Detail Tukar</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-md space-y-4 px-4 pt-4">
        {/* === BANNER REJECTED === */}
        <Card className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <XCircle className="mx-auto mb-3 h-14 w-14 text-red-600" />
          <h1 className="text-sm font-black text-red-900 uppercase tracking-widest">Tukar Ditolak</h1>
          <p className="mt-2 text-xs text-red-800 leading-relaxed">
            Setelah meninjau pengajuan Anda, admin tidak menyetujui tukar ini.
          </p>
          {tukar.rejectReason && (
            <div className="mt-4 rounded-xl bg-white p-4 text-left text-xs text-red-900 shadow-sm border border-red-100">
              <div className="font-black uppercase tracking-wider text-[10px] mb-1">Alasan dari admin:</div>
              <p className="leading-relaxed">{tukar.rejectReason}</p>
            </div>
          )}
        </Card>

        {/* === DETAIL TUKAR === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-black/40">
            <Repeat className="h-4 w-4 text-brand-orange" />
            Detail Tukar Varian
          </div>
          <div className="flex gap-4">
            {tukar.productGambar ? (
              <Image
                src={tukar.productGambar}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl border-2 border-brand-cream object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-brand-cream-light" />
            )}
            <div className="flex-1 text-sm">
              <div className="font-black text-brand-black">{tukar.productNama}</div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center justify-between border-b border-brand-cream/50 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-black/40">Lama</span>
                  <span className="font-bold text-brand-black">
                    {tukar.ukuranLama ?? "-"}
                    {tukar.warnaLama ? ` · ${tukar.warnaLama}` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-black/40">Diminta</span>
                  <span className="font-black text-brand-orange">
                    {tukar.ukuranBaru}
                    {tukar.warnaBaru ? ` · ${tukar.warnaBaru}` : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {tukar.notes && (
            <p className="mt-4 rounded-xl bg-brand-cream-light/30 border border-brand-cream p-3 text-xs text-brand-black/70 italic">
              <strong>Catatan Anda:</strong> {tukar.notes}
            </p>
          )}
          <div className="mt-4 border-t border-brand-cream pt-3 text-[10px] font-bold text-brand-black/40 uppercase tracking-widest">
            Kode Tukar: <span className="font-mono text-brand-black/60">{tukar.id}</span>
          </div>
        </Card>

        {/* === INFO LANJUTAN === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <p className="text-xs font-medium leading-relaxed text-brand-black/70">
            Pengajuan tukar ini sudah ditolak dan tidak bisa dilanjutkan.
            Anda bisa mengajukan komplain baru untuk pesanan yang sama jika
            ada bukti tambahan, atau hubungi admin via chat untuk klarifikasi.
          </p>
          <p className="mt-3 text-[11px] text-brand-black/50 font-medium">
            Komplain lama (<span className="font-mono">{komplainId}</span>) tetap
            tersimpan dengan status <strong>Ditolak</strong> sebagai riwayat.
          </p>
        </Card>

        {/* === C5: CTA Card normal === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm space-y-3">
          <Link href={ajukanLagiHref} className="block">
            <Button className="w-full rounded-full bg-brand-orange hover:bg-brand-orange-dark h-12 text-[11px] font-black text-white uppercase tracking-widest shadow-md">
              <RotateCcw className="mr-2 h-4 w-4" /> Ajukan Komplain Baru
            </Button>
          </Link>
          <Link href={`/komplain/${komplainId}/chat`} className="block">
            <Button variant="outline" className="w-full rounded-full border-2 border-brand-black bg-white h-12 text-[11px] font-black text-brand-black hover:bg-brand-black hover:text-white uppercase tracking-widest">
              <MessageCircle className="mr-2 h-4 w-4" /> Hubungi Admin
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}