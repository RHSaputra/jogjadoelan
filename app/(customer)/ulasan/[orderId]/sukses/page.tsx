"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  ChevronLeft,
  Edit3,
  ShoppingCart,
  Star,
  Package,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/lib/auth-context";
import { getOrder } from "@/lib/orders-storage";
import { canEditUlasan, getUlasanByOrder, type Ulasan } from "@/lib/ulasan-helpers";
import type { Order } from "@/lib/orders-storage";

export default function UlasanSuksesPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  /* 1. Ambil data pesanan */
  const [order, setOrder] = useState<Order | null>(null);
  const [ulasan, setUlasan] = useState<(Ulasan & { files?: { url: string; type: string }[]; balasanAdmin?: string }) | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const [o, u] = await Promise.all([
        getOrder(user.id, orderId),
        getUlasanByOrder(user.id, orderId),
      ]);
      if (cancelled) return;
      setOrder(o);
      // Adapt UlasanDTO -> shape used in this page
      setUlasan(u ? { ...u, balasanAdmin: u.balasan ?? undefined, files: (u.foto ?? []).map((f) => ({ url: f.url, type: f.type })) } : null);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id, orderId]);

  const item0 = order?.items[0];
  const editable = ulasan ? canEditUlasan(ulasan as Ulasan) : false;

  /* 3. Logika Pintar "Beli Lagi" */
  const buyAgainUrl = useMemo(() => {
    if (!item0) return "/";

    // Mengecek apakah produk ini adalah produk custom
    const isCustom = String(item0.productId).toLowerCase().includes("custom") || item0.nama.toLowerCase().includes("custom");

    if (isCustom) {
      // Kita kirim spesifikasi dari item0 ke halaman /custom lewat URL Params
      const params = new URLSearchParams();
      if (item0.ukuran) params.set("ukuran", item0.ukuran);
      // Asumsi ada spesifikasi tambahan yang tersimpan di data order:
      // (Komentari/hapus yang tidak ada di struktur data item0 kamu)
      // if (item0.warna) params.set("warna", item0.warna); 
      // if (item0.finishing) params.set("finishing", item0.finishing);
      // if (item0.jenis) params.set("jenis", item0.jenis);
      // if (item0.strap) params.set("strap", item0.strap);

      params.set("reorder", "true");

      return `/custom?${params.toString()}`;
    }

    return `/produk/${item0.productId}`;
  }, [item0]);

  /* Proteksi Halaman */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?next=" + encodeURIComponent(`/ulasan/${orderId}/sukses`));
    } else if (loaded && !ulasan) {
      router.replace(`/ulasan/${orderId}`);
    }
  }, [isLoading, isAuthenticated, loaded, ulasan, router, orderId]);

  if (isLoading || !isAuthenticated || !ulasan || !item0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-brand-cream-light px-4 pb-36 pt-6 sm:pt-8">
      
      {/* Header Sukses */}
      <div className="mb-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-brand-black sm:text-3xl">
          Ulasan Terkirim!
        </h1>
        <p className="mt-2 text-sm text-brand-black/50">
          Terima kasih sudah berbagi pengalaman. Ulasanmu sangat membantu kami!
        </p>
      </div>

      <div className="space-y-6">
        {/* Card Tampilan Ulasan */}
        <Card className="overflow-hidden rounded-[24px] border border-brand-krem bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-brand-cream pb-4">
            <h3 className="text-sm font-bold text-brand-black">Ulasanmu</h3>
            <span className="rounded-full bg-brand-cream-light px-3 py-1 text-[11px] font-bold text-brand-black/40">
              Baru Saja
            </span>
          </div>

          <div className="mb-4 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-6 w-6 ${
                  n <= ulasan.rating
                    ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]"
                    : "fill-gray-100 text-gray-200"
                }`}
              />
            ))}
          </div>

          <div className="rounded-2xl bg-brand-cream-light/50 p-4">
            <p className="text-sm leading-relaxed text-brand-black/80 italic">
              &quot;{ulasan.komentar}&quot;
            </p>
          </div>
          
          {ulasan.balasanAdmin && (
            <div className="mt-4 rounded-xl border border-brand-orange/20 bg-orange-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange mb-1">
                Balasan Admin Jogjadoelan:
              </p>
              <p className="text-sm italic text-brand-black/80">
                &quot;{ulasan.balasanAdmin}&quot;
              </p>
            </div>
          )}

          {ulasan.files && ulasan.files.length > 0 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {ulasan.files.map((file, i) => (
                <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-brand-krem">
                  {file.type === "image" ? (
                    <Image src={file.url} alt="Review" width={80} height={80} className="h-full w-full object-cover" />
                  ) : (
                    <video src={file.url} className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card Produk & Tombol Beli Lagi Pintar */}
        <Card className="overflow-hidden rounded-[24px] border border-brand-krem bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange/10">
              <Package className="h-4 w-4 text-brand-orange" />
            </div>
            <h3 className="text-sm font-bold text-brand-black">Produk yang Pesanan</h3>
          </div>

          <div className="flex flex-col gap-4 rounded-[20px] bg-brand-cream-light/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-brand-krem bg-white">
                {item0.gambar ? (
                  <Image src={item0.gambar} alt={item0.nama} fill className="object-cover" />
                ) : (
                  <div className="h-full w-full bg-brand-krem" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="line-clamp-1 text-sm font-bold text-brand-black">
                  {item0.nama}
                </h4>
                <p className="mt-1 text-xs text-brand-black/50">
                  Varian: {item0.ukuran ?? "-"}
                </p>
              </div>
            </div>

            <Link href={buyAgainUrl} className="w-full sm:w-auto">
              <Button className="h-11 w-full rounded-xl bg-brand-orange text-sm font-bold text-white shadow-md shadow-brand-orange/20 transition-all hover:bg-orange-600 active:scale-95 sm:px-6">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Beli Lagi
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Navigasi Bawah */}
      <div className="mt-10 flex flex-col items-center gap-5">
        {editable ? (
          <Link href={`/ulasan/${orderId}`} className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="h-14 w-full rounded-full border-2 border-brand-krem bg-white px-10 text-sm font-bold text-brand-black hover:border-brand-orange hover:text-brand-orange sm:w-auto"
            >
              <Edit3 className="mr-2 h-5 w-5" />
              Edit Ulasan
            </Button>
          </Link>
        ) : (
          <p className="text-xs font-medium text-brand-black/40">Batas edit ulasan (24 jam) sudah berakhir.</p>
        )}

        <Link
          href={`/pesanan/${orderId}`}
          className="group flex items-center gap-2 text-sm font-bold text-brand-black/60 hover:text-brand-orange transition-colors"
        >
          {/* Tombol Back ini sekarang diam (tidak ada animasi geser) */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-brand-krem shadow-sm">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Kembali ke Detail Pesanan
        </Link>
      </div>
    </div>
  );
}