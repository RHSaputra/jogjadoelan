"use client";

import Link from "next/link";
import { MapPin, Clock, ArrowUpRight, Compass } from "lucide-react";
import { useEffect, useState } from "react";
import { useLandingLive, renderTitle } from "@/lib/use-landing-live";
import { getKontakAsync, getCabangListAsync, getIdentitasAsync } from "@/lib/admin-toko-master-helpers";
import { TOKO_INFO } from "@/lib/constants";

interface TokoInfo {
  nama: string;
  alamat: string;
  jamOperasional: string;
}

const TOKO_INFO_DEFAULT: TokoInfo = {
  nama: TOKO_INFO.nama,
  alamat: TOKO_INFO.alamat,
  jamOperasional: TOKO_INFO.jamOperasional,
};

export function InfoTokoSection() {
  const c = useLandingLive().infoToko;
  const { header, labelAlamat, labelJam, ctaMapsText, jamCatatan, footnote } = c;

  const [tokoInfo, setTokoInfo] = useState<TokoInfo>(TOKO_INFO_DEFAULT);

  useEffect(() => {
    let cancelled = false;

    async function loadTokoInfo() {
      try {
        const [, cabangList, identitas] = await Promise.all([
          getKontakAsync(),
          getCabangListAsync(),
          getIdentitasAsync(),
        ]);

        if (cancelled) return;

        const cabang = cabangList.find((c) => c.utama) ?? cabangList[0] ?? null;

        setTokoInfo({
          nama: identitas.namaToko || TOKO_INFO.nama,
          alamat: cabang
            ? `${cabang.alamat}, ${cabang.kota} ${cabang.kodePos}`.replace(/^, |, $/g, "")
            : TOKO_INFO.alamat,
          jamOperasional: cabang
            ? `${cabang.hariBuka}, ${cabang.jamBuka} - ${cabang.jamTutup}`
            : TOKO_INFO.jamOperasional,
        });
      } catch {
        if (!cancelled) setTokoInfo(TOKO_INFO_DEFAULT);
      }
    }

    void loadTokoInfo();

    const sync = () => void loadTokoInfo();
    window.addEventListener("jogjadoelan_kontak_changed", sync);
    window.addEventListener("jogjadoelan_cabang_changed", sync);
    window.addEventListener("jogjadoelan_identitas_changed", sync);

    return () => {
      cancelled = true;
      window.removeEventListener("jogjadoelan_kontak_changed", sync);
      window.removeEventListener("jogjadoelan_cabang_changed", sync);
      window.removeEventListener("jogjadoelan_identitas_changed", sync);
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-canvas pt-8 pb-4 md:pt-10 md:pb-6">
      <div className="pointer-events-none absolute inset-0 bg-halftone opacity-30" />
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

        <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-2">
          {/* CARD 1 — ALAMAT */}
          <Link href="/lokasi" aria-label="Lihat detail lokasi toko"
            className="group relative flex overflow-hidden rounded-[28px] border-2 border-brand-brass/40 bg-paper-deep shadow-vintage transition-all duration-300 hover:-translate-y-1 hover:border-brand-brass hover:shadow-rust">
            <span className="pointer-events-none absolute inset-1.5 rounded-[22px] border border-brand-brass/30" />
            <div className="relative flex w-32 shrink-0 flex-col items-center justify-center bg-tank-gradient p-5 md:w-44">
              <div className="pointer-events-none absolute inset-0 bg-grain-dark opacity-50 mix-blend-overlay" />
              <Compass className="absolute h-32 w-32 text-brand-brass/20 md:h-44 md:w-44" strokeWidth={1} />
              <span className="absolute h-24 w-24 rounded-full border border-brand-brass/15 md:h-32 md:w-32" />
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-brass bg-jet shadow-[0_4px_20px_rgba(184,136,74,0.4)] transition-transform duration-500 group-hover:scale-110 md:h-20 md:w-20">
                <MapPin className="h-7 w-7 text-brand-brass-light md:h-9 md:w-9" />
              </div>
              <span className="relative z-10 mt-3 font-bebas text-[10px] tracking-[0.3em] text-brand-brass-light">LOKASI</span>
            </div>
            <div className="relative flex flex-1 flex-col justify-between gap-3 p-5 md:p-6">
              <div>
                <p className="font-bebas text-[10px] tracking-[0.3em] text-brand-brass">{labelAlamat}</p>
                <h3 className="mt-1 font-bebas text-2xl tracking-wider text-jet md:text-3xl">{tokoInfo.nama.toUpperCase()}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-smoke md:text-[14px] md:leading-[1.7]">{tokoInfo.alamat}</p>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-brand-brass/30 pt-3">
                <span className="font-bebas text-xs tracking-[0.25em] text-rust">{ctaMapsText}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rust text-canvas shadow-rust transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>

          {/* CARD 2 — JAM OPERASIONAL */}
          <Link href="/lokasi" aria-label="Lihat detail lokasi toko"
            className="group relative flex overflow-hidden rounded-[28px] border-2 border-brand-brass/40 bg-paper-deep shadow-vintage transition-all duration-300 hover:-translate-y-1 hover:border-brand-brass hover:shadow-rust">
            <span className="pointer-events-none absolute inset-1.5 rounded-[22px] border border-brand-brass/30" />
            <div className="relative flex w-32 shrink-0 flex-col items-center justify-center bg-tank-gradient p-5 md:w-44">
              <div className="pointer-events-none absolute inset-0 bg-grain-dark opacity-50 mix-blend-overlay" />
              <span className="absolute h-32 w-32 rounded-full border-2 border-brand-brass/20 md:h-44 md:w-44" />
              <span className="absolute h-24 w-24 rounded-full border border-brand-brass/15 md:h-32 md:w-32" />
              {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg) => (
                <span key={deg} className="absolute h-1.5 w-0.5 bg-brand-brass/40"
                  style={{ transform: `rotate(${deg}deg) translateY(-66px)`, transformOrigin: "center" }} />
              ))}
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-brass bg-jet shadow-[0_4px_20px_rgba(184,136,74,0.4)] transition-transform duration-500 group-hover:rotate-[360deg] md:h-20 md:w-20">
                <Clock className="h-7 w-7 text-brand-brass-light md:h-9 md:w-9" />
              </div>
              <span className="relative z-10 mt-3 font-bebas text-[10px] tracking-[0.3em] text-brand-brass-light">JAM BUKA</span>
            </div>
            <div className="relative flex flex-1 flex-col justify-between gap-3 p-5 md:p-6">
              <div>
                <p className="font-bebas text-[10px] tracking-[0.3em] text-brand-brass">{labelJam}</p>
                <h3 className="mt-1 font-bebas text-2xl tracking-wider text-jet md:text-3xl">KAMI BUKA</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-smoke md:text-[14px] md:leading-[1.7]">{tokoInfo.jamOperasional}</p>
                <p className="mt-1 text-xs italic text-brand-smoke/60">{jamCatatan}</p>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-brand-brass/30 pt-3">
                <span className="font-bebas text-xs tracking-[0.25em] text-rust">LIHAT LOKASI WORKSHOP</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rust text-canvas shadow-rust transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
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