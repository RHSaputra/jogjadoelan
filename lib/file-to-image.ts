"use client";

export interface CompressOptions {
  maxWidth?: number;   // px terpanjang
  maxHeight?: number;  // px terpanjang
  quality?: number;    // 0..1 (JPEG/WebP)
  mime?: "image/jpeg" | "image/webp" | "image/png";
}

/**
 * Upload file → resize → base64 dataURL siap simpan ke localStorage.
 * PNG dengan transparansi tetap PNG (no compression-loss visible).
 */
export async function fileToCompressedBase64(
  file: File,
  opts: CompressOptions = {},
): Promise<string> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.78,
    mime,
  } = opts;

  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar (JPG, PNG, atau WebP).");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Ukuran file maksimal 15 MB.");
  }

  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  // Skalakan proporsional
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
  w = Math.round(w * ratio);
  h = Math.round(h * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung canvas.");
  ctx.drawImage(img, 0, 0, w, h);

  // PNG dengan transparansi → tetap PNG. Lainnya → JPEG/WebP terkompresi.
  const outMime =
    mime ?? (file.type === "image/png" ? "image/png" : "image/jpeg");
  const out = canvas.toDataURL(outMime, quality);

  // Safety: kalau hasil >700KB warning di console (file tetap kepake)
  const approxKB = Math.round((out.length * 0.75) / 1024);
  if (approxKB > 700) {
    console.warn(
      `[file-to-image] Output ${approxKB}KB — pertimbangkan resolusi lebih kecil.`,
    );
  }
  return out;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Gagal membaca file."));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

/** Kira-kira berapa KB sebuah data URL (untuk badge UI) */
export function dataUrlSizeKB(dataUrl: string): number {
  if (!dataUrl) return 0;
  return Math.round((dataUrl.length * 0.75) / 1024);
}