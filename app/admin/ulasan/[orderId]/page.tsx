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
  MessageCircle,
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
  type Ulasan,
  type UlasanFile,
} from "@/lib/ulasan-helpers";

// FIX MISI 2: Import mesin kompresor gambar sakti kita!
import { compressImage } from "@/lib/image-compressor";

import { toast } from "sonner";

const MAX_FILES = 5;

const RATING_LABEL = [
  "Sangat Kecewa ",
  "Kurang Memuaskan",
  "Cukup Baik",
  "Memuaskan",
  "Sangat Memuaskan!",
];

export default function UlasanFormPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const router = useRouter();

  const { user, isAuthenticated, isLoading } = useAuth();

  /* Form — declare BEFORE useEffect that references setRating etc */
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [files, setFiles] = useState<UlasanFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [order, setOrder] = useState<Awaited<ReturnType<typeof getOrder>>>(null);
  const [existing, setExisting] = useState<(Ulasan & { files: UlasanFile[]; balasanAdmin?: string | null }) | null>(null);

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
      const adapted = u ? { ...u, files: (u.foto ?? []).map((f) => ({ url: f.url, type: f.type, name: f.name })), balasanAdmin: u.balasan } : null;
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

  // FIX MISI 2: Logika Kompresor Foto Otomatis sebelum di-set ke state
  async function readFiles(list: FileList) {
    const fileArray = Array.from(list);
    
    for (let i = 0; i < fileArray.length; i++) {
      const f = fileArray[i];
      if (files.length + i >= MAX_FILES) break;

      const isVideo = f.type.startsWith("video/");

      if (isVideo) {
        // Video tidak dikompres di client karena berat, tapi kita batasi ukurannya max 5MB
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`Video ${f.name} melebihi batas 5MB.`);
          continue;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            setFiles((prev) =>
              prev.length >= MAX_FILES
                ? prev
                : [...prev, { url: reader.result as string, type: "video", name: f.name }]
            );
          }
        };
        reader.readAsDataURL(f);
      } else {
        // GAMBAR: Langsung sikat pakai Kompresor!
        try {
          // Kompres jadi max lebar 800px, kualitas 70%
          const compressedBase64 = await compressImage(f, 800, 0.7);
          setFiles((prev) =>
            prev.length >= MAX_FILES
              ? prev
              : [...prev, { url: compressedBase64, type: "image", name: f.name }]
          );
        } catch {
          toast.error(`Gagal memproses gambar ${f.name}`);
        }
      }
    }
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

        {/* FIX MISI 1: Tampilkan Balasan Admin di View Mode (Batas Edit Habis) */}
        {existing.balasanAdmin && (
          <Card className="mt-6 overflow-hidden rounded-[32px] border border-brand-orange/20 bg-orange-50/50 p-6 text-left shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-brand-orange" />
              <h3 className="text-sm font-black text-brand-orange uppercase tracking-widest">Balasan Admin</h3>
            </div>
            <p className="text-sm italic text-zinc-700 leading-relaxed">
              &quot;{existing.balasanAdmin}&quot;
            </p>
          </Card>
        )}
      </div>
    );
  }

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  if (!user?.id || submitting) return;
  if (!item0) {
    toast.error("Data produk tidak ditemukan");
    return;
  }

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

  const item = item0; // Safe local ref after guard

  try {
    await upsertUlasan({
      orderId,
      userId: user.id,
      productId: String(item.productId ?? "unknown"),
      productNama: item.nama,
      productGambar: item.gambar ?? null,
      ukuran: item.ukuran,
      warna: undefined,
      rating,
      komentar: komentar.trim(),
      files,
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
    <div className="mx-auto min-h-screen max-w-2xl bg-zinc-50/30 px-4 pb-36 pt-6 sm:pt-8">
      {/* Navigation & Header */}
      <div className="mb-6">
        <Link
          href={`/pesanan/${orderId}`}
          className="group mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-brand-orange"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:-translate-x-1 group-hover:shadow-md">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Kembali ke Pesanan
        </Link>

        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">
            {existing ? "Edit Ulasanmu" : "Bagikan Pengalamanmu"}
          </h1>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <Lock className="h-3.5 w-3.5" />
            <span>Penilaianmu akan membantu pembeli lain dan admin.</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Card */}
        <Card className="overflow-hidden rounded-[24px] border-none bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand-orange" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Produk yang Diulas
            </span>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-zinc-50 p-3">
            {item0.gambar ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm">
                <Image
                  src={item0.gambar}
                  alt={item0.nama}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>
            ) : (
              <div className="h-20 w-20 shrink-0 rounded-xl bg-zinc-200" />
            )}

            <div className="flex flex-col justify-center">
              <h2 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-800">
                {item0.nama}
              </h2>
              <div className="mt-2 inline-flex w-fit items-center rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-zinc-500 shadow-sm border border-zinc-100">
                Ukuran: <span className="ml-1 text-zinc-800">{item0.ukuran ?? "-"}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* FIX MISI 1: Kotak Balasan Admin Muncul Otomatis di Bawah Produk! */}
        {existing?.balasanAdmin && (
          <Card className="overflow-hidden rounded-[24px] border border-brand-orange/20 bg-orange-50/50 p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange">
                <MessageCircle className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-orange">
                Balasan dari Admin
              </h3>
            </div>
            <p className="text-sm font-medium italic leading-relaxed text-brand-black/80">
              &quot;{existing.balasanAdmin}&quot;
            </p>
          </Card>
        )}

        {/* Rating Stars Section */}
        <Card className="flex flex-col items-center justify-center rounded-[24px] border-none bg-white py-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-6 text-center">
            <h3 className="text-base font-bold text-zinc-900">Seberapa Puas Kamu?</h3>
            <p className="mt-1 text-xs text-zinc-500">Sentuh bintang untuk memberi penilaian</p>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3">
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
                    className={`h-12 w-12 sm:h-14 sm:w-14 transition-all duration-300 ${
                      active
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)] scale-110"
                        : "text-zinc-200 group-hover:scale-105 group-hover:text-amber-200"
                    }`}
                  />
                  {/* Subtle pop animation background */}
                  {active && (
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-amber-400 opacity-20 duration-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 h-6">
            <p
              className={`text-center text-sm font-bold transition-all duration-300 ${
                rating > 0 ? "scale-100 text-amber-500 opacity-100" : "scale-95 text-transparent opacity-0"
              }`}
            >
              {rating > 0 ? RATING_LABEL[rating - 1] : "Pilih Rating"}
            </p>
          </div>
        </Card>

        {/* Komentar Section */}
        <Card className="overflow-hidden rounded-[24px] border-none bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Tulis Pengalamanmu</h3>
              <p className="mt-0.5 text-xs text-zinc-500">Ceritakan detail kualitas barang ini.</p>
            </div>
            <div
              className={`flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                komentar.length >= 1000
                  ? "bg-red-50 text-red-600"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {komentar.length} / 1000
            </div>
          </div>

          <div className="relative group">
            <textarea
              placeholder="Bagaimana pengalamanmu menggunakan helm ini? (Bahan, kenyamanan, kesesuaian foto, dll)"
              value={komentar}
              onChange={(e) => setKomentar(e.target.value)}
              rows={5}
              maxLength={1000}
              className="block w-full resize-none rounded-[20px] border-2 border-zinc-100 bg-zinc-50/50 p-4 text-sm leading-relaxed text-zinc-800 outline-none transition-all duration-300 focus:border-brand-orange/50 focus:bg-white focus:ring-4 focus:ring-brand-orange/10"
            />
          </div>

         <div className="mt-3">
            {komentarTooShort ? (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                </span>
                Tulis minimal {10 - komentar.trim().length} karakter lagi ya
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Komentar sudah sangat baik!
              </div>
            )}
          </div>

          {warning && (
            <div className="mt-4 flex animate-in fade-in slide-in-from-top-2 items-start gap-3 rounded-[16px] border border-red-200 bg-red-50 p-4 text-xs">
              <div className="rounded-full bg-red-100 p-1">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              </div>
              <div>
                <strong className="block font-bold text-red-800">Perhatian</strong>
                <span className="text-red-700">{warning}</span>
                <p className="mt-1 text-red-600/80">
                  Komentarmu akan melalui proses moderasi oleh sistem.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Media Upload Section */}
        <Card className="rounded-[24px] border-none bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Tambahkan Foto / Video</h3>
              <p className="mt-0.5 text-xs text-zinc-500">Tunjukkan pesanan yang kamu terima.</p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-bold text-zinc-500">
              {files.length} / {MAX_FILES}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {files.map((f, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden rounded-[16px] border border-zinc-100 shadow-sm"
              >
                {f.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="relative h-full w-full">
                    <video
                      src={f.url}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Video className="h-6 w-6 text-white drop-shadow-md" />
                    </div>
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/40" />

                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-2 top-2 grid h-7 w-7 origin-center scale-0 place-items-center rounded-full bg-red-500 text-white shadow-lg transition-all duration-300 hover:bg-red-600 group-hover:scale-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {files.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed border-zinc-200 bg-zinc-50 text-zinc-400 transition-all duration-300 hover:border-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-110 group-hover:shadow-md">
                  <Camera className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold">Tambah Media</span>
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
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-100 bg-white/80 p-4 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:static sm:mt-8 sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
          <div className="mx-auto max-w-2xl">
            <Button
              type="submit"
              disabled={submitting || rating < 1 || komentarTooShort}
              className={`h-14 w-full rounded-full text-base font-bold tracking-wide transition-all duration-300 ${
                submitting || rating < 1 || komentarTooShort
                  ? "bg-zinc-200 text-zinc-400 shadow-none"
                  : "bg-brand-orange text-white shadow-[0_8px_20px_rgba(249,115,22,0.3)] hover:-translate-y-1 hover:bg-orange-600 hover:shadow-[0_12px_25px_rgba(249,115,22,0.4)] active:translate-y-0"
              }`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : existing ? (
                "Simpan Perubahan"
              ) : (
                "Kirim Ulasan Sekarang"
              )}
            </Button>
            {warning && (
              <p className="mt-3 text-center text-[10px] font-medium text-amber-600 sm:text-xs">
                Ulasan tetap akan terkirim dan dimoderasi admin terlebih dahulu.
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}