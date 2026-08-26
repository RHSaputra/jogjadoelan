"use client";

import { Upload, FileText, X, Eye } from "lucide-react";
import { useRef, useState } from "react";
// ✅ IMPORT KOMPRESOR DITAMBAHKAN DI SINI
import { compressImage } from "@/lib/image-compressor";

export interface UploadedFileMeta {
  name: string;
  size: number;
  dataUrl?: string;
}

interface FileUploadAreaProps {
  files: UploadedFileMeta[];
  onAdd: (files: UploadedFileMeta[]) => void;
  onRemove: (index: number) => void;
}

const formatSize = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileUploadArea({ files, onAdd, onRemove }: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ✅ LOGIKA KOMPRESOR DITAMBAHKAN DI SINI
  const handleFiles = async (picked: File[]) => {
    const metas: UploadedFileMeta[] = await Promise.all(
      picked.map(async (f) => {
        const isImage = f.type.startsWith("image/");
        let dataUrl = undefined;
        
        if (isImage) {
          try {
            // Kompres gambar: max lebar/tinggi 800px, kualitas 70%
            dataUrl = await compressImage(f, 800, 0.7);
          } catch (err) {
            console.error("Gagal kompres gambar:", err);
          }
        }
        
        return { name: f.name, size: f.size, dataUrl };
      }),
    );
    onAdd(metas);
  };

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white text-gray-500 hover:border-orange-500 hover:text-orange-500"
      >
        <Upload className="mb-1 h-6 w-6" />
        <span className="px-2 text-center text-xs">
          Klik untuk pilih gambar referensi
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          if (e.target.files) handleFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
        className="hidden"
      />

      <div className="space-y-2">
        {files.length === 0 ? (
          <p className="text-xs italic text-gray-400">Belum ada file diunggah</p>
        ) : (
          files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
              {f.dataUrl ? (
                <button
                  type="button"
                  onClick={() => setPreviewUrl(f.dataUrl!)}
                  className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50"
                  aria-label="Preview"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.dataUrl}
                    alt={f.name}
                    className="h-full w-full object-cover transition hover:scale-105"
                  />
                </button>
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-orange-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-900">{f.name}</p>
                <p className="text-[10px] text-gray-500">{formatSize(f.size)}</p>
              </div>
              {f.dataUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewUrl(f.dataUrl!)}
                  className="text-gray-400 hover:text-orange-500"
                  aria-label="Lihat preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-gray-400 hover:text-red-500"
                aria-label="Hapus"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewUrl(null)}
          role="dialog"
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}