"use client";

import { useState, useRef, useCallback } from "react";
import { Plus, Trash2, Upload, Image as ImageIcon, MoveUp, MoveDown } from "lucide-react";
import {
  PRODUK_KONDISI_OPTS, PRODUK_UKURAN_OPTS, PRODUK_JENIS_OPTS,
} from "@/lib/admin-produk-helpers";
import Image from "next/image";
import { api } from "@/lib/api/fetcher";
import type { Produk } from "@/lib/constants";
import {
  Section, Grid, Input, Textarea, Select, MultiChip, Button,
} from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";

export type ProdukFormValue = Omit<Produk, "id" | "__seed"> & { id?: string; isRekomendasi?: boolean };

export const EMPTY_PRODUK: ProdukFormValue = {
  nama: "", jenis: "half-face", jenisLabel: "Half Face",
  harga: 0, hargaCoret: 0, diskonPersen: 0, promoLabel: "",
  stok: 0, rating: 5, terjual: 0,
  gambar: "", gambars: [],
  deskripsiSingkat: "",
  deskripsi: [""],
  ukuran: ["M", "L"],
  kondisi: "Baru",
  spesifikasi: "Berat ±1,2 kg | Standar SNI | Garansi 6 bulan",
  isRekomendasi: false,
};

export function ProdukForm({
  value, onChange,
}: { value: ProdukFormValue; onChange: (v: ProdukFormValue) => void }) {
  const upd = (p: Partial<ProdukFormValue>) => onChange({ ...value, ...p });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { error: notifyError } = useAdminNotification();

  const addGambar = useCallback((urls: string[]) => {
    const next = [...(value.gambars ?? []), ...urls].slice(0, 10);
    onChange({ ...value, gambars: next, gambar: next[0] ?? "" });
  }, [onChange, value]);
  const delGambar = (i: number) => {
    const next = (value.gambars ?? []).filter((_, idx) => idx !== i);
    upd({ gambars: next, gambar: next[0] ?? "" });
  };
  const moveGambar = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    const arr = [...(value.gambars ?? [])];
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    upd({ gambars: arr, gambar: arr[0] ?? "" });
  };

  const onFiles = useCallback(async (fs: FileList | null) => {
    if (!fs || fs.length === 0) return;
    const files = Array.from(fs);
    setUploading(true);
    const results: string[] = [];
    try {
      for (const f of files) {
        try {
          const fd = new FormData();
          fd.append("file", f);
          fd.append("sub", "produk");
          const r = await api.upload<{ path: string }>("/api/admin/upload", fd);
          if (r?.path) results.push(r.path);
        } catch (e) {
          console.error("[produk-form] upload failed:", e);
          notifyError("Upload Gagal", e instanceof Error ? e.message : "Coba lagi atau refresh halaman.");
        }
      }
    } finally {
      setUploading(false);
    }
    if (results.length) addGambar(results);
  }, [addGambar, notifyError]);

  const updDesk = (i: number, v: string) =>
    upd({ deskripsi: (value.deskripsi ?? []).map((d, idx) => idx === i ? v : d) });
  const addDesk = () => upd({ deskripsi: [...(value.deskripsi ?? []), ""] });
  const delDesk = (i: number) =>
    upd({ deskripsi: (value.deskripsi ?? []).filter((_, idx) => idx !== i) });

  const setJenis = (jv: string) => {
    const found = PRODUK_JENIS_OPTS.find((o) => o.value === jv);
    upd({ jenis: jv, jenisLabel: found?.label ?? jv });
  };

  return (
    <div className="space-y-5">
      {/* IDENTITAS PRODUK */}
      <Section
        title="Informasi Dasar"
        subtitle="Nama, jenis, kondisi, dan deskripsi singkat produk"
        icon={<PackageIcon />}
      >
        <Input
          label="Nama Produk"
          required
          value={value.nama}
          onChange={(e) => upd({ nama: e.target.value })}
          placeholder="Helm Bogo Vintage Cream"
        />
        <Grid cols={2}>
          <Select
            label="Jenis Helm"
            required
            value={value.jenis}
            onChange={(e) => setJenis(e.target.value)}
            options={PRODUK_JENIS_OPTS}
          />
          <Select
            label="Kondisi"
            value={value.kondisi}
            onChange={(e) => upd({ kondisi: e.target.value })}
            options={PRODUK_KONDISI_OPTS.map((k) => ({ value: k, label: k }))}
          />
        </Grid>
        <Textarea
          label="Deskripsi Singkat"
          hint="Tampil di card produk"
          value={value.deskripsiSingkat ?? ""}
          onChange={(e) => upd({ deskripsiSingkat: e.target.value })}
          rows={2}
        />
      </Section>

      {/* GALERI */}
      <Section
        title="Galeri Produk"
        subtitle="Upload gambar, drag urutan. Gambar pertama = cover"
        badge={`${value.gambars?.length ?? 0}/10`}
        icon={<ImageIcon className="h-4 w-4" />}
      >
        {(value.gambars ?? []).length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {value.gambars!.map((g, i) => (
              <div
                key={i}
                className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                  i === 0
                    ? "border-[#FF6B1A] ring-2 ring-[#FF6B1A]/20"
                    : "border-gray-200 hover:border-gray-300"
                } bg-gray-50`}
              >
                <Image src={g} alt="" fill className="object-cover" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-[#FF6B1A] px-2 py-0.5 text-[9px] font-black text-white shadow">
                    COVER
                  </span>
                )}
                {/* Action overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveGambar(i, -1)}
                      disabled={i === 0}
                      className="rounded-md bg-white/90 p-1 text-[10px] font-black text-gray-700 hover:bg-white disabled:opacity-30"
                    >
                      <MoveUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveGambar(i, 1)}
                      disabled={i === (value.gambars?.length ?? 1) - 1}
                      className="rounded-md bg-white/90 p-1 text-[10px] font-black text-gray-700 hover:bg-white disabled:opacity-30"
                    >
                      <MoveDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => delGambar(i)}
                      className="rounded-md bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="md"
            icon={uploading ? <SpinnerSm /> : <Upload className="h-3.5 w-3.5" />}
            onClick={() => !uploading && fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Mengupload..." : "Upload Gambar"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              onFiles(e.target.files);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="md"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => {
              const url = prompt("Tempel URL gambar:");
              if (url) addGambar([url]);
            }}
          >
            Dari URL
          </Button>
        </div>
      </Section>

      {/* HARGA & PROMO */}
      <Section
        title="Harga & Promo"
        subtitle="Atur harga jual, diskon, dan label promo"
        icon={<TagIcon />}
      >
        <Input
          label="Harga Jual (Rp)"
          required
          type="number"
          value={String(value.harga)}
          onChange={(e) => upd({ harga: Number(e.target.value) || 0 })}
          prefix="Rp"
        />
        <Grid cols={2}>
          <Input
            label="Diskon %"
            hint="Harga coret otomatis dihitung"
            type="number"
            value={String(value.diskonPersen ?? 0)}
            onChange={(e) => upd({ diskonPersen: Math.min(99, Math.max(0, Number(e.target.value) || 0)) })}
            max={99}
            suffix="%"
          />
          <Input
            label="Label Promo"
            value={value.promoLabel ?? ""}
            onChange={(e) => upd({ promoLabel: e.target.value })}
            placeholder="FLASH SALE"
          />
        </Grid>
      </Section>

      {/* STOK & VARIAN */}
      <Section
        title="Stok & Varian"
        subtitle="Jumlah stok, rating, ukuran tersedia"
        icon={<BoxIcon />}
      >
        <Grid cols={3}>
          <Input
            label="Stok"
            required
            type="number"
            value={String(value.stok)}
            onChange={(e) => upd({ stok: Number(e.target.value) || 0 })}
          />
          <Input
            label="Rating"
            type="number"
            value={String(value.rating ?? 5)}
            onChange={(e) => upd({ rating: Math.min(5, Math.max(0, Number(e.target.value) || 0)) })}
            min={0}
            max={5}
            step={0.1}
          />
          <Input
            label="Terjual"
            type="number"
            value={String(value.terjual ?? 0)}
            onChange={(e) => upd({ terjual: Number(e.target.value) || 0 })}
          />
        </Grid>
        <MultiChip
          label="Ukuran Tersedia"
          options={PRODUK_UKURAN_OPTS}
          selected={value.ukuran ?? []}
          onChange={(sel) => upd({ ukuran: sel })}
        />
      </Section>

      {/* DESKRIPSI BULLET */}
      <Section
        title="Poin Fitur / Deskripsi"
        subtitle="Bullet point fitur unggulan — ditampilkan di detail customer"
        badge={(value.deskripsi ?? []).length}
        icon={<ListIcon />}
      >
        <div className="space-y-2">
          {(value.deskripsi ?? []).map((d, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#FF6B1A] text-xs font-black text-white shadow-sm">
                {i + 1}
              </span>
              <input
                value={d}
                onChange={(e) => updDesk(i, e.target.value)}
                placeholder="Material outer shell ABS premium tahan benturan"
                className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#FF6B1A]/10 transition-all"
              />
              <button
                type="button"
                onClick={() => delDesk(i)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                title="Hapus poin"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={addDesk}
          className="w-full border-2 border-dashed border-gray-200 hover:border-[#FF6B1A] hover:text-[#FF6B1A] py-2.5"
        >
          Tambah Poin Fitur
        </Button>
      </Section>

      {/* PLACEMENT */}
      <Section
        title="Penempatan di Halaman Customer"
        subtitle="Ready Stok = tampil di /belanja. Rekomendasi = eksklusif di section homepage."
        icon={<TargetIcon />}
      >
        <Grid cols={2}>
          <button
            type="button"
            onClick={() => upd({ isRekomendasi: false })}
            className={`rounded-xl border-2 p-4 text-left transition-all duration-150 ${
              !value.isRekomendasi
                ? "border-[#FF6B1A] bg-orange-50 ring-2 ring-[#FF6B1A]/10"
                : "border-gray-200 bg-white hover:border-[#FF6B1A] hover:bg-orange-50/30"
            }`}
          >
            <p className="text-sm font-black text-gray-900">📦 READY STOK</p>
            <p className="mt-1 text-[10px] text-gray-500 leading-relaxed">
              Tampil di halaman katalog umum /belanja
            </p>
          </button>
          <button
            type="button"
            onClick={() => upd({ isRekomendasi: true })}
            className={`rounded-xl border-2 p-4 text-left transition-all duration-150 ${
              value.isRekomendasi
                ? "border-amber-400 bg-yellow-50 ring-2 ring-amber-400/20"
                : "border-gray-200 bg-white hover:border-amber-400 hover:bg-yellow-50/30"
            }`}
          >
            <p className="text-sm font-black text-gray-900">⭐ REKOMENDASI (EKSKLUSIF)</p>
            <p className="mt-1 text-[10px] text-gray-500 leading-relaxed">
              Hanya di section rekomendasi homepage
            </p>
          </button>
        </Grid>
      </Section>

      {/* SPESIFIKASI */}
      <Section
        title="Spesifikasi"
        subtitle="Spesifikasi singkat — satu baris, dipisah karakter |"
        icon={<InfoIcon />}
      >
        <Textarea
          label="Spesifikasi Singkat"
          value={value.spesifikasi ?? ""}
          onChange={(e) => upd({ spesifikasi: e.target.value })}
          rows={2}
          placeholder="Berat ±1,2 kg | Standar SNI | Garansi 6 bulan"
        />
      </Section>
    </div>
  );
}

// ─── Mini SVG Icons (inline untuk mengurangi import Lucide) ─────
function SpinnerSm() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}