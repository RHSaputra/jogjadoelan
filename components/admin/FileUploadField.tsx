"use client";

import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Link as LinkIcon } from "lucide-react";
import {
  fileToCompressedBase64,
  dataUrlSizeKB,
  type CompressOptions,
} from "@/lib/file-to-image";

interface FileUploadFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (dataUrl: string) => void;
  aspect?: "square" | "landscape" | "portrait" | "free";
  compress?: CompressOptions;
}

// BARU: Interface yang sebelumnya hilang sudah ditambahkan di sini
interface ImageUrlFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "square" | "landscape" | "portrait" | "free";
}

const ASPECT_CLASS = {
  square: "aspect-square",
  landscape: "aspect-[16/9]",
  portrait: "aspect-[3/4]",
  free: "aspect-[5/3]",
};

// ─── Komponen upload file (base64) ───────────────────────────
export function FileUploadField({
  label,
  hint,
  value,
  onChange,
  compress,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const out = await fileToCompressedBase64(file, compress);
      onChange(out);
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "Gagal memproses gambar.");
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-900">
        {label}
      </label>
      {hint && <p className="mb-1.5 text-[10px] text-gray-500">{hint}</p>}

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all w-full h-28 ${
          drag
            ? "border-[#FF6B1A] bg-orange-50"
            : value
              ? "border-gray-200 bg-gray-50"
              : "border-gray-300 bg-gray-50 hover:border-[#FF6B1A]"
        }`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="preview" className="h-full w-full object-contain" />
            <div className="absolute right-2 top-2 flex gap-1">
              <span className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black text-white backdrop-blur">
                {dataUrlSizeKB(value)} KB
              </span>
              <button
                type="button"
                onClick={() => onChange("")}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
                title="Hapus gambar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-2 left-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black text-gray-900 shadow-lg backdrop-blur hover:bg-white"
            >
              Ganti Gambar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#FF6B1A]"
          >
            {busy ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-xs font-black">Pilih dari Galeri / File</p>
                <p className="text-[10px] text-gray-400">atau geser file ke sini</p>
                <p className="text-[9px] text-gray-400">JPG, PNG, WebP • max 15 MB</p>
              </>
            )}
          </button>
        )}

        {busy && value && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B1A]" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
      />

      {err && (
        <p className="mt-1.5 flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">
          <ImageIcon className="h-3 w-3" /> {err}
        </p>
      )}
    </div>
  );
}

// ─── Komponen URL gambar dengan pratinjau ─────────────────────
export function ImageUrlField({ label, hint, value, onChange, aspect = "landscape" }: ImageUrlFieldProps) {
  const [imgErr, setImgErr] = useState(false);
  const isUrl = value.startsWith("http") || value.startsWith("/");
  const showPreview = value && isUrl && !imgErr;

  return (
    <div>
      <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-900">
        <LinkIcon className="mr-1 inline h-3 w-3" />{label}
      </label>
      {hint && <p className="mb-1.5 text-[10px] text-gray-500">{hint}</p>}
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setImgErr(false); }}
          placeholder="https://... atau /images/nama-file.jpg"
          className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none"
        />
        {value && (
          <button type="button" onClick={() => onChange("")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showPreview && (
        <div className={`relative mt-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 ${ASPECT_CLASS[aspect]} max-h-24`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="pratinjau" className="h-full w-full object-contain"
            onError={() => setImgErr(true)} />
          <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white">pratinjau</span>
        </div>
      )}
      {value && imgErr && (
        <p className="mt-1 text-[10px] text-red-500 font-bold">⚠ URL gambar tidak bisa dimuat — periksa link-nya.</p>
      )}
    </div>
  );
}