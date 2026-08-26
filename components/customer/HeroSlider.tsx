"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeroSlide } from "@/lib/admin-toko-master-helpers";
import { useLandingLive } from "@/lib/use-landing-live";

const AUTO_PLAY_MS = 6000;

export function HeroSlider() {
  const [active, setActive] = useState(0);
  const landing = useLandingLive();

  const HERO_SLIDES = useMemo(() => {
    const slides = landing.heroSlides;
    if (Array.isArray(slides) && slides.length > 0) {
      return slides
        .filter((s: { aktif?: boolean; title?: string; subtitle?: string }) =>
          s.aktif !== false && (s.title || s.subtitle)
        )
        .sort((a: { urutan?: number }, b: { urutan?: number }) =>
          (a.urutan ?? 0) - (b.urutan ?? 0)
        );
    }
    return [];
  }, [landing.heroSlides]);
  const [bgError, setBgError] = useState<Record<number, boolean>>({});
  const [fgError, setFgError] = useState<Record<number, boolean>>({});
  const total = HERO_SLIDES.length;

  useEffect(() => {
    if (total <= 1) return;

    const t = setInterval(
      () => setActive((i) => (i + 1) % total),
      AUTO_PLAY_MS,
    );

    return () => clearInterval(t);
  }, [total]);

  const prev = () => setActive((i) => (i - 1 + total) % total);

  const next = () => setActive((i) => (i + 1) % total);

  // Jika tidak ada slide dari admin, tampilkan placeholder putih dengan band netral
  if (total === 0) {
    return (
      <section className="relative w-full overflow-hidden pt-0" aria-hidden>
        <div className="relative h-[520px] overflow-hidden bg-white md:h-[720px]">
          {/* Hanya area kosong visual — tidak ada teks atau CTA */}
          <div className="h-full w-full" />

          {/* warna band di bawah — netral, bukan blue navy */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-zinc-800 via-zinc-400 to-zinc-100 opacity-95" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden pt-0">
      
      {/* WRAPPER */}
      <div className="relative h-[520px] overflow-hidden bg-white md:h-[720px]">

        {/* === SLIDING TRACK === */}
        <div
          className="flex h-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {HERO_SLIDES.map((slide, idx) => {
            // Support both legacy Indonesian shape and admin English shape
            const s = slide as unknown as HeroSlide & Partial<{
              judul: string;
              subjudul: string;
              title: string;
              subtitle: string;
              ctaLink: string;
              href: string;
            }>;

            const id = s.id ?? `slide-${idx}`;
            const title = s.judul ?? s.title ?? "";
            const subtitle = s.subjudul ?? s.subtitle ?? "";
            const cta = s.cta ?? s.cta ?? "";
            const rawHref = s["href"] ?? s.ctaLink ?? "/";

            // Normalisasi link promo agar tidak mengarah ke route yang tidak ada (404)
            // Target: "buat promo"/"buat voucher"/"create promo" selalu ke /promo.
            const linkTarget = (() => {
              const h = String(rawHref ?? "").trim();
              if (!h) return "/promo";

              const lower = h.toLowerCase();

              const looksLikeCreatePromo =
                (lower.includes("buat") && lower.includes("promo")) ||
                (lower.includes("create") && lower.includes("promo")) ||
                (lower.includes("promo") &&
                  (lower.includes("create") || lower.includes("buat"))) ||
                lower.includes("promo/create") ||
                lower.includes("promo-buat") ||
                lower.includes("buat-promo");

              return looksLikeCreatePromo ? "/promo" : h;
            })();

            const bgUrl = slide.bgImage || slide.image || "";
            const fgUrl = slide.image || slide.bgImage || "";

            const bgOk = bgUrl && !bgError[idx];
            const fgOk = fgUrl && !fgError[idx];

            return (
              <div
                key={id}
                className="relative h-full w-full shrink-0"
              >
                
                {/* === BG IMAGE === */}
                <div className="absolute inset-0 overflow-hidden">
                  {bgOk ? (
                    <Image
                      src={bgUrl}
                      alt=""
                      fill
                      priority={idx === 0}
                      sizes="100vw"
                      className="scale-110 object-cover brightness-[0.65]"
                      onError={() =>
                        setBgError((s) => ({ ...s, [idx]: true }))
                      }
                    />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-100" />
                  )}

                  {/* OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/10 md:from-black/55 md:via-black/15 md:to-black/5" />
                </div>

                {/* === CONTENT === */}
                <div className="relative z-10 flex h-full w-full flex-col justify-between px-5 py-10 md:flex-row md:items-center md:px-24 md:py-16">

                  {/* LEFT */}
                  <div className="mt-5 min-h-[90px] max-w-2xl text-lg leading-relaxed text-white/90 md:min-h-0 md:text-3xl">
                    
                    <h1 className="max-w-4xl font-bebas text-5xl leading-[0.95] tracking-wide text-white drop-shadow-2xl md:text-8xl">
                      {title}
                    </h1>

                    <p className="mt-5 min-h-[96px] max-w-2xl text-lg leading-relaxed text-white/90 md:min-h-0 md:text-3xl">
                      {subtitle}
                    </p>

                    {/* BUTTONS */}
                    <div className="mt-14 flex flex-wrap items-center gap-3">

                       <Button
                        asChild
                        size="lg"
                        className="h-10 rounded-full bg-brand-orange px-3 text-base font-black text-white shadow-2xl transition-all hover:scale-[1.03] hover:bg-brand-orange-light md:h-16 md:px-9 md:text-lg"
                      >
                        <Link href={linkTarget}>
                          {cta}
                        </Link>
                      </Button>

                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="h-10 rounded-full border-zinc-200 bg-white/90 px-3 text-base font-bold text-zinc-800 shadow-lg backdrop-blur-sm transition-all hover:border-zinc-600 hover:bg-white hover:text-zinc-700 md:h-16 md:px-9 md:text-lg"
                      >
                        <Link href="/tentang">
                          <Info className="mr-2 h-5 w-5" />
                          Tentang Kami
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* RIGHT IMAGE */}
                  <div className="relative mt-8 hidden aspect-square w-full max-w-[450px] items-center justify-center overflow-hidden rounded-[36px] border border-orange-200 bg-[#4f3e30] shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex">

                    {fgOk ? (
                      <Image
                        src={fgUrl}
                        alt={title ?? cta ?? "Banner"}
                        fill
                        priority={idx === 0}
                        sizes="450px"
                        className="object-contain p-7 transition-transform duration-300 hover:scale-105"
                        onError={() =>
                          setFgError((s) => ({ ...s, [idx]: true }))
                        }
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <ImageIcon
                          className="h-24 w-24"
                          strokeWidth={1.2}
                        />

                        <span className="text-sm font-medium">
                          Foto Banner
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* === NAVIGATION BUTTONS === */}
        {total > 1 && (
          <>
            {/* PREV */}
            <button
              onClick={prev}
              aria-label="Slide sebelumnya"
              className="absolute left-3 md:top-[50%] top-[64%] z-20 flex h-7 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-orange-200 bg-brand-orange text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-brand-orange-light md:left-8 md:h-10 md:w-12"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            {/* NEXT */}
            <button
              onClick={next}
              aria-label="Slide berikutnya"
              className="absolute right-3 md:top-[50%] top-[64%] z-20 flex h-7 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-orange-200 bg-brand-orange text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-brand-orange-light md:right-8 md:h-10 md:w-12"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </>
        )}

        {/* === DOTS === */}
        {total > 1 && (
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2 md:bottom-10">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300",
                     i === active
                        ? "w-3 md:w-8 bg-brand-orange"
                        : "w-2.5 bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}