// POST /api/admin/upload/qris — upload QR code image for QRIS
// Returns: { path: "/uploads/qris/xxx.webp" }
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdmin } from "@/lib/auth-server";
import { saveBuffer } from "@/lib/upload";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File terlalu besar (max 5MB)" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const MAX_DIMENSION = 500;
    const WEBP_QUALITY = 90;

    const timestamp = Date.now();
    const safeName = `${timestamp}-${Math.random().toString(36).slice(2)}.webp`;

    let optimized: Buffer;
    try {
      optimized = await sharp(buffer)
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (e) {
      console.error("[admin upload qris] image process error:", e);
      return NextResponse.json(
        {
          error: "Gagal memproses gambar",
        },
        { status: 400 }
      );
    }

    const filePath = await saveBuffer(optimized, "qris", safeName, "image/webp");
    return NextResponse.json({ path: filePath });
  } catch (err) {
    console.error("[admin upload qris] server error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
