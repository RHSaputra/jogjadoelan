"use client";

import { useLandingLive, resolveIcon, renderTitle } from "@/lib/use-landing-live";

export function PartnerSection() {
  const c = useLandingLive().partner;
  const { header, cards, footnoteTitle, footnoteText } = c;

  return (
    <section className="relative overflow-hidden bg-[#f8f4ee] py-8 md:py-10">
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-300 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-200 blur-3xl" />
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-brass to-transparent" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-brand-brass" />
            <span className="font-bebas text-xs tracking-[0.3em] text-brand-brass">{header.eyebrow}</span>
            <span className="h-px w-10 bg-brand-brass" />
          </div>
          <h2 className="font-bebas text-4xl leading-tight text-jet md:text-6xl">
            {renderTitle(header.title, header.titleHighlight)}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-brand-smoke md:text-base">{header.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((item) => {
            const Icon = resolveIcon(item.iconKey);
            return (
              <article key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand-line bg-canvas shadow-vintage transition-all duration-300 hover:-translate-y-1 hover:border-brand-brass hover:shadow-pop">
                <span className="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 border-l-2 border-t-2 border-brand-brass/60" />
                <span className="pointer-events-none absolute right-3 top-3 z-10 h-4 w-4 border-r-2 border-t-2 border-brand-brass/60" />
                <span className="pointer-events-none absolute bottom-3 left-3 z-10 h-4 w-4 border-b-2 border-l-2 border-brand-brass/60" />
                <span className="pointer-events-none absolute bottom-3 right-3 z-10 h-4 w-4 border-b-2 border-r-2 border-brand-brass/60" />

                <div className="relative flex flex-col items-center bg-vintage-gradient px-6 pb-6 pt-10">
                  <div className="pointer-events-none absolute inset-0 bg-grain opacity-30 mix-blend-multiply" />
                  <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-brand-brass bg-canvas shadow-vintage md:h-28 md:w-28">
                    {item.iconKey?.startsWith("data:") || item.iconKey?.startsWith("http") || item.iconKey?.startsWith("/") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.iconKey} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <Icon className="h-10 w-10 text-rust md:h-12 md:w-12" />
                    )}
                    <span className="pointer-events-none absolute -inset-1 rounded-full border border-brand-brass/30" />
                  </div>
                  <h3 className="relative mt-4 text-center font-bebas text-2xl tracking-wider text-jet md:text-3xl">{item.title}</h3>
                  <span className="relative mt-2 h-0.5 w-12 bg-gradient-to-r from-transparent via-brand-brass to-transparent" />
                  <p className="mt-3 text-center text-xs tracking-wide text-brand-smoke/80 md:text-sm">{item.subtitle}</p>
                </div>

                <div className="flex flex-1 flex-col gap-3 border-t border-brand-line/60 bg-canvas p-5 md:p-6">
                  <p className="font-bebas text-[10px] tracking-[0.3em] text-brand-brass">JOGJADOELAN VINTAGE CULTURE</p>
                  <p className="text-sm leading-relaxed text-brand-smoke/90 md:text-[14px] md:leading-[1.7]">{item.description}</p>
                  <div className="mt-auto flex items-center gap-2 border-t border-brand-line/50 pt-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brass text-jet">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="font-bebas text-[11px] tracking-[0.2em] text-brand-smoke">{item.badge}</span>
                  </div>
                </div>
                <div className="h-1 w-full bg-gradient-to-r from-brand-rust via-brand-brass to-brand-rust opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </article>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 border-t border-brand-brass/20 pt-5 text-center">
          <span className="font-bebas text-xs tracking-[0.3em] text-brand-brass">{footnoteTitle}</span>
          <p className="max-w-md text-xs text-brand-smoke/100">{footnoteText}</p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-brass to-transparent" />
    </section>
  );
}