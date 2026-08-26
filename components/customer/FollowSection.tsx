"use client";

import { useLandingLive, resolveIcon } from "@/lib/use-landing-live";

const BG_MAP: Record<string, string> = {
  instagram: "",
  tiktok: "text-[#000000]",
  facebook: "text-[#1877F2]",
  whatsapp: "text-[#25D366]",
  chat: "text-[#FF6B1A]",
};

export function FollowSection() {
  const c = useLandingLive().follow;
  const { header, cards } = c;

  return (
    <section className="relative overflow-hidden bg-canvas pt-10 pb-8">
      <div className="pointer-events-none absolute inset-0 bg-halftone opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-brass to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-brass to-transparent" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="h-[2px] w-8 bg-brand-brass" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-brass">{header.eyebrow}</span>
            <div className="h-[2px] w-8 bg-brand-brass" />
          </div>
          <h2 className="font-bebas text-4xl tracking-wide text-jet md:text-5xl">
            {header.title.toUpperCase()}
          </h2>
          {header.subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-sm text-brand-smoke md:text-base">
              {header.subtitle}
            </p>
          )}
          {c.liveTicker && (
            <div className="mt-6 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-brass/30 bg-brand-brass/5 px-4 py-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rust opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rust"></span>
                </span>
                <span className="font-bebas text-[11px] tracking-[0.2em] text-rust">
                  {c.liveTicker}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((s) => {
            const Icon = resolveIcon(s.iconKey);
            const color = BG_MAP[s.iconKey] ?? "text-[#5B5B5B]";
            const href = s.iconKey === "chat" ? "/chat" : s.href || "#";
            return (
              <a
                key={s.id}
                href={href}
                aria-label={`Follow di ${s.label}`}
                className="group flex flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-brand-brass/30 bg-paper-deep p-6 text-center shadow-vintage transition duration-300 hover:-translate-y-1 hover:border-brand-brass hover:shadow-rust"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-brass/20 bg-white ${color} shadow-sm md:h-20 md:w-20 md:rounded-3xl`}>
                  <Icon className="h-8 w-8 md:h-10 md:w-10" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-bebas text-sm uppercase tracking-[0.2em] text-jet">
                    {s.label}
                  </span>
                  <span className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-brand-brass">{s.followers}</span>
                </div>
                <p className="text-xs leading-relaxed text-brand-smoke/80 line-clamp-3">
                  {s.desc}
                </p>
              </a>
            );
          })}
        </div>

        {(c.ribbonText || c.ribbonNote) && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 border-t border-brand-brass/20 pt-6 text-center">
            {c.ribbonText && <span className="font-bebas text-sm tracking-[0.3em] text-brand-brass md:text-base">{c.ribbonText}</span>}
            {c.ribbonNote && <p className="max-w-md text-xs text-brand-smoke/90">{c.ribbonNote}</p>}
          </div>
        )}
      </div>
    </section>
  );
}


