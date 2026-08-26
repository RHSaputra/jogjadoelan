"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import { FilterBar } from "@/components/customer/FilterBar";
import { ProductCard, ProductCardSkeleton } from "@/components/customer/ProductCard";
import { useProdukInfiniteQuery } from "@/lib/use-produk-list";

export default function BelanjaPage() {
  const [activeJenis, setActiveJenis] = useState("semua");
  const [sort, setSort] = useState("terbaru");
  const [showAdvFilter, setShowAdvFilter] = useState(false);
  const [minH, setMinH] = useState("");
  const [maxH, setMaxH] = useState("");

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useProdukInfiniteQuery({
    jenis: activeJenis,
    sort,
  });

  const allProducts = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const matchMin = !minH || p.harga >= Number(minH);
      const matchMax = !maxH || p.harga <= Number(maxH);
      return matchMin && matchMax;
    });
  }, [allProducts, minH, maxH]);

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header + FilterBar */}
      <div className="sticky top-0 z-30 bg-brand-cream-light">
        <div className="relative flex items-center">
          <Link
            href="/"
            aria-label="Kembali"
            className="absolute left-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-black transition hover:bg-black/10 hover:text-brand-orange md:left-4"
          >
            <ChevronLeftIcon />
          </Link>
          <div className="w-full pl-12 md:pl-14">
            <FilterBar
              activeJenis={activeJenis}
              onJenisChange={setActiveJenis}
            />
          </div>
        </div>
      </div>

      {/* Sort & Filter Harga */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvFilter(!showAdvFilter)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              showAdvFilter
                ? "bg-brand-orange text-white"
                : "bg-white text-brand-black ring-1 ring-brand-cream"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter Harga
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="ml-auto rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-black ring-1 ring-brand-cream outline-none"
          >
            <option value="terbaru">↕ Terbaru</option>
            <option value="terlaris">↕ Terlaris</option>
            <option value="harga-asc">↕ Harga Terendah</option>
            <option value="harga-desc">↕ Harga Tertinggi</option>
          </select>
        </div>
        {showAdvFilter && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-cream bg-brand-cream-light p-3">
            <input
              value={minH}
              onChange={(e) => setMinH(e.target.value)}
              placeholder="Harga min"
              inputMode="numeric"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-orange"
            />
            <span className="text-xs text-brand-black/50">—</span>
            <input
              value={maxH}
              onChange={(e) => setMaxH(e.target.value)}
              placeholder="Harga max"
              inputMode="numeric"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-orange"
            />
            <button
              onClick={() => { setMinH(""); setMaxH(""); }}
              className="shrink-0 rounded text-xs font-bold text-brand-orange"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Produk */}
      <div className="container mx-auto px-4 py-3">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Ready Stock</h1>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            Produk tidak ditemukan.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((p, idx) => (
                <ProductCard key={p.id + idx} product={p} />
              ))}
            </div>
            
            {/* Infinite Scroll Sentinel */}
            <div ref={observerTarget} className="flex h-12 items-center justify-center">
              {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}