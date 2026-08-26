"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, Search, TrendingUp } from "lucide-react";
import { ProductCard } from "@/components/customer/ProductCard";
import { KATEGORI_UTAMA } from "@/lib/constants";
import { useProdukList } from "@/lib/use-produk-list";

const RECENT_KEY = "jogjadoelan_recent_search";
const POPULAR = ["Bogo Vintage", "Half Face", "Custom Helm", "Cakil", "Retro"];

function CariInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const submitted = (sp.get("q") ?? "").trim();
  const produkList = useProdukList();
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"));
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Simpan ke recent setiap kali landing dengan query baru
  useEffect(() => {
    if (!submitted) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setRecent((prev) => {
        const next = [submitted, ...prev.filter((x) => x !== submitted)].slice(0, 8);
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [submitted]);

  function clearRecent() {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {}
  }

  const results = useMemo(() => {
    if (!submitted) return [];
    const s = submitted.toLowerCase();
    return produkList.filter((p) => {
      const desk = Array.isArray(p.deskripsi)
        ? p.deskripsi.join(" ")
        : (p.deskripsi as string | undefined) ?? "";
      return (
        p.nama.toLowerCase().includes(s) ||
        p.jenis.toLowerCase().includes(s) ||
        desk.toLowerCase().includes(s)
      );
    });
  }, [submitted, produkList]);

  const kategoriHits = useMemo(() => {
    if (!submitted) return [] as Array<{ nama: string; href: string }>;
    const s = submitted.toLowerCase();
    const list = (KATEGORI_UTAMA as Array<Record<string, unknown>>) ?? [];
    return list
      .filter((k) => {
        const nama = String(k.nama ?? k.label ?? "").toLowerCase();
        const desk = String(k.deskripsi ?? "").toLowerCase();
        return nama.includes(s) || desk.includes(s);
      })
      .map((k) => ({
        nama: String(k.nama ?? k.label ?? ""),
        href: String(
          k.href ??
            `/belanja?kategori=${encodeURIComponent(String(k.slug ?? k.nama ?? ""))}`,
        ),
      }));
  }, [submitted]);

  const totalHits = results.length + kategoriHits.length;

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      {/* Header halaman — hanya tombol kembali + judul, TANPA search bar.
          Pencarian dilakukan dari header global aplikasi. */}
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex items-center gap-2 text-base font-black text-brand-black">
            <Search className="h-4 w-4 text-brand-orange" />
            {submitted ? (
              <>
                Hasil pencarian:{" "}
                <span className="text-brand-orange">&quot;{submitted}&quot;</span>
              </>
            ) : (
              <>Pencarian</>
            )}
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-5">
        {!submitted ? (
          <div className="space-y-5">
            <p className="text-xs text-brand-black/60">
              Gunakan kolom pencarian di bagian atas halaman untuk mulai
              mencari helm, kategori, atau jenis tertentu.
            </p>

            {recent.length > 0 && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-brand-black/70">
                    <Clock className="h-3.5 w-3.5" /> Pencarian Terakhir
                  </p>
                  <button
                    onClick={clearRecent}
                    className="text-[11px] font-bold text-brand-orange"
                  >
                    Hapus
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <Link
                      key={r}
                      href={`/cari?q=${encodeURIComponent(r)}`}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-black ring-1 ring-brand-cream hover:border-brand-orange"
                    >
                      {r}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-brand-black/70">
                <TrendingUp className="h-3.5 w-3.5" /> Populer
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map((r) => (
                  <Link
                    key={r}
                    href={`/cari?q=${encodeURIComponent(r)}`}
                    className="rounded-full bg-brand-orange/10 px-3 py-1.5 text-xs font-semibold text-brand-orange hover:bg-brand-orange/20"
                  >
                    {r}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : totalHits === 0 ? (
          <div className="rounded-2xl border border-brand-cream bg-white py-16 text-center shadow-sm">
            <Search className="mx-auto h-12 w-12 text-brand-black/30" />
            <p className="mt-3 text-sm font-bold text-brand-black">
              Tidak ditemukan untuk &quot;{submitted}&quot;
            </p>
            <p className="mt-1 text-xs text-brand-black/60">
              Coba kata kunci lain dari kolom pencarian di header
            </p>
                        <Link href="/belanja" className="mt-4 inline-block rounded-md bg-brand-orange px-5 py-2.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark">
              Lihat Semua Produk Ready Stok
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-xs text-brand-black/60">
              <strong className="text-brand-black">{totalHits}</strong> hasil
              ditemukan
            </p>

            {kategoriHits.length > 0 && (
              <section>
                <p className="mb-2 text-xs font-bold text-brand-black/70">
                  Kategori
                </p>
                <div className="flex flex-wrap gap-2">
                  {kategoriHits.map((k) => (
                    <Link
                      key={k.href}
                      href={k.href}
                      className="rounded-full bg-brand-orange/10 px-3 py-1.5 text-xs font-semibold text-brand-orange hover:bg-brand-orange/20"
                    >
                      {k.nama}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {results.length > 0 && (
              <section>
                <p className="mb-2 text-xs font-bold text-brand-black/70">
                  Produk ({results.length})
                </p>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {results.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream-light" />}>
      <CariInner />
    </Suspense>
  );
}