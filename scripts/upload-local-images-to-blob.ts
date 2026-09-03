import "dotenv/config";
import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { prisma } from "c:/jogjadoelan/lib/db";

async function main() {
  console.log("=== MIGRASI FOTO PRODUK LOKAL KE VERCEL BLOB ===");
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN belum diset di .env");
    process.exit(1);
  }

  const produkUploadDir = path.join(process.cwd(), "public", "uploads", "produk");
  if (!fs.existsSync(produkUploadDir)) {
    console.log("Folder public/uploads/produk tidak ditemukan.");
    process.exit(0);
  }

  const files = fs.readdirSync(produkUploadDir).filter((f) => f !== ".gitkeep" && !fs.statSync(path.join(produkUploadDir, f)).isDirectory());
  console.log(`Ditemukan ${files.length} file gambar produk di lokal laptop.`);

  const urlMap = new Map<string, string>();

  // 1. Upload ke Vercel Blob
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(produkUploadDir, file);
    const buffer = fs.readFileSync(filePath);
    const oldPath = `/uploads/produk/${file}`;

    console.log(`[${i + 1}/${files.length}] Uploading ${file} ke Vercel Blob...`);
    const blob = await put(`produk/${file}`, buffer, {
      access: "public",
      contentType: file.endsWith(".webp") ? "image/webp" : file.endsWith(".png") ? "image/png" : "image/jpeg",
      token,
    });

    urlMap.set(oldPath, blob.url);
    console.log(`  -> URL CDN: ${blob.url}`);
  }

  // 2. Update Database TiDB Cloud
  console.log("\nMemperbarui database TiDB Cloud dengan URL CDN Vercel Blob...");
  const products = await prisma.produk.findMany({
    include: { produkimage: true },
  });

  let updatedProducts = 0;
  for (const prod of products) {
    let changed = false;
    let newGambarUtama = prod.gambarUtama;

    if (prod.gambarUtama && urlMap.has(prod.gambarUtama)) {
      newGambarUtama = urlMap.get(prod.gambarUtama)!;
      changed = true;
    }

    if (changed) {
      await prisma.produk.update({
        where: { id: prod.id },
        data: { gambarUtama: newGambarUtama },
      });
      updatedProducts++;
    }

    // Update produkimage
    for (const img of prod.produkimage) {
      if (urlMap.has(img.path)) {
        await prisma.produkimage.update({
          where: { id: img.id },
          data: { path: urlMap.get(img.path)! },
        });
      }
    }
  }

  console.log(`✓ Berhasil memperbarui ${updatedProducts} produk dengan URL Vercel Blob CDN!`);
  console.log("=== MIGRASI FOTO PRODUK KE BLOB SELESAI ===");
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
