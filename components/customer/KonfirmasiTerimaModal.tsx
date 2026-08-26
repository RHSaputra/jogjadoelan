"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Star,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  upsertUlasan,
  containsBadWords,
  sensorBadWords,
} from "@/lib/ulasan-helpers";

import {
  customerKonfirmasiDiterima,
  type Order,
} from "@/lib/orders-storage";

import { invalidateRatingCache } from "@/lib/rating-helpers";

import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  order: Order | null;
  userId: string;
  onDone: () => void;
}

export function KonfirmasiTerimaModal({
  open,
  order,
  userId,
  onDone,
}: Props) {
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const [komentar, setKomentar] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const item0 = order.items[0];

  function handleClose() {
    /* force open */
  }

  async function handleSubmit() {
    setError(null);

    if (rating < 1) {
      setError("Pilih bintang dulu (1–5).");
      return;
    }

    if (komentar.trim().length < 5) {
      setError("Tulis komentar minimal 5 karakter.");
      return;
    }

    const bw = containsBadWords(komentar);

    if (bw.ada) {
      setError(
        `Komentar mengandung kata tidak pantas: ${bw.words.join(", ")}`,
      );

      return;
    }

    if (!item0 || !order) {
      setError("Item pesanan tidak ditemukan.");
      return;
    }

    setSubmitting(true);

    try {
      await upsertUlasan({
        orderId: order.id,
        userId,
        productId: String(item0.productId ?? item0.nama),
        productNama: item0.nama,
        productGambar: item0.gambar ?? null,
        ukuran: item0.ukuran,
        rating,
        komentar: sensorBadWords(komentar.trim()),
        files: [],
      });

      if (!order) throw new Error("Order tidak tersedia");
      await customerKonfirmasiDiterima(userId, order.id);

      invalidateRatingCache();

      onDone();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Gagal menyimpan ulasan.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleIsiLengkap() {
    if (rating < 1) {
      setError("Pilih bintang dulu sebelum lanjut.");
      return;
    }

    if (!order) return;
    customerKonfirmasiDiterima(userId, order.id);

    invalidateRatingCache();

    router.push(`/ulasan/${order.id}?rating=${rating}`);

    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-h-[90vh] max-w-md overflow-y-auto rounded-[28px] border border-brand-krem bg-white p-0 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        {/* TOP */}
        <div className="relative overflow-hidden border-b border-brand-krem bg-gradient-to-b from-brand-orange/10 via-white to-white px-6 pb-5 pt-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange shadow-lg shadow-brand-orange/20">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>

          <DialogHeader className="mt-4 space-y-2">
            <DialogTitle className="text-center text-2xl font-black tracking-tight text-brand-black">
              Pesanan Diterima
            </DialogTitle>

            <DialogDescription className="mx-auto max-w-sm text-center text-sm leading-relaxed text-zinc-600">
              Sebelum pesanan diselesaikan, bantu beri ulasan singkat
              untuk produk yang kamu terima.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-medium text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-orange" />
            Ulasan bersifat privat (hanya admin & kamu)
          </div>
        </div>

        {/* BODY */}
        <div className="space-y-5 px-6 py-5 pb-6">
          {/* PRODUK */}
          {item0 && (
            <div className="flex items-center gap-4 rounded-3xl border border-brand-krem bg-brand-cream-light/30 p-4">
              {item0.gambar ? (
                <Image
                  src={item0.gambar}
                  alt={item0.nama}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded-2xl border border-brand-krem object-cover shadow-sm"
                />
              ) : (
                <div className="h-[72px] w-[72px] rounded-2xl bg-zinc-200" />
              )}

              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm font-bold text-brand-black">
                  {item0.nama}
                </h3>

                <p className="mt-1 text-xs text-zinc-500">
                  {item0.ukuran} · x{item0.qty}
                </p>
              </div>
            </div>
          )}

          {/* RATING */}
          <div className="space-y-3">
            <div className="text-center text-sm font-bold text-brand-black">
              Bagaimana pengalamanmu?
            </div>

            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => {
                const active = s <= (hover || rating);

                return (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(s)}
                    className="rounded-full p-1 transition-transform hover:scale-110"
                    aria-label={`${s} bintang`}
                  >
                    <Star
                      className={`h-11 w-11 transition-all duration-200 ${
                        active
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {rating > 0 && (
              <div className="text-center text-sm font-semibold text-zinc-600">
                {
                  [
                    "",
                    "Sangat Buruk",
                    "Kurang Memuaskan",
                    "Cukup Baik",
                    "Memuaskan",
                    "Sangat Memuaskan",
                  ][rating]
                }
              </div>
            )}
          </div>
         {/* KOMENTAR */}
        <div className="w-full space-y-2">
          <div className="text-sm font-bold text-brand-black">
            Komentar
          </div>

          <Textarea
            value={komentar}
            onChange={(e) => {
              const value = e.target.value;

              if (value.length <= 500) {
                setKomentar(value);
              }
            }}
            placeholder="Ceritakan pengalamanmu menggunakan produk ini..."
            disabled={submitting}
            maxLength={500}
            rows={4}
            className="w-full max-w-full resize-none rounded-2xl border border-zinc-200 bg-brand-cream-light/30 p-3 text-sm leading-relaxed break-all text-brand-black outline-none transition focus:border-zinc-300 focus:ring-0"
          />

          <div className="text-right text-[11px] text-zinc-400">
            {komentar.length}/500
          </div>
        </div>

          {/* ERROR */}
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <div>{error}</div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="h-12 w-full rounded-2xl bg-brand-orange text-sm font-black tracking-wide shadow-lg shadow-brand-orange/20 transition hover:bg-brand-orange-dark"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Kirim Ulasan & Selesaikan"
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleIsiLengkap}
              disabled={submitting}
              className="h-12 w-full rounded-2xl border-brand-krem text-sm font-bold hover:bg-brand-cream-light/40"
            >
              Isi Lengkap dengan Foto / Video
            </Button>
          </div>

          {/* FOOTNOTE */}
          <p className="pt-1 text-center text-[11px] leading-relaxed text-zinc-400">
            Hanya rating bintang yang dihitung ke rata-rata produk. Komentar
            tetap bersifat privat.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KonfirmasiTerimaModal;