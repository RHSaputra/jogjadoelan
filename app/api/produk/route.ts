// Produk listing API — GET /api/produk
// Optimizations:
//  1. Slim select — tidak fetch spesifikasi/deskripsi panjang untuk listing
//  2. Cache-Control header — 30 detik fresh, 5 menit stale-while-revalidate
//  3. Promise.all untuk paralel count + findMany
//  4. Limit produkimage ke 2 (thumbnail + 1 backup) untuk listing
//  5. Proper typing tanpa any

import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler } from "@/lib/api/response";
import { NextResponse } from "next/server";
import type { ProdukDTO } from "@/lib/api/produk-mapper";

const qs = z.object({
  q: z.string().optional(),
  jenis: z.string().optional(),
  promo: z.coerce.boolean().optional(),
  rekomendasi: z.coerce.boolean().optional(),
  sort: z.enum(["terbaru", "harga-asc", "harga-desc", "terlaris"]).default("terbaru"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

// Inline mapper untuk select slim (listing tidak perlu spesifikasi/deskripsi penuh)
function mapToListingDTO(p: {
  id: string;
  slug: string | null;
  nama: string;
  jenis: string;
  jenisLabel: string;
  kondisi: string;
  deskripsiSingkat: string;
  ukuranList: unknown;
  harga: number;
  hargaCoret: number;
  diskonPersen: number;
  promoLabel: string | null;
  stok: number;
  terjual: number;
  rating: number;
  jumlahUlasan: number;
  isPromo: boolean;
  isPreOrder: boolean;
  isRekomendasi: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  produkimage: { path: string; urutan: number }[];
}): Omit<ProdukDTO, "spesifikasi" | "deskripsi"> & { spesifikasi: string; deskripsi: string[] } {
  const sorted = [...p.produkimage].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
  return {
    id: p.id,
    slug: p.slug,
    nama: p.nama,
    jenis: p.jenis,
    jenisLabel: p.jenisLabel,
    kondisi: p.kondisi,
    spesifikasi: "",        // tidak dibutuhkan di listing
    deskripsiSingkat: p.deskripsiSingkat,
    deskripsi: [],          // tidak dibutuhkan di listing
    ukuran: Array.isArray(p.ukuranList) ? (p.ukuranList as string[]) : [],
    harga: p.harga,
    hargaCoret: p.hargaCoret || undefined,
    diskonPersen: p.diskonPersen || undefined,
    promoLabel: p.promoLabel || undefined,
    stok: p.stok,
    terjual: p.terjual,
    rating: p.rating,
    jumlahUlasan: p.jumlahUlasan,
    isPromo: p.isPromo,
    isPreOrder: p.isPreOrder,
    isRekomendasi: p.isRekomendasi,
    isActive: p.isActive,
    gambar: sorted[0]?.path ?? "",
    gambars: sorted.map((i) => i.path),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const params = qs.parse(Object.fromEntries(searchParams));

  const where: Record<string, unknown> = { isActive: true };
  if (params.q) {
    where.OR = [
      { nama: { contains: params.q } },
      { jenisLabel: { contains: params.q } },
    ];
  }
  if (params.jenis && params.jenis !== "semua") where.jenis = params.jenis;
  if (params.promo) where.isPromo = true;
  if (params.rekomendasi) where.isRekomendasi = true;

  const orderBy =
    params.sort === "harga-asc"
      ? { harga: "asc" as const }
      : params.sort === "harga-desc"
        ? { harga: "desc" as const }
        : params.sort === "terlaris"
          ? { terjual: "desc" as const }
          : { createdAt: "desc" as const };

  // Paralel query — count + findMany berjalan bersamaan
  const [items, total] = await Promise.all([
    prisma.produk.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: {
        id: true,
        slug: true,
        nama: true,
        jenis: true,
        jenisLabel: true,
        kondisi: true,
        // Listing: tidak perlu spesifikasi & deskripsi panjang → hemat bandwidth
        deskripsiSingkat: true,
        ukuranList: true,
        harga: true,
        hargaCoret: true,
        diskonPersen: true,
        promoLabel: true,
        stok: true,
        terjual: true,
        rating: true,
        jumlahUlasan: true,
        isPromo: true,
        isPreOrder: true,
        isRekomendasi: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Hanya 2 gambar untuk listing (lebih hemat)
        produkimage: {
          select: { path: true, urutan: true },
          orderBy: { urutan: "asc" as const },
          take: 2,
        },
      },
    }),
    prisma.produk.count({ where }),
  ]);

  const data = items.map(mapToListingDTO);

  const totalPages = Math.ceil(total / params.limit);
  const result = NextResponse.json({
    data: {
      items: data,
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      nextCursor: params.page < totalPages ? params.page + 1 : undefined,
    },
  });

  // Cache-Control: jangan cache hasil pencarian, cache listing biasa 30 detik
  if (!params.q) {
    result.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=300",
    );
  } else {
    result.headers.set("Cache-Control", "no-store");
  }

  return result;
});