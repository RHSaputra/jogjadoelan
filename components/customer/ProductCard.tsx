"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { StarRating } from "./StarRating";

// 1. Interface produk yang dipakai di listing
export interface Product {
  id: string;
  slug?: string | null;
  nama: string;
  jenis: string;
  jenisLabel: string;
  harga: number;
  stok: number;
  rating: number;
  terjual: number;
  gambar?: string | string[];
  gambars?: string | string[];
  hargaCoret?: number;
  diskonPersen?: number;
  promoLabel?: string;
}

// 2. Ambil 1 URL gambar dari berbagai format data
function pickGambar(p: Product): string | undefined {
  const res = p.gambar || p.gambars;
  if (Array.isArray(res)) return res[0];
  return res;
}

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID").format(num);

/**
 * ProductCard — memoized agar tidak re-render saat parent re-render.
 * Menggunakan next/image untuk: lazy loading otomatis, WebP/AVIF conversion,
 * ukuran responsive, dan mencegah layout shift (CLS).
 */
export const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const stok = typeof product.stok === "number" ? product.stok : 0;
  const habis = stok <= 0;
  const low = stok > 0 && stok <= 3;

  const activeRating = product.rating ?? 0;
  const activeTerjual = product.terjual ?? 0;
  const displayImage = pickGambar(product);

  const hargaCoretVal = product.hargaCoret ?? 0;
  const diskonVal = product.diskonPersen ?? 0;
  const hasDiskon = !habis && (
    (hargaCoretVal > 0 && hargaCoretVal > product.harga) ||
    diskonVal > 0 ||
    !!product.promoLabel
  );
  const effectiveHargaCoret = hargaCoretVal > product.harga
    ? hargaCoretVal
    : diskonVal > 0
      ? Math.round(product.harga / (1 - diskonVal / 100))
      : 0;

  // Gunakan slug jika ada, fallback ke id
  const href = `/produk/${product.slug ?? product.id}`;

  return (
    <Link
      href={href}
      aria-disabled={habis}
      prefetch={false}
      className={`group relative block overflow-hidden rounded-2xl border bg-canvas shadow-vintage transition-all duration-300 ${
        habis ? "border-zinc-300 opacity-90" : "border-brand-line hover:-translate-y-1 hover:border-brand-brass hover:shadow-pop"
      }`}
    >
      {/* Gambar Produk — next/image dengan lazy loading & format modern */}
      <div className="relative aspect-square w-full overflow-hidden bg-paper-deep">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={product.nama}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-transform duration-700 ${
              habis ? "grayscale" : "group-hover:scale-110"
            }`}
            loading="lazy"
            quality={80}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-vintage-gradient text-brand-brass">
            <span className="font-bebas text-3xl tracking-widest">JD</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-brand-smoke/60">Foto Produk</span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-grain opacity-40 mix-blend-multiply" />
        <span className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 border-l-2 border-t-2 border-brand-brass/60" />
        <span className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 border-r-2 border-t-2 border-brand-brass/60" />
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 h-4 w-4 border-b-2 border-l-2 border-brand-brass/60" />
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 h-4 w-4 border-b-2 border-r-2 border-brand-brass/60" />

        {hasDiskon && (
          <div className="absolute left-3 top-5 z-10 flex flex-col items-start gap-1">
            <span className="rounded-r-md bg-red-600 px-2.5 py-1 font-bebas text-sm tracking-wider text-white shadow-md">-{product.diskonPersen}%</span>
            {product.promoLabel && (
              <span className="rounded-r-md bg-brand-jet px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-brand-brass-light shadow">
                {product.promoLabel}
              </span>
            )}
          </div>
        )}

        {habis && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-jet/55 backdrop-blur-[2px]">
            <span className="rounded-full border border-red-300/70 bg-red-700/90 px-4 py-1 font-bebas text-sm tracking-[0.3em] text-white shadow-pop">STOK HABIS</span>
          </div>
        )}

        {!habis && (
          <div className={`absolute bottom-3 right-3 z-10 flex items-center justify-center rounded-full border px-2.5 py-0.5 backdrop-blur transition-opacity duration-300 group-hover:opacity-0 ${low ? "border-amber-400/70 bg-amber-900/85" : "border-brand-brass/40 bg-brand-jet/80"}`}>
            <span className={`font-bebas text-[10px] tracking-widest ${low ? "text-amber-100" : "text-brand-brass-light"}`}>
              {low ? `TINGGAL ${stok}` : `STOK · ${stok}`}
            </span>
          </div>
        )}
      </div>

      {/* Info Produk */}
      <div className="relative space-y-1.5 border-t border-brand-line/60 bg-canvas p-3.5">
        <p className="font-bebas text-[10px] tracking-[0.25em] text-brand-brass">{product.jenisLabel}</p>
        <p className={`line-clamp-2 text-sm font-bold transition ${habis ? "text-zinc-500" : "text-jet group-hover:text-rust"}`}>
          {product.nama}
        </p>
        <div className="pt-1">
          {hasDiskon && effectiveHargaCoret > product.harga && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-brand-smoke/50 line-through">
                Rp {formatRupiah(effectiveHargaCoret)}
              </span>
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-black text-red-700">
                HEMAT Rp {formatRupiah(effectiveHargaCoret - product.harga)}
              </span>
            </div>
          )}
          <p className={`text-base font-black ${habis ? "text-zinc-400 line-through" : "text-rust"}`}>
            Rp {formatRupiah(product.harga)}<span className="text-xs font-medium text-brand-smoke/50">,-</span>
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-brand-line/50 pt-2">
          <StarRating rating={Math.round(activeRating)} terjual={activeTerjual} />
        </div>
      </div>
    </Link>
  );
});

/**
 * ProductCardSkeleton — skeleton loading untuk ProductCard.
 * Tampilkan saat data belum tersedia untuk mencegah layout shift.
 */
export function ProductCardSkeleton() {
  return (
    <div className="block overflow-hidden rounded-2xl border border-brand-line bg-canvas shadow-vintage animate-pulse">
      {/* Gambar skeleton */}
      <div className="aspect-square w-full bg-paper-deep" />
      {/* Info skeleton */}
      <div className="space-y-2 border-t border-brand-line/60 bg-canvas p-3.5">
        <div className="h-3 w-16 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="pt-1">
          <div className="h-5 w-28 rounded bg-gray-200" />
        </div>
        <div className="flex items-center gap-1 border-t border-brand-line/50 pt-2">
          <div className="h-3 w-20 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}