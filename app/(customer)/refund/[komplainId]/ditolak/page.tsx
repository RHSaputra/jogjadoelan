"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, XCircle, MessageCircle, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useKomplain } from "@/lib/komplain-context";
import {
  getRefundByKomplain,
  type Refund,
} from "@/lib/refund-helpers";

export default function RefundDitolakPage() {
  const { komplainId } = useParams<{ komplainId: string }>();
  const { user } = useAuth();
  const { get: getKomplain } = useKomplain();
  const [refund, setRefund] = useState<Refund | null>(null);

  const k = useMemo(() => getKomplain(komplainId), [getKomplain, komplainId]);


  useEffect(() => {
  if (!user?.id) {
    void Promise.resolve().then(() => setRefund(null));
    return;
  }

  let active = true;

  async function loadRefund() {
    const data = await getRefundByKomplain(komplainId);

    if (active) {
      setRefund(data);
    }
  }

  void loadRefund();

  return () => {
    active = false;
  };
}, [user?.id, komplainId]);

  if (!refund) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-sm text-zinc-500">
        <Link
          href="/tukar"
          className="mb-4 inline-flex items-center text-sm text-zinc-600"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Link>
        Memuat…
      </div>
    );
  }

  const ajukanLagiHref = `/komplain/baru?orderId=${encodeURIComponent(
    k?.orderId ?? refund.orderId,
  )}`;

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      {/* Header Premium Style */}
      <div className="sticky top-0 z-30 border-b border-brand-cream bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
          <Link
            href={`/komplain/${komplainId}`}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-brand-cream-light transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-brand-black" />
          </Link>
          <h1 className="text-base font-black text-brand-black">Detail Refund</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* === BANNER REJECTED === */}
        <Card className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <XCircle className="mx-auto mb-3 h-14 w-14 text-red-600" />
          <h1 className="text-sm font-black text-red-900 uppercase tracking-widest">Refund Ditolak</h1>
          <p className="mt-2 text-xs text-red-800 leading-relaxed">
            Setelah meninjau data rekening atau bukti pengembalian Anda, admin menolak pengajuan refund ini.
          </p>
          {refund.rejectReason && (
            <div className="mt-4 rounded-xl bg-white p-4 text-left text-xs text-red-900 shadow-sm border border-red-100">
              <div className="font-black uppercase tracking-wider text-[10px] mb-1">Alasan dari admin:</div>
              <p className="leading-relaxed">{refund.rejectReason}</p>
            </div>
          )}
        </Card>

        {/* === DETAIL REKENING === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm space-y-3">
          <div className="text-[11px] font-black uppercase tracking-widest text-brand-black/40 mb-1">
            Data Rekening Pengembalian Dana
          </div>
          <div className="text-xs space-y-1.5 text-brand-black/80">
            <div className="flex justify-between border-b border-brand-cream/50 pb-1.5">
              <span className="font-bold text-brand-black/40 uppercase text-[10px]">Nama Pemilik</span>
              <span className="font-bold text-brand-black">{refund.atasNama}</span>
            </div>
            <div className="flex justify-between border-b border-brand-cream/50 pb-1.5">
              <span className="font-bold text-brand-black/40 uppercase text-[10px]">Bank / E-Wallet</span>
              <span className="font-bold text-brand-black">{refund.namaBank}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-brand-black/40 uppercase text-[10px]">No. Rekening</span>
              <span className="font-mono font-black text-brand-black">{refund.noRek}</span>
            </div>
          </div>
        </Card>

        {/* === NOMINAL REFUND === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="text-[11px] font-black uppercase tracking-widest text-brand-black/40">Nominal Refund</div>
          <div className="text-sm font-black text-brand-orange">
            {refund.nominalRefund? (
              <span>Rp {refund.nominalRefund.toLocaleString("id-ID")}</span>
            ) : (
              <span className="italic text-brand-black/30 font-bold">Belum sempat ditetapkan</span>
            )}
          </div>
        </Card>

        {/* === INFO LANJUTAN === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
          <p className="text-xs font-medium leading-relaxed text-brand-black/70">
            Pengajuan refund ini sudah ditolak dan tidak bisa dilanjutkan.
            Anda bisa mengajukan komplain baru untuk pesanan yang sama jika
            ada bukti tambahan, atau hubungi admin via chat untuk klarifikasi.
          </p>
          <p className="mt-3 text-[11px] text-brand-black/50 font-medium">
            Komplain lama (<span className="font-mono">{komplainId}</span>) tetap
            tersimpan dengan status <strong>Ditolak</strong> sebagai riwayat.
          </p>
        </Card>

        {/* === CTA ACTIONS === */}
        <Card className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm space-y-3">
          <Link href={ajukanLagiHref} className="block">
            <Button className="w-full rounded-full bg-brand-orange hover:bg-brand-orange-dark h-12 text-[11px] font-black text-white uppercase tracking-widest shadow-md">
              <RotateCcw className="mr-2 h-4 w-4" /> Ajukan Komplain Baru
            </Button>
          </Link>
          <Link href={`/chat?komplainId=${komplainId}`} className="block">
            <Button variant="outline" className="w-full rounded-full border-2 border-brand-black bg-white h-12 text-[11px] font-black text-brand-black hover:bg-brand-black hover:text-white uppercase tracking-widest">
              <MessageCircle className="mr-2 h-4 w-4" /> Hubungi Admin
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}