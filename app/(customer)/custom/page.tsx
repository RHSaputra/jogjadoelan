"use client"
import { logger } from "@/lib/logger";
;

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronDown, Info } from "lucide-react";
import { useCustomOrder } from "@/lib/custom-order-context";
import { CustomSection } from "@/components/customer/custom/CustomSection";
import { ColorPicker } from "@/components/customer/custom/ColorPicker";
import { FileUploadArea } from "@/components/customer/custom/FileUploadArea";
import {
  CUSTOM_FORM_DEFAULT,
  getCustomFormAsync,
  type CustomFormConfig,
  type CustomSectionOption,
} from "@/lib/admin-custom-options";
import { subscribeSync } from "@/lib/sync-events";
import { useEffect, useState, useCallback, Suspense } from "react";

// Select kustom agar panah bawaan hilang dan rapi
const selectClass =
  "w-full appearance-none rounded-xl border border-brand-krem bg-white py-3 pl-4 pr-12 text-sm font-medium text-brand-black shadow-sm outline-none transition-all focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 cursor-pointer";

/** Hook: baca konfigurasi form custom dari DB & auto-refresh saat admin simpan */
function useCustomFormConfig(): CustomFormConfig {
  const [cfg, setCfg] = useState<CustomFormConfig>(CUSTOM_FORM_DEFAULT);

  const refresh = useCallback(() => {
    getCustomFormAsync()
      .then((latest) => {
        setCfg(latest);
      })
      .catch(() => {
        // fallback ke default
      });
  }, []);

  useEffect(() => {
    const t = setTimeout(refresh, 0);
    const unsub = subscribeSync("custom", refresh);
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [refresh]);

  return cfg;
}

function CustomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, updateDraft } = useCustomOrder();
  const cfg = useCustomFormConfig();

  const [hasHydrated, setHasHydrated] = useState(false);

  // Helper: ambil first option label sebagai fallback
  const getFirstOption = (section: CustomSectionOption | undefined) =>
    section?.options?.[0]?.label ?? "";

  // === EFEK "BELI LAGI" (REORDER) ===
  useEffect(() => {
    if (hasHydrated) return;

    const isReorder = searchParams.get("reorder");
    if (isReorder === "true") {
      const pUkuran = searchParams.get("ukuran");
      const pWarna = searchParams.get("warna");
      const pJenis = searchParams.get("jenis");
      const pFinishing = searchParams.get("finishing");
      const pStrap = searchParams.get("strap");

      const updates: Record<string, string> = {};

      if (pUkuran && cfg.ukuran.options.some((o) => o.label === pUkuran)) updates.ukuran = pUkuran;
      if (pJenis && cfg.jenis.options.some((o) => o.label === pJenis)) updates.jenis = pJenis;
      if (pFinishing && cfg.finishing.options.some((o) => o.label === pFinishing)) updates.finishing = pFinishing;
      if (pStrap && cfg.strap.options.some((o) => o.label === pStrap)) updates.strap = pStrap;

      if (pWarna && draft.warnaList.length === 0) {
        updates.warnaCatatan = `Dari pesanan lama: ${pWarna}`;
      }

      if (Object.keys(updates).length > 0) {
        updateDraft(updates);
      }
    }
    void Promise.resolve().then(() => setHasHydrated(true));
  }, [searchParams, hasHydrated, updateDraft, draft.warnaList.length, cfg]);

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      {/* Header Normal */}
      <div className="relative border-b border-brand-krem bg-brand-cream-light pb-4 pt-6">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-brand-krem transition-colors hover:border-brand-orange hover:text-brand-orange">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-brand-black">
            Custom Helm
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl space-y-5 px-4 py-6">
        {/* --- ALERT INFO REORDER --- */}
        {searchParams.get("reorder") === "true" && (
          <div className="flex items-start gap-3 rounded-2xl border border-brand-orange/30 bg-orange-50 p-4 text-sm text-orange-900 shadow-sm">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
            <div>
              <strong className="block font-bold">Mode Beli Lagi Aktif.</strong>
              Kami telah mengisi beberapa pengaturan spesifikasi berdasarkan pesanan kamu sebelumnya. Silakan periksa kembali.
            </div>
          </div>
        )}

        {/* === SECTION: JENIS === */}
        <CustomSection
          title={cfg.jenis.title}
          preview={<span className="text-xs font-bold text-brand-black">{draft.jenis || getFirstOption(cfg.jenis)}</span>}
          imageSrc={cfg.jenis.imageUrl || "/custom/jenis.png"}
          imageDesc={cfg.jenis.description}
        >
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-brand-black/50">Pilih Jenis</label>
          <div className="relative">
            <select
              value={draft.jenis}
              onChange={(e) => updateDraft({ jenis: e.target.value })}
              className={selectClass}
            >
              {cfg.jenis.options.map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-black/40" />
          </div>
        </CustomSection>

        {/* === SECTION: WARNA === */}
        <CustomSection
          title="Warna Cat Luaran"
          preview={
            <div className="flex -space-x-1.5">
              {draft.warnaList.length === 0 ? (
                <div className="h-7 w-7 rounded-full border-2 border-dashed border-brand-krem" />
              ) : (
                draft.warnaList.slice(0, 5).map((w, i) => (
                  <div
                    key={i}
                    className="h-7 w-7 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: w.hex }}
                    title={w.nama || w.hex}
                  />
                ))
              )}
              {draft.warnaList.length > 5 && (
                <div className="z-10 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-brand-black px-1.5 text-[9px] font-black text-white shadow-sm">
                  +{draft.warnaList.length - 5}
                </div>
              )}
            </div>
          }
        >
          <ColorPicker
            warnaList={draft.warnaList}
            catatan={draft.warnaCatatan}
            onChange={(p) =>
              updateDraft({
                ...(p.warnaList !== undefined && { warnaList: p.warnaList }),
                ...(p.catatan !== undefined && { warnaCatatan: p.catatan }),
              })
            }
          />
        </CustomSection>

        {/* === SECTION: FINISHING === */}
        <CustomSection
          title={cfg.finishing.title}
          preview={<span className="text-xs font-bold text-brand-black">{draft.finishing || getFirstOption(cfg.finishing)}</span>}
          imageSrc={cfg.finishing.imageUrl || "/custom/finishing.png"}
          imageDesc={cfg.finishing.description}
        >
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-brand-black/50">Pilih Finishing</label>
          <div className="relative">
            <select
              value={draft.finishing}
              onChange={(e) => updateDraft({ finishing: e.target.value })}
              className={selectClass}
            >
              {cfg.finishing.options.map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-black/40" />
          </div>
        </CustomSection>

        {/* === SECTION: STRAP === */}
        <CustomSection
          title={cfg.strap.title}
          preview={<span className="text-xs font-bold text-brand-black">{draft.strap || getFirstOption(cfg.strap)}</span>}
          imageSrc={cfg.strap.imageUrl || "/custom/strap.png"}
          imageDesc={cfg.strap.description}
        >
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-brand-black/50">Pilih Strap</label>
          <div className="relative">
            <select
              value={draft.strap}
              onChange={(e) => updateDraft({ strap: e.target.value })}
              className={selectClass}
            >
              {cfg.strap.options.map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-black/40" />
          </div>
        </CustomSection>

        {/* === SECTION: UKURAN === */}
        <CustomSection
          title={cfg.ukuran.title}
          preview={<span className="text-xs font-bold text-brand-black">{draft.ukuran || getFirstOption(cfg.ukuran)}</span>}
          imageSrc={cfg.ukuran.imageUrl || "/custom/ukuran.png"}
          imageDesc={cfg.ukuran.description}
        >
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-brand-black/50">Pilih Ukuran</label>
          <div className="relative">
            <select
              value={draft.ukuran}
              onChange={(e) => updateDraft({ ukuran: e.target.value })}
              className={selectClass}
            >
              {cfg.ukuran.options.map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-black/40" />
          </div>
        </CustomSection>

        {/* === SECTION: MOTIF COVER BUSA === */}
        <CustomSection
          title={cfg.motifBusa.title}
          preview={<span className="text-xs font-bold text-brand-black">{draft.motifBusa || getFirstOption(cfg.motifBusa)}</span>}
          imageSrc={cfg.motifBusa.imageUrl || "/custom/motif-busa.png"}
          imageDesc={cfg.motifBusa.description}
        >
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-brand-black/50">Pilih Motif</label>
          <div className="relative">
            <select
              value={draft.motifBusa}
              onChange={(e) => updateDraft({ motifBusa: e.target.value })}
              className={selectClass}
            >
              {cfg.motifBusa.options.map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-black/40" />
          </div>
        </CustomSection>

        {/* === SECTION: BAHAN HELM === */}
        <CustomSection
          title={cfg.bahan.title}
          preview={<span className="text-xs font-bold text-brand-black">{draft.bahan || getFirstOption(cfg.bahan)}</span>}
          imageSrc={cfg.bahan.imageUrl || "/custom/bahan.png"}
          imageDesc={cfg.bahan.description}
        >
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-brand-black/50">Pilih Bahan Helm</label>
          <div className="relative">
            <select
              value={draft.bahan}
              onChange={(e) => updateDraft({ bahan: e.target.value })}
              className={selectClass}
            >
              {cfg.bahan.options.map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-black/40" />
          </div>
        </CustomSection>

        {/* === SECTION: AKSESORIS === */}
        <CustomSection
          title={cfg.aksesoris.title}
          preview={<span className="text-xs font-bold text-brand-black">{draft.aksesoris || getFirstOption(cfg.aksesoris)}</span>}
          imageSrc={cfg.aksesoris.imageUrl || "/custom/aksesoris.png"}
          imageDesc={cfg.aksesoris.description}
        >
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-brand-black/50">Pilih Aksesoris</label>
          <div className="relative">
            <select
              value={draft.aksesoris}
              onChange={(e) => updateDraft({ aksesoris: e.target.value })}
              className={selectClass}
            >
              {cfg.aksesoris.options.map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-black/40" />
          </div>
        </CustomSection>

        {/* --- AREA UPLOAD & CATATAN --- */}
        <div className="rounded-[24px] border border-brand-krem bg-white p-5 shadow-sm md:p-6">
          <h3 className="mb-4 text-sm font-black text-brand-black">Unggah Referensi Desain</h3>
          <FileUploadArea
            files={draft.referensiFiles}
            onAdd={async (metas) => {
              const uploaded: { name: string; size: number; dataUrl?: string }[] = [];
              for (const m of metas) {
                if (!m.dataUrl?.startsWith("data:")) {
                  uploaded.push(m);
                  continue;
                }
                try {
                  const blob = await (await fetch(m.dataUrl)).blob();
                  const fd = new FormData();
                  fd.append("file", blob, m.name || "ref.png");
                  fd.append("sub", "custom-ref");
                  const r = await fetch("/api/upload", {
                    method: "POST",
                    credentials: "include",
                    body: fd,
                  });
                  const j = await r.json();
                  if (r.ok && j.data?.path) {
                    uploaded.push({ name: m.name, size: m.size, dataUrl: j.data.path });
                  } else {
                    logger.error("[custom] upload referensi ditolak:", j?.error);
                  }
                } catch (e) {
                  logger.error("[custom] upload referensi gagal:", e);
                }
              }
              if (uploaded.length) {
                updateDraft({ referensiFiles: [...draft.referensiFiles, ...uploaded] });
              }
            }}
            onRemove={(idx) =>
              updateDraft({
                referensiFiles: draft.referensiFiles.filter((_, i) => i !== idx),
              })
            }
          />
        </div>

        <div className="rounded-[24px] border border-brand-krem bg-white p-5 shadow-sm md:p-6">
          <label className="mb-3 block text-sm font-black text-brand-black">Catatan Tambahan (Opsional)</label>
          <textarea
            value={draft.notes}
            onChange={(e) => updateDraft({ notes: e.target.value })}
            rows={4}
            placeholder="Misal: Tolong tambahkan stiker logo bendera di belakang helm..."
            className="w-full resize-none rounded-xl border border-brand-krem bg-brand-cream-light/30 px-4 py-3 text-sm font-medium text-brand-black shadow-inner outline-none transition-all focus:border-brand-orange focus:bg-white focus:ring-4 focus:ring-brand-orange/10"
          />
        </div>

        {/* --- TOMBOL SUBMIT NORMAL (TIDAK MELAYANG) --- */}
        <div className="mt-6 flex justify-end pb-4">
          <button
            type="button"
            onClick={() => router.push("/custom/detail")}
            className="w-full rounded-full bg-brand-orange px-10 py-4 text-sm font-black tracking-wide text-white shadow-[0_8px_20px_rgb(249,115,22,0.25)] transition-all duration-300 hover:-translate-y-1 hover:bg-orange-600 hover:shadow-[0_12px_25px_rgb(249,115,22,0.35)] active:translate-y-0 md:w-auto"
          >
            Lanjutkan Pesanan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream-light pb-24" />}>
      <CustomForm />
    </Suspense>
  );
}