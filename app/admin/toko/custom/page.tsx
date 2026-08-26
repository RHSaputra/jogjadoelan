"use client";

import { useState, useEffect } from "react";
import {
  Palette, Save, Plus, Trash2, Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import {
  getCustomFormAsync,
  saveCustomFormAsync,
  CUSTOM_FORM_DEFAULT,
  type CustomFormConfig,
  type CustomSectionOption,
  type CustomOptionItem,
  type CustomColorSwatch,
} from "@/lib/admin-custom-options";
import { FileUploadField } from "@/components/admin/FileUploadField";
import { SuccessModal } from "@/components/admin/SuccessModal";

const SECTION_KEYS: (keyof CustomFormConfig & string)[] = [
  "jenis", "finishing", "strap", "ukuran", "motifBusa", "bahan", "aksesoris",
];

const SECTION_LABELS: Record<string, string> = {
  jenis: "Jenis Helm",
  finishing: "Finishing",
  strap: "Strap / Tali",
  ukuran: "Ukuran",
  motifBusa: "Motif Cover Busa",
  bahan: "Bahan Helm",
  aksesoris: "Aksesoris",
};

export default function AdminCustomFormPage() {
  const [c, setC] = useState<CustomFormConfig>(CUSTOM_FORM_DEFAULT);
  const [dirty, setDirty] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getCustomFormAsync().then((data) => {
      setC(data);
    });
  }, []);

  const upd = (p: Partial<CustomFormConfig>) => {
    setC((x) => ({ ...x, ...p }));
    setDirty(true);
  };

  const submit = async () => {
    await saveCustomFormAsync(c);
    setDirty(false);
    setSuccessMsg("Opsi custom helm berhasil disimpan!");
  };

  const toggleExpand = (k: string) => setExpanded((x: Record<string, boolean>) => ({ ...x, [k]: !x[k] }));

  const updSection = (key: string, p: Record<string, unknown>) => {
    const section = c[key as keyof CustomFormConfig] as CustomSectionOption;
    const next = { ...c, [key]: { ...section, ...p } } as CustomFormConfig;
    setC(next);
    setDirty(true);
  };

  const addOption = (key: string) => {
    const section = c[key as keyof CustomFormConfig] as CustomSectionOption;
    const newOpt: CustomOptionItem = { id: `opt-${Date.now()}`, label: "Opsi Baru" };
    updSection(key, { options: [...section.options, newOpt] });
  };

  const updOption = (sectionKey: string, idx: number, p: Partial<CustomOptionItem>) => {
    const section = c[sectionKey as keyof CustomFormConfig] as CustomSectionOption;
    updSection(sectionKey, { options: section.options.map((o, i) => i === idx ? { ...o, ...p } : o) });
  };

  const delOption = (sectionKey: string, idx: number) => {
    const section = c[sectionKey as keyof CustomFormConfig] as CustomSectionOption;
    updSection(sectionKey, { options: section.options.filter((_, i) => i !== idx) });
  };

  const updPalette = (idx: number, p: Partial<CustomColorSwatch>) =>
    upd({ palette: c.palette.map((s, i) => (i === idx ? { ...s, ...p } : s)) });

  const addPalette = () =>
    upd({ palette: [...c.palette, { id: `swatch-${Date.now()}`, nama: "Warna Baru", hex: "#000000" }] });

  const delPalette = (idx: number) =>
    upd({ palette: c.palette.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-3 rounded-2xl bg-[#fc970a] p-4 text-white shadow-lg">
        <Palette className="h-6 w-6 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-black">Form Custom Helm</p>
          <p className="text-[10px] opacity-80">Atur semua opsi & gambar referensi di form custom helm customer</p>
        </div>
        <div className="rounded-2xl bg-white/15 px-4 py-2 text-center backdrop-blur">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">Total Opsi</p>
          <p className="text-lg font-black">
            {SECTION_KEYS.reduce((sum, k) => sum + (c[k] as CustomSectionOption).options.length, 0)}
          </p>
        </div>
      </div>

      {/* 7 SECTION FORM CUSTOM */}
      <div className="space-y-4">
        {SECTION_KEYS.map((key) => {
          const section = c[key] as CustomSectionOption;
          const open = expanded[key];
          const label = SECTION_LABELS[key];

          return (
            <div key={key} className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm">
              <button type="button" onClick={() => toggleExpand(key)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left">
                <div className="flex items-center gap-3">
                  {section.imageUrl ? (
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={section.imageUrl} alt={section.title} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-black text-gray-900">{label}</p>
                    <p className="text-[10px] text-gray-500">{section.options.length} opsi</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Judul" value={section.title} onChange={(v) => updSection(key, { title: v })} />
                    <FileUploadField label="Gambar Referensi" hint="Klik untuk perbesar saat di customer"
                      value={section.imageUrl} onChange={(v) => updSection(key, { imageUrl: v })} aspect="square" />
                  </div>
                  <Field label="Deskripsi (muncul di popup preview)" value={section.description}
                    textarea onChange={(v) => updSection(key, { description: v })} />

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase text-gray-500">Daftar Pilihan ({section.options.length})</p>
                      <button type="button" onClick={() => addOption(key)}
                        className="flex items-center gap-1 rounded-full bg-[#FF6B1A]/10 px-3 py-1 text-[10px] font-black text-[#FF6B1A] hover:bg-[#FF6B1A]/20">
                        <Plus className="h-3 w-3" /> Tambah Opsi
                      </button>
                    </div>

                    {section.options.length === 0 && (
                      <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center">
                        <p className="text-xs text-gray-400">Belum ada opsi. Klik Tambah Opsi untuk menambahkan.</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {section.options.map((opt, idx) => (
                        <div key={opt.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <span className="text-[9px] font-black text-gray-400 w-6">#{idx + 1}</span>
                          <input value={opt.label} onChange={(e) => updOption(key, idx, { label: e.target.value })}
                            className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-[#FF6B1A]"
                            placeholder="Nama opsi" />
                          <button type="button" onClick={() => delOption(key, idx)}
                            className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PALETTE WARNA PRESET */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">PALETTE WARNA PRESET</p>
            <p className="text-[9px] text-gray-400">
              Warna siap pilih di form custom (maks{" "}
              <input type="number" value={c.warnaMax} onChange={(e) => upd({ warnaMax: Number(e.target.value) })}
                className="inline w-10 rounded border border-gray-200 px-1 py-0.5 text-center text-[9px] font-bold" />{" "}
              warna per order)
            </p>
          </div>
          <button type="button" onClick={addPalette}
            className="flex items-center gap-1 rounded-full bg-[#FF6B1A]/10 px-3 py-1 text-[10px] font-black text-[#FF6B1A] hover:bg-[#FF6B1A]/20">
            <Plus className="h-3 w-3" /> Tambah Warna
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {c.palette.map((sw, idx) => (
            <div key={sw.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-gray-400">#{idx + 1}</span>
                <button type="button" onClick={() => delPalette(idx)} className="rounded bg-red-50 p-1 text-red-500 hover:bg-red-100">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <input type="color" value={sw.hex} onChange={(e) => updPalette(idx, { hex: e.target.value })}
                className="h-12 w-full cursor-pointer rounded-lg border border-gray-200" />
              <input value={sw.nama} onChange={(e) => updPalette(idx, { nama: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-900 outline-none focus:border-[#FF6B1A]"
                placeholder="Nama warna" />
            </div>
          ))}
        </div>
      </div>

      {/* TOMBOL SIMPAN */}
      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <button onClick={submit}
            className="flex items-center gap-2 rounded-full bg-[#FF6B1A] px-6 py-3 text-sm font-black text-white shadow-2xl hover:bg-[#E55A0F] active:scale-95 transition-all">
            <Save className="h-4 w-4" /> Simpan Perubahan
          </button>
        </div>
      )}

      {/* SUCCESS MODAL â€” Popup tengah */}
      <SuccessModal open={!!successMsg} title={successMsg ?? "Berhasil"} onClose={() => setSuccessMsg(null)} />
    </div>
  );
}

function Field({ label, hint, value, onChange, placeholder, textarea }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; textarea?: boolean;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-[10px] font-black uppercase text-gray-500">{label}</label>
      {hint && <p className="mb-1 text-[9px] text-gray-400">{hint}</p>}
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder}
          className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none resize-none" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none" />
      )}
    </div>
  );
}