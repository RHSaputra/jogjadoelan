// PATCH /api/admin/produk/[id]/stok
// body: { stok?: number; delta?: number }

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapProdukToDTO } from "@/lib/api/produk-mapper";

type Ctx = { params: Promise<{ id: string }> };

const schema = z
  .object({
    stok: z.number().int().min(0).optional(),
    delta: z.number().int().optional(),
  })
  .refine((v) => v.stok !== undefined || v.delta !== undefined, {
    message: "Harus isi salah satu: stok / delta",
  });

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());

  const exists = await prisma.produk.findUnique({ where: { id }, select: { stok: true } });
  if (!exists) return fail(404, "Produk tidak ditemukan");

  // Gunakan atomic operation untuk delta (hindari race condition)
  const updated = await prisma.produk.update({
    where: { id },
    data: {
      stok: body.delta !== undefined
        ? { increment: body.delta }  // atomic — aman dari race condition
        : body.stok!,                // explicit set
    },
    include: { produkimage: { orderBy: { urutan: "asc" } } },
  });
  return ok(mapProdukToDTO(updated));
});