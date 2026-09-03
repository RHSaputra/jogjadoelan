import "dotenv/config";
import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { prisma } from "../lib/db";
import { LANDING_DEFAULT, type HeroSlide } from "../lib/admin-toko-master-helpers";

async function main() {
  console.log("=== SEEDING CAROUSEL / HERO SLIDER KE TIDB CLOUD ===");
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN belum diset di .env");
    process.exit(1);
  }

  const heroDir = path.join(process.cwd(), "public", "images", "hero");
  if (!fs.existsSync(heroDir)) {
    console.error("Folder public/images/hero tidak ditemukan.");
    process.exit(1);
  }

  const slidesToUpload = [
    {
      file: "carousel.png",
      title: "Koleksi Helm Jadul & Klasik Autentik",
      subtitle: "Koleksi helm retro vintage original & custom berkualitas tinggi di Yogyakarta.",
      cta: "Jelajahi Koleksi",
      ctaLink: "/belanja",
    },
    {
      file: "carousel2.png",
      title: "Custom Helm Sesuka Hatimu",
      subtitle: "Pilih warna, motif busa, finishing, dan tali sesuai karakter motormu.",
      cta: "Mulai Custom",
      ctaLink: "/custom",
    },
    {
      file: "carousel3.png",
      title: "Koleksi Langka & Edisi Terbatas",
      subtitle: "Temukan helm vintage langka siap pakai dengan kondisi prima.",
      cta: "Lihat Produk",
      ctaLink: "/belanja",
    },
  ];

  const heroSlides: HeroSlide[] = [];

  for (let i = 0; i < slidesToUpload.length; i++) {
    const item = slidesToUpload[i];
    const filePath = path.join(heroDir, item.file);
    if (fs.existsSync(filePath)) {
      console.log(`[${i + 1}/${slidesToUpload.length}] Uploading ${item.file} ke Vercel Blob...`);
      const buffer = fs.readFileSync(filePath);
      const blob = await put(`landing/${item.file}`, buffer, {
        access: "public",
        contentType: "image/png",
        token,
      });
      console.log(`  -> URL: ${blob.url}`);

      heroSlides.push({
        id: `slide-${Date.now()}-${i}`,
        title: item.title,
        subtitle: item.subtitle,
        cta: item.cta,
        ctaLink: item.ctaLink,
        image: blob.url,
        bgImage: blob.url,
        aktif: true,
        urutan: i,
      });
    }
  }

  console.log(`\nMenyimpan ${heroSlides.length} slide carousel ke tabel sitesetting di TiDB Cloud...`);

  // Ambil setting landing existing jika ada, merge dengan slides baru
  const existingRow = await prisma.sitesetting.findUnique({ where: { key: "landing" } });
  const existingVal = (existingRow?.value as Record<string, unknown>) || LANDING_DEFAULT;

  const updatedLanding = {
    ...existingVal,
    heroSlides,
  };

  await prisma.sitesetting.upsert({
    where: { key: "landing" },
    create: {
      key: "landing",
      value: updatedLanding,
    },
    update: {
      value: updatedLanding,
    },
  });

  console.log("✓ Berhasil menyimpan carousel hero ke TiDB Cloud!");
  console.log("=== SELESAI ===");
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal seed carousel:", err);
  process.exit(1);
});
