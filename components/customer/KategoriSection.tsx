"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Package, Brush, ArrowRight, ShoppingBag, X, ZoomIn, type LucideIcon } from "lucide-react";
import { useLandingLive } from "@/lib/use-landing-live";

const FALLBACK_ICON: Record<string, LucideIcon> = { "ready-stock": Package, custom: Brush };

/** Inline SVG placeholder — tampil saat admin belum upload gambar */
function KategoriPlaceholder({ iconId }: { iconId: string }) {
  const Icon = FALLBACK_ICON[iconId] ?? ShoppingBag;
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="flex flex-col items-center gap-2 text-amber-400/60">
        <Icon className="h-10 w-10 md:h-14 md:w-14" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/50">
          No Image
        </span>
      </div>
    </div>
  );
}

/** Lightbox fullscreen — tampil saat customer klik gambar */
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 transition-all"
        aria-label="Tutup"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function KategoriSection() {
  const { kategori } = useLandingLive();
  const { header, cards } = kategori;

  return (
    <section className="relative overflow-hidden bg-[#f8f4ee] pt-8 pb-8 md:pt-12 md:pb-12">
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-300 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-200 blur-3xl" />
      </div>
      <div className="container mx-auto px-4">
        
        {/* TITLE - Classic Style */}
        <div className="mb-6 text-center md:mb-8">
          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-amber-700/40" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-800/70">
              {header.eyebrow}
            </span>
            <div className="h-[1px] w-12 bg-amber-700/40" />
          </div>

          <h2 className="font-bebas text-3xl tracking-widest text-stone-800 md:text-5xl lg:text-6xl">
            {header.title.toUpperCase()}
          </h2>

          <div className="mx-auto mt-3 h-[2px] w-24 bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />

          <p className="mt-2 max-w-xl mx-auto text-sm text-stone-600 md:mt-3 md:text-base font-light tracking-wide">
            {header.subtitle}
          </p>
        </div>

        {/* GRID - Classic Card Design */}
        <div className="grid gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
          {cards.map((kat) => {
            const Icon = FALLBACK_ICON[kat.id] ?? Package;
            
            return (
              <Link
                key={kat.id}
                href={kat.href || "/belanja"}
                className="group relative overflow-hidden rounded-lg border border-stone-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-amber-700/30 hover:shadow-md md:rounded-xl md:p-8"
              >
                {/* Subtle top accent line */}
                <div className="absolute left-0 top-0 h-[3px] w-full bg-gradient-to-r from-amber-700/0 via-amber-700/20 to-amber-700/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  
                  {/* LEFT */}
                  <div className="flex items-start gap-4 md:gap-5">
                    
                    {/* ICON - Classic style with subtle background */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-800 transition-all duration-300 group-hover:bg-amber-100 md:h-16 md:w-16">
                      <Icon className="h-6 w-6 md:h-8 md:w-8" />
                    </div>

                    {/* TEXT */}
                    <div>
                      <h3 className="font-bebas text-xl tracking-wide text-stone-800 md:text-2xl">
                        {kat.nama}
                      </h3>

                      <p className="mt-2 max-w-xs text-xs leading-relaxed text-stone-500 md:mt-2 md:text-sm font-light">
                        {kat.deskripsi}
                      </p>

                      {/* CTA - Understated */}
                      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-800 md:mt-4 uppercase tracking-wider">
                        {kat.ctaText}
                        <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>

                  {/* IMAGE - Classic presentation with click-to-zoom */}
                  <div className="relative mx-auto h-[120px] w-[120px] shrink-0 md:h-[160px] md:w-[160px]">
                    {kat.image ? (
                      <KategoriImage src={kat.image} alt={kat.nama} />
                    ) : (
                      <KategoriPlaceholder iconId={kat.id} />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Image dengan error handling + klik untuk zoom fullscreen */
function KategoriImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  if (failed) {
    return <KategoriPlaceholder iconId="" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setZoomed(true); }}
        className="group/img absolute inset-0 cursor-zoom-in focus:outline-none"
        aria-label={`Perbesar gambar ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain transition-transform duration-500 group-hover/img:scale-105"
          onError={() => setFailed(true)}
        />
        {/* Overlay icon kaca pembesar saat hover */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover/img:opacity-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm shadow-lg md:h-11 md:w-11">
            <ZoomIn className="h-4 w-4 md:h-5 md:w-5" />
          </div>
        </div>
      </button>
      {zoomed && (
        <ImageLightbox src={src} alt={alt} onClose={() => setZoomed(false)} />
      )}
    </>
  );
}