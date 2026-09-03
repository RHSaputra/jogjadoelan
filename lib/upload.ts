import { randomUUID, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

export type UploadSub =
  | "custom-ref"
  | "ulasan"
  | "komplain"
  | "refund"
  | "tukar"
  | "order"
  | "produk"
  | "qris";

type SaveUploadOptions = {
  imageOnly?: boolean;
  maxMb?: number;
};

type SaveUploadResult = {
  path: string;
  url: string;
  filename: string;
  originalName: string;
  size: number;
  type: string;
};

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getExtension(fileName: string, mimeType: string) {
  const extFromName = path.extname(fileName);

  if (extFromName) {
    return extFromName.toLowerCase();
  }

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "application/pdf") return ".pdf";

  return "";
}

/**
 * Menyimpan buffer file ke Vercel Blob (jika token ada) atau fallback ke sistem file lokal.
 */
export async function saveBuffer(
  buffer: Buffer,
  sub: string,
  filename: string,
  mimeType: string
): Promise<string> {
  const token =
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_STORE_ID_READ_WRITE_TOKEN ||
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
  if (token) {
    // Unggah ke Vercel Blob
    const blob = await put(`${sub}/${filename}`, buffer, {
      access: "public",
      contentType: mimeType,
      token,
    });
    return blob.url;
  } else {
    // Fallback ke penyimpanan lokal
    const safeSub = sanitizeSegment(sub);
    const uploadDir = path.join(process.cwd(), "public", "uploads", safeSub);
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);
    return `/uploads/${safeSub}/${filename}`;
  }
}

/**
 * Menyimpan data URL base64 ke Vercel Blob atau penyimpanan lokal.
 */
export async function saveDataUrl(dataUrl: string, sub: string): Promise<string> {
  const m = dataUrl.match(/^data:(image\/(png|jpe?g|webp));base64,(.+)$/);
  if (!m) throw new Error("Format gambar data URL tidak valid");
  const mime = m[1];
  const buf = Buffer.from(m[3], "base64");
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error("Ukuran file maksimal 5MB");
  const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  return await saveBuffer(buf, sub, filename, mime);
}

export async function saveUpload(
  file: File,
  sub: UploadSub,
  options: SaveUploadOptions = {}
): Promise<SaveUploadResult> {
  const mimeType = file.type || "application/octet-stream";
  const maxMb = options.maxMb ?? 10;
  const maxBytes = maxMb * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error(`Ukuran file maksimal ${maxMb}MB`);
  }

  if (options.imageOnly && !IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error("File harus berupa gambar");
  }

  const originalName = file.name || "upload";
  const safeSub = sanitizeSegment(sub);
  const ext = getExtension(originalName, mimeType);
  const filename = `${Date.now()}-${randomUUID()}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await saveBuffer(buffer, safeSub, filename, mimeType);

  return {
    path: url,
    url: url,
    filename,
    originalName,
    size: file.size,
    type: mimeType,
  };
}


