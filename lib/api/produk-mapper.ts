// lib/api/produk-mapper.ts
import type { Prisma } from "@prisma/client";

export interface ProdukDTO {
  id: string;
  slug: string | null;
  nama: string;
  jenis: string;
  jenisLabel: string;
  kondisi: string;
  spesifikasi: string;
  deskripsiSingkat: string;
  deskripsi: string[];
  ukuran: string[];
  harga: number;
  hargaCoret?: number;
  diskonPersen?: number;
  promoLabel?: string;
  stok: number;
  terjual: number;
  rating: number;
  jumlahUlasan: number;
  isPromo: boolean;
  isPreOrder: boolean;
  isRekomendasi: boolean;
  isActive: boolean;
  gambar: string;
  gambars: string[];
  createdAt: string;
  updatedAt: string;
}

export type ProdukWithImages = Prisma.produkGetPayload<{
  include: {
    produkimage: true;
  };
}>;

export function mapProdukToDTO(p: ProdukWithImages): ProdukDTO {
  return {
    id: p.id,
    slug: p.slug,
    nama: p.nama,
    jenis: p.jenis,
    jenisLabel: p.jenisLabel,
    kondisi: p.kondisi,
    spesifikasi: p.spesifikasi,
    deskripsiSingkat: p.deskripsiSingkat,
    deskripsi: Array.isArray(p.deskripsi) ? (p.deskripsi as string[]) : [],
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
    gambar: p.produkimage
      .slice()
      .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))[0]?.path ?? "",
    gambars: p.produkimage
      .slice()
      .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
      .map((i) => i.path),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}