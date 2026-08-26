"use client";

import Link from "next/link";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { useProdukListQuery } from "@/lib/use-produk-list";
import { useLandingLive } from "@/lib/use-landing-live";

export function RekomendasiSection() {
  const c = useLandingLive().rekomendasi;
  const { data: all = [], isLoading } = useProdukListQuery();
  
  const rekomendasi = all.filter((p) => p.isRekomendasi === true);
  const list = rekomendasi.length > 0 ? rekomendasi : all;

  if (isLoading) {
    return (
      <section className="relative overflow-hidden bg-[#f8f4ee] pt-2 pb-10 animate-pulse">
        <div className="container relative mx-auto px-4">
          <div className="mb-6">
            <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-48 bg-gray-200 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (list.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[#f8f4ee] pt-2 pb-10">
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-300 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-200 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-[2px] w-7 bg-brand-navy" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-navy">{c.subtitle || ""}</span>
            </div>
            <h2 className="font-bebas text-3xl tracking-wide text-brand-black md:text-4xl">{c.title.toUpperCase()}</h2>
          </div>
          <Link href={c.ctaHref || "/belanja"} className="text-sm font-black text-brand-navy hover:underline">
            {c.ctaLihatSemua}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {list.slice(0, 8).map((produk) => (<ProductCard key={produk.id} product={produk} />))}
        </div>
      </div>
    </section>
  );
}