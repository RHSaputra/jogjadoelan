"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Star,
  Plus,
  Minus,
  ImageIcon,
  MessageCircle,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface Produk {
  id: string | number;
  nama: string;
  harga: number;
  gambar?: string | null;
  gambars?: (string | null | undefined)[] | null;
  jenis?: string;
  ukuran?: string[] | string | null;
  stok?: number;
  deskripsi?: string | string[] | null;
  deskripsiSingkat?: string | null;
  spesifikasi?: string[] | string | null;
  kondisi?: string;
  rating?: number;
  terjual?: number;
  jumlahUlasan?: number;
}

const DEFAULT_SPEC = [
  "Material: ABS premium",
  "Berat: 1.2 kg",
  "Visor: anti-gores",
  "Sertifikat: SNI",
];

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

/* Split by `|` atau newline — JANGAN split by koma karena teks Indonesia
   sering pakai koma sebagai desimal ("Berat ±1,2 kg") atau pemisah klausa. */
const toStringArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.filter(isNonEmptyString);
  if (isNonEmptyString(v))
    return v
      .split(/[|\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  return [];
};

export function ProductDetailClient({
  produk,
}: {
  produk: Produk | null | undefined;
}) {
  const router = useRouter();
  const cart = useCart();
  const { isAuthenticated } = useAuth();

  // Use rating, sales, and reviews statistics directly from the product database model (mapped to DTO)
  const activeRating = produk?.rating ?? 0;
  const activeUlasan = produk?.jumlahUlasan ?? 0;
  const activeTerjual = produk?.terjual ?? 0;

  const validGambars: string[] = (() => {
    const arr = toStringArray(produk?.gambars);
    if (arr.length > 0) return arr.slice(0, 5);
    if (isNonEmptyString(produk?.gambar)) return [produk!.gambar as string];
    return [];
  })();

  const ukuranArr: string[] = (() => {
    const arr = toStringArray(produk?.ukuran);
    return arr.length > 0 ? arr : ["M"];
  })();

  const spesifikasiArr: string[] = (() => {
    const arr = toStringArray(produk?.spesifikasi);
    return arr.length > 0 ? arr : DEFAULT_SPEC;
  })();

  /* Deskripsi → array bullet (kalau di constants array, render per-bullet) */
  const deskripsiArr: string[] = (() => {
    const raw = produk?.deskripsi;
    if (Array.isArray(raw)) return raw.filter(isNonEmptyString);
    if (isNonEmptyString(raw)) return [raw];
    return [];
  })();

  const [activeImg, setActiveImg] = useState(0);
  const [ukuran, setUkuran] = useState(ukuranArr[0]);
  const [qty, setQty] = useState(1);

  /* Carousel navigation untuk gallery (maks 5 gambar) */
  const galleryCount = validGambars.length;
  const goPrevImg = () =>
    setActiveImg((i) =>
      galleryCount === 0 ? 0 : (i - 1 + galleryCount) % galleryCount,
    );
  const goNextImg = () =>
    setActiveImg((i) => (galleryCount === 0 ? 0 : (i + 1) % galleryCount));

  /* ===== Swipe handler — horizontal-only, JANGAN ganggu scroll vertikal ===== */
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNextImg();
      else goPrevImg();
    }
    touchStart.current = null;
  };

  /* ===== Keyboard arrow nav (desktop) ===== */
  useEffect(() => {
    if (galleryCount <= 1) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") goPrevImg();
      if (e.key === "ArrowRight") goNextImg();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryCount]);

  /* Auto-scroll thumbnail row supaya thumb aktif kelihatan di viewport mobile */
  const thumbRowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const row = thumbRowRef.current;
    if (!row) return;
    const activeBtn = row.querySelector<HTMLButtonElement>(
      `[data-thumb-idx="${activeImg}"]`,
    );
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeImg]);

  /* Stok dari server (source-of-truth). */
  const liveStok: number = typeof produk?.stok === "number" ? produk.stok : 0;

  const ratingDisplay = useMemo(
    () => (activeRating > 0 ? activeRating.toFixed(1) : "—"),
    [activeRating],
  );

  if (!produk) {
    return (
      <div className="min-h-screen bg-brand-cream-light pb-10 overflow-x-hidden">
        <p className="text-brand-black/60">Produk tidak ditemukan</p>
      </div>
    );
  }

  const stok = liveStok;
  const habis = stok <= 0;
  const lowStock = stok > 0 && stok <= 3;
  const harga = (typeof produk.harga === "number"
    ? produk.harga
    : 0
  ).toLocaleString("id-ID");

  const requireLogin = (action: () => void) => {
    if (!isAuthenticated) {
      toast.error("Silakan login dulu", {
        description: "Kamu harus login untuk menambahkan produk ke keranjang.",
      });
      router.push(`/login?next=${encodeURIComponent(`/produk/${produk.id}`)}`);
      return;
    }
    action();
  };

  const handleAdd = () => {
    if (stok <= 0) {
      toast.error("Stok habis", {
        description: "Produk sedang tidak tersedia untuk sementara.",
      });
      return;
    }
    requireLogin(() => {
      cart.add(String(produk.id), String(ukuran), null, qty);
      toast.success(`${produk.nama} (${ukuran}) ditambahkan ke keranjang`, {
        description: "Produk berhasil masuk ke keranjang belanja.",
      });
    });
  };

  const handleBeli = () => {
    if (stok <= 0) {
      toast.error("Stok habis", {
        description: "Produk sedang tidak tersedia untuk sementara.",
      });
      return;
    }
    requireLogin(() => {
      const payload = `${produk.id}:${encodeURIComponent(ukuran)}:${qty}`;
      router.push(`/checkout?mode=buy&items=${payload}`);
    });
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-brand-cream-light pb-12">
      <div className="border-b border-brand-cream bg-brand-cream/40">
        <div className="container mx-auto px-4 py-6 max-w-full overflow-hidden">
          <nav className="flex items-center gap-2 text-xs text-brand-black/70">
            <Link
              href="/belanja"
              className="font-medium hover:text-brand-orange"
            >
              Belanja
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span>Ready Stock</span>
            <ChevronRight className="h-3 w-3" />
            <span className="border-b-2 border-brand-orange pb-0.5 font-bold text-brand-black">
              Detail
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto max-w-full overflow-x-clip px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Kolom kiri - foto & ringkasan */}
          <div className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-brand-cream bg-white shadow-sm">
              <div
                className="group relative aspect-4/3 w-full select-none overflow-hidden bg-brand-cream/40 touch-pan-y"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                {galleryCount > 0 ? (
                  <>
                    <div
                      className="flex h-full w-full transition-transform duration-500 ease-out"
                      style={{ transform: `translateX(-${activeImg * 100}%)` }}
                    >
                      {validGambars.map((g, i) => (
                        <div key={i} className="relative h-full w-full shrink-0">
                          <Image
                            src={g}
                            alt={`${produk.nama} ${i + 1}`}
                            fill
                            className="object-contain"
                            sizes="(min-width: 1024px) 50vw, 100vw"
                            priority={i === 0}
                            draggable={false}
                          />
                        </div>
                      ))}
                    </div>

                    {galleryCount > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={goPrevImg}
                          aria-label="Gambar sebelumnya"
                          className="hidden md:flex absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-brand-black shadow-lg ring-1 ring-black/5 backdrop-blur transition active:scale-90 hover:bg-white md:left-3 md:h-11 md:w-11 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                        </button>
                        <button
                          type="button"
                          onClick={goNextImg}
                          aria-label="Gambar berikutnya"
                          className="hidden md:flex absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-brand-black shadow-lg ring-1 ring-black/5 backdrop-blur transition active:scale-90 hover:bg-white md:right-3 md:h-11 md:w-11 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                        </button>

                        <span className="hidden md:flex absolute right-3 top-3 z-10 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                          {activeImg + 1} / {galleryCount}
                        </span>

                        <div className="hidden md:flex absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2.5 py-1.5 backdrop-blur">
                          {validGambars.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setActiveImg(i)}
                              aria-label={`Slide ${i + 1}`}
                              className={`h-1.5 rounded-full transition-all ${
                                i === activeImg
                                  ? "w-5 bg-brand-orange"
                                  : "w-1.5 bg-white/80 hover:bg-white"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-brand-black/30">
                    <ImageIcon className="h-16 w-16" />
                  </div>
                )}
              </div>
              {galleryCount > 1 && (
                <div
                  ref={thumbRowRef}
                  className="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto p-3"
                  style={{ scrollbarWidth: "none" }}
                >
                  {validGambars.map((g, i) => (
                    <button
                      key={i}
                      type="button"
                      data-thumb-idx={i}
                      onClick={() => setActiveImg(i)}
                      className={`relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-md border-2 transition active:scale-95 ${
                        i === activeImg
                          ? "border-brand-orange ring-2 ring-brand-orange/30"
                          : "border-brand-cream hover:border-brand-orange/50"
                      }`}
                      aria-label={`Pilih gambar ${i + 1}`}
                      aria-current={i === activeImg ? "true" : undefined}
                    >
                      <Image
                        src={g}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="64px"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-brand-cream bg-white p-4 shadow-sm">
              <p className="text-sm text-brand-black/70">{produk.nama}</p>
              <p className="mt-1 text-lg font-black text-brand-black">
                Rp. {harga},-
              </p>
              
              {/* ===== UI RATING DAN TERJUAL REAL ===== */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => {
                    const filled = s <= Math.round(activeRating);
                    return (
                      <Star
                        key={s}
                        className={`h-5 w-5 ${
                          filled
                            ? "fill-brand-orange text-brand-orange"
                            : "fill-transparent text-brand-cream"
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="text-right text-xs text-brand-black/60">
                  <span className="font-bold text-brand-black/70">{ratingDisplay}</span> | {activeUlasan} ulasan
                  <span className="mx-1.5 text-brand-cream">•</span>
                  Terjual {activeTerjual}
                </div>
              </div>

            </div>
          </div>

          {/* Kolom kanan - detail */}
          <div className="min-w-0 space-y-4">
            <span className="inline-block rounded-md border border-brand-cream bg-white px-3 py-1 text-xs font-bold text-brand-black shadow-sm">
              Ready Stock
            </span>
            <h1 className="break-words text-2xl font-black leading-tight text-brand-black md:text-3xl">
              {produk.nama}
            </h1>
            <p className="text-2xl font-black text-brand-black md:text-3xl">
              Rp. {harga},-
            </p>
            <div className="rounded-md border border-brand-cream bg-brand-cream/50 px-4 py-3 text-sm leading-relaxed text-brand-black">
              {deskripsiArr.length > 1 ? (
                <ul className="space-y-1.5">
                  {deskripsiArr.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {deskripsiArr[0] ??
                    produk.deskripsiSingkat ??
                    "Helm berkualitas premium dengan material pilihan dan desain modern."}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-brand-cream bg-brand-cream">
              <div className="bg-white p-3 text-center">
                <p className="text-xs text-brand-black/60">Stok :</p>
                <p
                  className={`mt-1 text-sm font-bold ${
                    habis
                      ? "text-red-600"
                      : lowStock
                        ? "text-amber-600"
                        : "text-brand-black"
                  }`}
                >
                  {habis
                    ? "HABIS"
                    : lowStock
                      ? `Tinggal ${stok}`
                      : `${stok} Unit`}
                </p>
              </div>
              <div className="bg-white p-3 text-center">
                <p className="text-xs text-brand-black/60">Ukuran :</p>
                <p className="mt-1 text-sm font-bold text-brand-black">
                  {ukuranArr.join(", ")}
                </p>
              </div>
              <div className="bg-white p-3 text-center">
                <p className="text-xs text-brand-black/60">Kondisi :</p>
                <p className="mt-1 text-sm font-bold text-brand-black">
                  {produk.kondisi ?? "Baru"}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-brand-black">
                Deskripsi :
              </p>
              <div className="rounded-lg border border-brand-cream bg-white p-4">
                <span className="inline-block rounded-md bg-brand-orange px-3 py-1 text-xs font-bold text-white">
                  Spesifikasi
                </span>
                <ul className="mt-3 space-y-2 text-sm text-brand-black/80">
                  {spesifikasiArr.map((s, i) => (
                    <li
                      key={i}
                      className="break-words rounded-md bg-brand-cream/50 px-3 py-2"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-brand-black">
                Pilih Ukuran :
              </p>
              <div className="flex flex-wrap gap-2">
                {ukuranArr.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUkuran(u)}
                    className={`min-w-12 rounded-md border-2 px-4 py-2 text-sm font-bold transition ${
                      u === ukuran
                        ? "border-brand-orange bg-brand-orange text-white"
                        : "border-brand-cream bg-white text-brand-black hover:border-brand-orange/60"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-brand-black">
                  Jumlah
                </span>
                <div className="flex items-center rounded-md border-2 border-brand-cream bg-white">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-brand-black hover:bg-brand-cream"
                    aria-label="Kurang"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-brand-black">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(stok, q + 1))}
                    className="px-3 py-2 text-brand-black hover:bg-brand-cream"
                    aria-label="Tambah"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => router.push(`/chat?produkId=${produk.id}`)}
                  aria-label="Tanya Admin tentang produk ini"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-brand-cream bg-white text-brand-black shadow-sm transition hover:border-brand-orange hover:text-brand-orange"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  aria-label="Tambah ke keranjang"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-brand-cream bg-white text-brand-black shadow-sm transition hover:border-brand-orange hover:text-brand-orange"
                >
                  <ShoppingCart className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleBeli}
                  className="flex-1 rounded-md bg-brand-orange px-4 py-3 text-center text-base font-black text-white shadow-md transition hover:bg-brand-orange-dark sm:flex-none sm:px-8"
                >
                  Beli Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailClient;