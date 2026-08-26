// GET    /api/admin/produk/[id]
// PATCH  /api/admin/produk/[id]
// DELETE /api/admin/produk/[id]

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapProdukToDTO } from "@/lib/api/produk-mapper";
import { serverCache } from "@/lib/server-cache";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const p = await prisma.produk.findUnique({
    where: { id },
    include: { produkimage: { orderBy: { urutan: "asc" } } },
  });
  if (!p) return fail(404, "Produk tidak ditemukan");
  return ok(mapProdukToDTO(p));
});

const patchSchema = z.object({
  nama: z.string().optional(),
  jenis: z.string().optional(),
  jenisLabel: z.string().optional(),
  kondisi: z.string().optional(),
  spesifikasi: z.string().optional(),
  deskripsiSingkat: z.string().optional(),
  deskripsi: z.array(z.string()).optional(),
  ukuran: z.array(z.string()).optional(),
  harga: z.number().int().min(0).optional(),
  diskonPersen: z.number().int().min(0).max(99).nullable().optional(),
  promoLabel: z.string().nullable().optional(),
  stok: z.number().int().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  terjual: z.number().int().min(0).optional(),
  isRekomendasi: z.boolean().optional(),
  isActive: z.boolean().optional(),
  gambars: z.array(z.string()).optional(),
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = patchSchema.parse(await req.json());

  const data: Prisma.produkUpdateInput = {};
  if (body.nama !== undefined) data.nama = body.nama;
  if (body.jenis !== undefined) data.jenis = body.jenis;
  if (body.jenisLabel !== undefined) data.jenisLabel = body.jenisLabel;
  if (body.kondisi !== undefined) data.kondisi = body.kondisi;
  if (body.spesifikasi !== undefined) data.spesifikasi = body.spesifikasi;
  if (body.deskripsiSingkat !== undefined) data.deskripsiSingkat = body.deskripsiSingkat;
  if (body.deskripsi !== undefined) data.deskripsi = body.deskripsi;
  if (body.ukuran !== undefined) data.ukuranList = body.ukuran;
  if (body.harga !== undefined) data.harga = body.harga;
  if (body.diskonPersen !== undefined) {
    const diskon = body.diskonPersen ?? 0;
    data.diskonPersen = diskon;
    // Auto-compute harga coret: harga / (1 - diskon/100)
    if (diskon > 0 && body.harga !== undefined) {
      const hargaDasar = body.harga;
      data.hargaCoret = Math.round(hargaDasar / (1 - diskon / 100));
    } else if (diskon === 0) {
      data.hargaCoret = 0;
    }
  }
  if (body.promoLabel !== undefined) data.promoLabel = body.promoLabel;
  if (body.stok !== undefined) data.stok = body.stok;
  if (body.rating !== undefined) data.rating = body.rating;
  if (body.terjual !== undefined) data.terjual = body.terjual;
  if (body.isRekomendasi !== undefined) data.isRekomendasi = body.isRekomendasi;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (data.diskonPersen !== undefined || data.promoLabel !== undefined) {
    data.isPromo = (body.diskonPersen ?? 0) > 0 || !!body.promoLabel;
  }

  // Update transaksi (produk + replace images)
  const updated = await prisma.$transaction(async (tx) => {
    if (body.gambars !== undefined) {
      await tx.produkimage.deleteMany({ where: { produkId: id } });
      await tx.produkimage.createMany({
        data: body.gambars.map((path, i) => ({
          produkId: id,
          path,
          urutan: i,
          isThumbnail: i === 0,
        })),
      });
    }
    return tx.produk.update({
      where: { id },
      data,
      include: { produkimage: { orderBy: { urutan: "asc" } } },
    });
  });

  serverCache.delete("kategori-list");
  return ok(mapProdukToDTO(updated));
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  // Cek apakah produk sudah pernah dipesan
  const pernahDipesan = await prisma.orderitem.findFirst({
    where: { produkId: id },
    select: { id: true },
  });
  serverCache.delete("kategori-list");
  if (pernahDipesan) {
    // Soft delete: nonaktifkan (jaga relasi histori)
    await prisma.produk.update({ where: { id }, data: { isActive: false } });
    return ok({ softDeleted: true });
  }
  await prisma.produk.delete({ where: { id } });
  return ok({ deleted: true });
});