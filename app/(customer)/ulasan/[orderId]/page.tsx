"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  Star,
  Camera,
  Video,
  X,
  AlertTriangle,
  Lock,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/lib/auth-context";
import { getOrder } from "@/lib/orders-storage";

import {
  canEditUlasan,
  containsBadWords,
  getUlasanByOrder,
  upsertUlasan,
  type UlasanFile,
  type Ulasan,
} from "@/lib/ulasan-helpers";

import { toast } from "sonner";

const MAX_FILES = 5;

const RATING_LABEL = [
  "Sangat Kecewa ",
  "Kurang Memuaskan",
  "Cukup Baik",
  "Memuaskan",
  "Sangat Memuaskan!",
];

type ExistingUlasan = Ulasan & { files: UlasanFile[]; balasanAdmin?: string | null };

export default function UlasanFormPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const router = useRouter();

  const { user, isAuthenticated, isLoading } = useAuth();

  /* Form */
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [files, setFiles] = useState<UlasanFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [order, setOrder] = useState<Awaited<ReturnType<typeof getOrder>>>(null);
  const [existing, setExisting] = useState<ExistingUlasan | null>(null);

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
      const adapted: ExistingUlasan | null = u
        ? {
            ...u,
            files: (u.foto ?? []).map((f) => ({ url: f.url, type: f.type, name: f.name })),
            balasanAdmin: u.balasan ?? undefined,
          }
        : null;
      setExisting(adapted);
      if (adapted) {
        setRating(adapted.rating);
        setKomentar(adapted.komentar);
        setFiles(adapted.files as UlasanFile[]);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, orderId]);

  const item0 = order?.items[0];
  const editable = existing ? canEditUlasan(existing) : true;

  const fileRef = useRef<HTMLInputElement | null>(null);

  /* Auth gate */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(
        "/login?next=" + encodeURIComponent(`/ulasan/${orderId}`),
      );
    }
  }, [isLoading, isAuthenticated, router, orderId]);

  /* Bad word */
  const badCheck = useMemo(
    () => containsBadWords(komentar),
    [komentar],
  );

  const warning = badCheck.ada
    ? `Komentar mengandung kata yang tidak pantas: ${badCheck.words.join(", ")}`
    : null;

  function readFiles(list: FileList) {
    Array.from(list).forEach((f) => {
      if (files.length >= MAX_FILES) return;

      const isVideo = f.type.startsWith("video/");

      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== "string") return;

        const newFile: UlasanFile = {
          url: reader.result,
          type: isVideo ? "video" : "image",
          name: f.name,
        };

        setFiles((prev) =>
          prev.length >= MAX_FILES ? prev : [...prev, newFile],
        );
      };

      reader.readAsDataURL(f);
    });
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-orange border-t-transparent" />
      </div>
    );
  }

  if (!order || !item0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-6 rounded-full bg-zinc-100 p-4">
          <AlertTriangle className="h-8 w-8 text-zinc-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-zinc-800">Pesanan Tidak Ditemukan</h2>
        <p className="mb-8 text-sm text-zinc-500">Kami tidak dapat menemukan data pesanan yang kamu tuju.</p>
        <Link
          href="/pesanan"
          className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Daftar Pesanan
        </Link>
      </div>
    );
  }

  if (order.status !== "selesai") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Link
          href={`/pesanan/${orderId}`}
          className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <div className="rounded-full bg-zinc-100 p-1.5 transition-colors group-hover:bg-zinc-200">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Kembali
        </Link>

        <Card className="overflow-hidden rounded-[32px] border-none bg-gradient-to-br from-amber-50 to-orange-50 p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
            <Lock className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-amber-900">
            Pesanan Belum Selesai
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-700/80">
            Kamu baru bisa memberikan ulasan setelah status pesanan berubah menjadi <strong className="font-bold">Selesai</strong>. Selesaikan pesananmu terlebih dahulu ya!
          </p>
        </Card>
      </div>
    );
  }

  if (existing && !editable) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Link
          href={`/ulasan/${orderId}/sukses`}
          className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <div className="rounded-full bg-zinc-100 p-1.5 transition-colors group-hover:bg-zinc-200">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Lihat Ulasan
        </Link>

        <Card className="overflow-hidden rounded-[32px] border-none bg-zinc-50 p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
            <Lock className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-zinc-800">
            Batas Waktu Edit Habis
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Ulasan hanya dapat diubah dalam <strong className="font-bold text-zinc-700">24 jam pertama</strong> setelah dikirimkan. Terima kasih atas ulasanmu!
          </p>
        </Card>
      </div>
    );
  }

  async function uploadUlasanFile(f: UlasanFile): Promise<UlasanFile> {
    if (!f.url.startsWith("data:")) return f;
    try {
      const blob = await (await fetch(f.url)).blob();
      const fd = new FormData();
      fd.append("file", blob, f.name || "media.png");
      fd.append("sub", "ulasan");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.data?.path) {
        throw new Error(json.error || "Gagal mengunggah media");
      }
      return {
        url: json.data.path,
        type: f.type,
        name: f.name,
      };
    } catch (err) {
      console.error("Error uploading ulasan file:", err);
      throw new Error(err instanceof Error ? err.message : "Gagal mengunggah media");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user?.id || !item0 || submitting) return;

    if (rating < 1) {
      toast.error("Rating belum dipilih", {
        description: "Yuk, berikan penilaian 1–5 bintang untuk produk ini.",
      });
      return;
    }

    if (komentar.trim().length < 10) {
      toast.error("Komentar terlalu singkat", {
        description: "Bagikan pengalamanmu minimal 10 karakter ya.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload all files first
      const uploadedFiles = await Promise.all(
        files.map((f) => uploadUlasanFile(f))
      );

      await upsertUlasan({
        orderId,
        userId: user.id,
        productId: String(item0.productId ?? "unknown"),
        productNama: item0.nama,
        productGambar: item0.gambar ?? null,
        ukuran: item0.ukuran,
        warna: undefined,
        rating,
        komentar: komentar.trim(),
        files: uploadedFiles,
      });

      router.replace(`/ulasan/${orderId}/sukses`);
    } catch (err) {
      toast.error("Gagal mengirim ulasan", {
        description: (err as Error).message,
      });
      setSubmitting(false);
    }
  }

  const komentarTooShort = komentar.trim().length < 10;

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24 font-sans">
      {/* Sticky top header */}
      <div className="sticky top-0 z-30 border-b border-brand-cream bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5">
          <Link
            href={`/pesanan/${orderId}`}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-brand-cream-light transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-brand-black" />
          </Link>
          <h1 className="text-base font-black text-brand-black">
            {existing ? "Edit Ulasan Produk" : "Tulis Ulasan Produk"}
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* Intro */}
        <div className="rounded-2xl border border-brand-cream bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            <Lock className="h-3.5 w-3.5 text-brand-orange" />
            <span>Penilaian Anda akan membantu pembeli lain dan admin toko.</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Card */}
          <Card className="overflow-hidden rounded-2xl border border-brand-cream bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-orange" />
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-black/40">
                Produk yang Diulas
              </span>
            </div>

            <div className="flex items-center gap-4 rounded-xl bg-brand-cream-light/30 border border-brand-cream/50 p-3">
              {item0.gambar ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-brand-cream bg-white shadow-sm">
                  <Image
                    src={item0.gambar}
                    alt={item0.nama}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-lg bg-brand-cream" />
              )}

              <div className="flex-1 min-w-0">
                <h2 className="truncate text-sm font-black text-brand-black">
                  {item0.nama}
                </h2>
                <div className="mt-1.5 inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-brand-black/60 shadow-sm border border-brand-cream">
                  Ukuran: <span className="ml-1 font-black text-brand-black">{item0.ukuran ?? "-"}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Rating Stars Section */}
          <Card className="flex flex-col items-center justify-center rounded-2xl border border-brand-cream bg-white py-8 shadow-sm">
            <div className="mb-5 text-center">
              <h3 className="text-sm font-black text-brand-black uppercase tracking-wide">Seberapa Puas Kamu?</h3>
              <p className="mt-1 text-xs text-brand-black/40">Ketuk bintang untuk memberi penilaian</p>
            </div>

            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="group relative rounded-full p-1 transition-transform active:scale-90"
                  >
                    <Star
                      className={`h-11 w-11 sm:h-12 sm:w-12 transition-all duration-300 ${
                        active
                          ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] scale-110"
                          : "text-brand-cream group-hover:scale-105 group-hover:text-amber-200"
                      }`}
                    />
                    {active && (
                      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-amber-400 opacity-20 duration-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 h-5">
              <p
                className={`text-center text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  rating > 0 ? "scale-100 text-brand-orange opacity-100" : "scale-95 text-transparent opacity-0"
                }`}
              >
                {rating > 0 ? RATING_LABEL[rating - 1] : ""}
              </p>
            </div>
          </Card>

          {/* Komentar Section */}
          <Card className="overflow-hidden rounded-2xl border border-brand-cream bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-brand-black uppercase tracking-wide">Tulis Pengalamanmu</h3>
                <p className="mt-0.5 text-xs text-brand-black/40">Ceritakan detail ulasan produk.</p>
              </div>
              <div
                className={`flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black transition-colors ${
                  komentar.length >= 1000
                    ? "bg-red-50 text-red-600"
                    : "bg-brand-cream-light text-brand-black/60 border border-brand-cream/40"
                }`}
              >
                {komentar.length} / 1000
              </div>
            </div>

            <div className="relative">
              <textarea
                placeholder="Bagaimana pengalaman Anda menggunakan produk ini? (Bahan, kenyamanan, kesesuaian foto, dll)"
                value={komentar}
                onChange={(e) => setKomentar(e.target.value)}
                rows={5}
                maxLength={1000}
                className="block w-full resize-none rounded-xl border border-brand-cream bg-brand-cream-light/10 p-4 text-xs leading-relaxed text-brand-black placeholder:text-brand-black/30 outline-none transition focus:border-brand-orange focus:bg-white"
              />
            </div>

            <div className="pt-1">
              {komentarTooShort ? (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                  </span>
                  Tulis minimal {10 - komentar.trim().length} karakter lagi ya
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                  <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Komentar sudah sangat baik!
                </div>
              )}
            </div>

            {warning && (
              <div className="flex animate-in fade-in slide-in-from-top-2 items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs">
                <div className="rounded-full bg-red-100 p-1">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                </div>
                <div className="space-y-1">
                  <strong className="block font-black text-red-800">Perhatian</strong>
                  <span className="text-red-700 block">{warning}</span>
                  <p className="text-[10px] text-red-600/80">
                    Komentarmu akan melalui proses moderasi oleh sistem.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Media Upload Section */}
          <Card className="rounded-2xl border border-brand-cream bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-brand-black uppercase tracking-wide">Tambahkan Foto / Video</h3>
                <p className="mt-0.5 text-xs text-brand-black/40">Tunjukkan pesanan yang kamu terima.</p>
              </div>
              <span className="rounded-full bg-brand-cream-light border border-brand-cream/40 px-2.5 py-0.5 text-[10px] font-black text-brand-black/60">
                {files.length} / {MAX_FILES}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-brand-cream shadow-sm bg-brand-cream-light/20"
                >
                  {f.type === "image" ? (
                    <Image
                      src={f.url}
                      alt=""
                      width={0}
                      height={0}
                      sizes="200px"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="relative h-full w-full">
                      <video
                        src={f.url}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Video className="h-5 w-5 text-white drop-shadow-md" />
                      </div>
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/40" />

                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-2 top-2 grid h-6 w-6 origin-center scale-0 place-items-center rounded-full bg-red-500 text-white shadow-lg transition-all duration-300 hover:bg-red-600 group-hover:scale-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {files.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-cream bg-brand-cream-light/30 text-brand-black/40 transition-all duration-300 hover:border-brand-orange hover:bg-orange-50 hover:text-brand-orange"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-105">
                    <Camera className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider">Tambah Media</span>
                </button>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => e.target.files && readFiles(e.target.files)}
            />
          </Card>

          {/* Floating Submit Button Area */}
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-cream bg-white/80 p-4 pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.03)] backdrop-blur-xl sm:static sm:mt-8 sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
            <div className="mx-auto max-w-2xl">
              <Button
                type="submit"
                disabled={submitting || rating < 1 || komentarTooShort}
                className={`h-12 w-full rounded-full text-xs font-black uppercase tracking-widest transition shadow-md ${
                  submitting || rating < 1 || komentarTooShort
                    ? "bg-brand-cream border-2 border-brand-cream bg-white text-brand-black/35 shadow-none"
                    : "bg-brand-orange text-white hover:bg-brand-orange-dark hover:shadow-lg"
                }`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2 justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Mengirim...
                  </span>
                ) : existing ? (
                  "Simpan Perubahan"
                ) : (
                  "Kirim Ulasan Sekarang"
                )}
              </Button>
              {warning && (
                <p className="mt-3 text-center text-[10px] font-bold text-amber-600 sm:text-xs">
                  Ulasan tetap akan terkirim dan dimoderasi admin terlebih dahulu.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}