"use client";

import { cn } from "@/lib/utils";

export function CustomSection({
  title,
  preview,
  children,
  badge,
  className,
}: {
  title: string;
  /** Preview ringkas di header kanan (chip/lingkaran kecil/badge teks). */
  preview?: React.ReactNode;
  children: React.ReactNode;
  /** Opsional badge di samping title (mis. "wajib", "opsional"). */
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-brand-line bg-white p-5 shadow-soft transition-all hover:border-brand-orange/30 hover:shadow-orange-sm md:p-6",
        className,
      )}
    >
      {/* Decorative gradient hairline kiri (subtle, hanya saat hover) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-orange-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* === HEADER: title kiri, preview kanan, inline === */}
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-black uppercase tracking-wide text-brand-black md:text-[15px]">
            {title}
          </h3>
          {badge && (
            <span className="shrink-0 rounded-full bg-brand-mist px-2 py-0.5 text-[10px] font-bold text-brand-ink/70">
              {badge}
            </span>
          )}
        </div>

        {preview && (
          <div className="flex shrink-0 items-center justify-end">
            {preview}
          </div>
        )}
      </header>

      {/* === BODY: full width, tidak terpotong sidebar === */}
      <div className="space-y-3">{children}</div>
    </section>
  );
}