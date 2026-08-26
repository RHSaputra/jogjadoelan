"use client";

import { useLandingLive, resolveIcon, renderTitle } from "@/lib/use-landing-live";

export function KeunggulanSection() {
  const c = useLandingLive().keunggulan;
  const { header, items, footnote } = c;

  return (
    <section className="relative overflow-hidden bg-paper pt-8 pb-4 md:pt-10 md:pb-6">
      <div className="pointer-events-none absolute inset-0 bg-stripes-vintage opacity-60" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-brass to-transparent" />
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-brand-brass" />
            <span className="font-bebas text-xs tracking-[0.3em] text-brand-brass">{header.eyebrow}</span>
            <span className="h-px w-10 bg-brand-brass" />
          </div>
          <h2 className="font-bebas text-4xl leading-tight text-jet md:text-6xl">
            {renderTitle(header.title, header.titleHighlight)}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-brand-smoke md:text-base">{header.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-5 md:mt-16 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item, idx) => {
            const Icon = resolveIcon(item.iconKey);
            const num = String(idx + 1).padStart(2, "0");
            return (
              <article key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-[28px] border-2 border-brand-brass/30 bg-charcoal-gradient text-canvas shadow-pop transition-all duration-300 hover:border-brand-brass hover:shadow-rust"
                style={{ clipPath: "polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px))" }}>
                <div className="pointer-events-none absolute inset-0 bg-grain-dark opacity-40 mix-blend-overlay" />
                <div className="pointer-events-none absolute -right-12 top-6 h-12 w-48 rotate-[-35deg] opacity-25"
                  style={{ backgroundImage: "repeating-linear-gradient(90deg, #C9521E 0 12px, transparent 12px 24px)" }} />
                <span className="pointer-events-none absolute left-3 top-3 h-2 w-2 rounded-full bg-brand-brass shadow-[0_0_0_1px_rgba(0,0,0,0.4),inset_-1px_-1px_2px_rgba(0,0,0,0.5)]" />
                <span className="pointer-events-none absolute right-3 top-3 h-2 w-2 rounded-full bg-brand-brass shadow-[0_0_0_1px_rgba(0,0,0,0.4),inset_-1px_-1px_2px_rgba(0,0,0,0.5)]" />
                <span className="pointer-events-none absolute bottom-3 left-3 h-2 w-2 rounded-full bg-brand-brass shadow-[0_0_0_1px_rgba(0,0,0,0.4),inset_-1px_-1px_2px_rgba(0,0,0,0.5)]" />
                <span className="pointer-events-none absolute bottom-3 right-3 h-2 w-2 rounded-full bg-brand-brass shadow-[0_0_0_1px_rgba(0,0,0,0.4),inset_-1px_-1px_2px_rgba(0,0,0,0.5)]" />

                <div className="relative flex items-start justify-between px-6 pt-7">
                  <span className="font-bebas text-[64px] leading-none tracking-tight text-transparent md:text-[72px]" style={{ WebkitTextStroke: "2px #C9521E" }}>{num}</span>
                  <span className="mt-2 font-bebas text-[10px] tracking-[0.3em] text-brand-brass-light">
                    NO. {num}<br /><span className="text-brand-paper/40">/ {String(items.length).padStart(2, "0")}</span>
                  </span>
                </div>
                <div className="relative mx-6 mt-3 h-px bg-gradient-to-r from-transparent via-brand-brass/60 to-transparent" />
                <div className="relative flex justify-center px-6 pt-6">
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-brand-brass bg-jet shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),0_4px_12px_rgba(184,136,74,0.25)]">
                    {item.iconKey?.startsWith("data:") || item.iconKey?.startsWith("http") || item.iconKey?.startsWith("/") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.iconKey} alt={item.judul} className="h-full w-full object-cover transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                    ) : (
                      <Icon className="h-7 w-7 text-brand-brass-light transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                    )}
                    <span className="pointer-events-none absolute -inset-1.5 rounded-full border border-brand-brass/0 transition-all duration-300 group-hover:border-brand-rust/60" />
                  </div>
                </div>
                <div className="relative flex flex-1 flex-col items-center gap-2 px-6 pb-8 pt-4 text-center">
                  <h3 className="font-bebas text-2xl tracking-wider text-canvas md:text-[26px]">{item.judul.toUpperCase()}</h3>
                  <p className="text-xs leading-relaxed text-brand-paper/65 md:text-[13px] md:leading-[1.7]">{item.deskripsi}</p>
                </div>
                <div className="relative border-t border-dashed border-brand-brass/20 bg-brand-jet/60 px-6 py-2.5 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="font-bebas text-[9px] tracking-[0.25em] text-brand-brass">JOGJADOELAN · REG.{num}/2019</span>
                    <span className="font-bebas text-[9px] tracking-[0.25em] text-brand-brass-light">★ VERIFIED</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-12 flex items-center justify-center gap-3 text-center">
          <span className="h-px w-10 bg-brand-brass/40" />
          <span className="font-bebas text-xs tracking-[0.3em] text-brand-smoke">{footnote}</span>
          <span className="h-px w-10 bg-brand-brass/40" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-brass to-transparent" />
    </section>
  );
}