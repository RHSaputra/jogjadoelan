"use client";

import { useState } from "react";
import { ImageIcon, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export type CustomSectionTone =
  | "orange"
  | "coral"
  | "amber"
  | "mint"
  | "sky"
  | "violet"
  | "rose"
  | "lime";

interface ToneStyle {
  card: string;
  hover: string;
  blob: string;
  dot: string;
  badge: string;
}

const TONE: Record<CustomSectionTone, ToneStyle> = {
  orange: {
    card: "border-zinc-200 bg-white",
    hover: "hover:border-zinc-900 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5",
    blob: "hidden",
    dot: "bg-brand-orange drop-shadow-[0_0_6px_rgba(255,107,26,0.5)]",
    badge: "bg-zinc-100/80 text-zinc-800 ring-1 ring-zinc-900/10",
  },
  coral: {
    card: "border-rose-100/50 bg-white/70",
    hover: "hover:border-rose-300/80 hover:shadow-[0_8px_30px_rgb(244,63,94,0.12)] hover:-translate-y-0.5",
    blob: "bg-rose-400",
    dot: "bg-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]",
    badge: "bg-rose-100/80 text-rose-700 ring-1 ring-rose-200/50",
  },
  amber: {
    card: "border-amber-100/50 bg-white/70",
    hover: "hover:border-amber-300/80 hover:shadow-[0_8px_30px_rgb(245,158,11,0.12)] hover:-translate-y-0.5",
    blob: "bg-amber-400",
    dot: "bg-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]",
    badge: "bg-amber-100/80 text-amber-800 ring-1 ring-amber-200/50",
  },
  mint: {
    card: "border-emerald-100/50 bg-white/70",
    hover: "hover:border-emerald-300/80 hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)] hover:-translate-y-0.5",
    blob: "bg-emerald-400",
    dot: "bg-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]",
    badge: "bg-emerald-100/80 text-emerald-700 ring-1 ring-emerald-200/50",
  },
  sky: {
    card: "border-sky-100/50 bg-white/70",
    hover: "hover:border-sky-300/80 hover:shadow-[0_8px_30px_rgb(14,165,233,0.12)] hover:-translate-y-0.5",
    blob: "bg-sky-400",
    dot: "bg-sky-500 drop-shadow-[0_0_6px_rgba(14,165,233,0.5)]",
    badge: "bg-sky-100/80 text-sky-700 ring-1 ring-sky-200/50",
  },
  violet: {
    card: "border-violet-100/50 bg-white/70",
    hover: "hover:border-violet-300/80 hover:shadow-[0_8px_30px_rgb(139,92,246,0.12)] hover:-translate-y-0.5",
    blob: "bg-violet-400",
    dot: "bg-violet-500 drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]",
    badge: "bg-violet-100/80 text-violet-700 ring-1 ring-violet-200/50",
  },
  rose: {
    card: "border-pink-100/50 bg-white/70",
    hover: "hover:border-pink-300/80 hover:shadow-[0_8px_30px_rgb(236,72,153,0.12)] hover:-translate-y-0.5",
    blob: "bg-pink-400",
    dot: "bg-pink-500 drop-shadow-[0_0_6px_rgba(236,72,153,0.5)]",
    badge: "bg-pink-100/80 text-pink-700 ring-1 ring-pink-200/50",
  },
  lime: {
    card: "border-lime-100/50 bg-white/70",
    hover: "hover:border-lime-300/80 hover:shadow-[0_8px_30px_rgb(132,204,22,0.12)] hover:-translate-y-0.5",
    blob: "bg-lime-400",
    dot: "bg-lime-500 drop-shadow-[0_0_6px_rgba(132,204,22,0.5)]",
    badge: "bg-lime-100/80 text-lime-700 ring-1 ring-lime-200/50",
  },
};

export function CustomSection({
  title,
  preview,
  children,
  badge,
  imageSrc,
  imageAlt,
  imageDesc,
  tone = "orange",
  className,
}: {
  title: string;
  preview?: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  imageDesc?: string;
  tone?: CustomSectionTone;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const t = TONE[tone];

  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-[24px] border p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-xl transition-all duration-500 md:p-6",
        t.card,
        t.hover,
        className,
      )}
    >
      {/* Ambient Glow Kanan-Bawah */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full opacity-10 blur-[60px] transition-opacity duration-700 group-hover:opacity-25",
          t.blob,
        )}
      />
      {/* Ambient Glow Kiri-Atas */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full opacity-[0.08] blur-[50px] transition-opacity duration-700 group-hover:opacity-20",
          t.blob,
        )}
      />

      {/* === HEADER === */}
      <header className="relative z-10 mb-5 flex items-center justify-between gap-4 border-b border-zinc-900/10 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={cn("h-2.5 w-2.5 shrink-0 rounded-full", t.dot)}
          />
          <h3 className="truncate text-[13px] font-black uppercase tracking-widest text-zinc-800">
            {title}
          </h3>
          {badge && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide shadow-sm",
                t.badge,
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {/* === IMAGE PREVIEW TRIGGER === */}
        <div className="flex shrink-0 items-center justify-end">
          {imageSrc ? (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label={`Lihat contoh ${title}`}
                  className={cn(
                    "group/preview relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] border border-zinc-900/10 bg-white shadow-sm transition-all duration-300 hover:scale-105 hover:border-zinc-900 hover:shadow-md md:h-14 md:w-14",
                  )}
                >
                  {!imgError ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageSrc}
                      alt={imageAlt || title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover/preview:scale-110"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-50 text-zinc-300">
                      <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-[13px] bg-black/0 backdrop-blur-none transition-all duration-300 group-hover/preview:bg-black/20 group-hover/preview:backdrop-blur-[2px]">
                    <ZoomIn className="h-5 w-5 scale-50 text-white opacity-0 transition-all duration-300 group-hover/preview:scale-100 group-hover/preview:opacity-100" />
                  </div>
                </button>
              </DialogTrigger>

              {/* === DIALOG CONTENT === */}
              <DialogContent className="max-w-2xl overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-2xl">
                <div className="relative w-full bg-zinc-50/50">
                  {!imgError ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageSrc}
                      alt={imageAlt || title}
                      className="h-auto max-h-[70vh] w-full object-contain drop-shadow-md"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 text-zinc-400">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100">
                        <ImageIcon className="h-10 w-10" strokeWidth={1.5} />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest">Gambar belum tersedia</p>
                    </div>
                  )}
                </div>
                <DialogHeader className="bg-white px-8 pb-8 pt-6 text-left">
                  <DialogTitle className="flex items-center gap-2.5 text-xl font-black text-zinc-900">
                    <span className={cn("h-3 w-3 rounded-full", t.dot)} />
                    Contoh {title}
                  </DialogTitle>
                  {imageDesc && (
                    <DialogDescription className="mt-2 text-sm leading-relaxed text-zinc-500">
                      {imageDesc}
                    </DialogDescription>
                  )}
                </DialogHeader>
              </DialogContent>
            </Dialog>
          ) : (
            preview
          )}
        </div>
      </header>

      {/* === BODY === */}
      <div className="relative z-10 space-y-4">{children}</div>
    </section>
  );
}