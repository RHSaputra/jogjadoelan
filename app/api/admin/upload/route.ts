import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { saveBuffer } from "@/lib/upload";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: { message: "No file uploaded" } }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: { message: "File harus berupa gambar" } }, { status: 400 });
    }

    const MAX_BYTES = 15 * 1024 * 1024; // max 15MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: { message: "File terlalu besar (maksimal 15MB)", code: "FILE_TOO_LARGE" } },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).slice(2);

    let finalBuffer: Buffer;
    let ext = "webp";

    // Coba optimasi dengan sharp; kalau gagal, simpan apa adanya
    try {
      const sharp = (await import("sharp")).default;
      const MAX_WIDTH = 1800;
      const WEBP_QUALITY = 85;
      finalBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      ext = "webp";
      logger.info("[upload] sharp OK, saved as webp");
    } catch (sharpErr) {
      logger.warn("[upload] sharp FAILED, saving raw file:", sharpErr);
      finalBuffer = buffer;
      if (file.type === "image/png") ext = "png";
      else if (file.type === "image/jpeg" || file.type === "image/jpg") ext = "jpg";
      else if (file.type === "image/gif") ext = "gif";
      else ext = "webp";
    }

    const safeName = `${timestamp}-${randomPart}.${ext}`;
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const filePath = await saveBuffer(finalBuffer, "produk", safeName, mimeType);

    logger.info("[upload] OK:", filePath);
    return NextResponse.json({ data: { path: filePath } });
  } catch (err) {
    logger.error("[upload] UNEXPECTED ERROR:", err);
    return NextResponse.json(
      { error: { message: `Gagal upload: ${err instanceof Error ? err.message : String(err)}` } },
      { status: 500 },
    );
  }
}