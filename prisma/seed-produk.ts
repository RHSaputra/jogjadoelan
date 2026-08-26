// prisma/seed-produk.ts
// Seed 12 produk dummy → DB. Upsert by slug (id cuid auto).
// Jalankan: pnpm tsx prisma/seed-produk.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PRODUK_DUMMY } from "../lib/constants";

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username || "root"),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  };
}

const adapter = new PrismaMariaDb(parseDbUrl(process.env.DATABASE_URL!));
const prisma = new PrismaClient({ adapter });

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Tentukan produk mana yang menjadi rekomendasi (berdasarkan id asli dari PRODUK_DUMMY)
const REKOMENDASI_IDS = new Set(["p1", "p5", "p9", "p11"]); // helm bogo vintage cream, full face retro vespa, chips cap cream, chips stripe vintage

async function main() {
  console.log("🌱 Seeding produk...");
  for (const p of PRODUK_DUMMY) {
    const slug = slugify(p.nama);
    const gambars: string[] = p.gambars ?? [];

    // Hitung isRekomendasi dan isPromo
    const isRekomendasi = REKOMENDASI_IDS.has(p.id);
    const isPromo = p.diskonPersen > 0 || (p.hargaCoret !== 0 && p.hargaCoret > p.harga);

    const data = {
      slug,
      nama: p.nama,
      jenis: p.jenis,
      jenisLabel: p.jenisLabel,
      kategori: "ready-stock",
      kondisi: p.kondisi ?? "Baru",
      spesifikasi: p.spesifikasi ?? "",
      deskripsiSingkat: p.deskripsiSingkat ?? "",
      deskripsi: p.deskripsi ?? [],
      ukuranList: p.ukuran ?? ["S", "M", "L", "XL"],
      harga: p.harga,
      hargaCoret: p.hargaCoret ?? 0,
      diskonPersen: p.diskonPersen ?? 0,
      promoLabel: p.promoLabel || null,
      stok: p.stok,
      terjual: p.terjual ?? 0,
      rating: Number(p.rating ?? 0),
      isPromo: isPromo,
      isRekomendasi: isRekomendasi,
      isActive: true,
    };

    const produk = await prisma.produk.upsert({
      where: { slug },
      update: data,
      create: data,
    });

    // Replace images
    await prisma.produkimage.deleteMany({ where: { produkId: produk.id } });
    if (gambars.length > 0) {
      await prisma.produkimage.createMany({
        data: gambars.map((path, i) => ({
          produkId: produk.id,
          path,
          urutan: i,
          isThumbnail: i === 0,
        })),
      });
    }
    console.log(`  ✓ ${slug} → ${produk.id}  (${gambars.length} gambar) [rekomendasi: ${isRekomendasi}]`);
  }
  console.log("✅ Selesai seed", PRODUK_DUMMY.length, "produk");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());