// PATCH  /api/akun/alamat/[id]  — update / set utama
// DELETE /api/akun/alamat/[id]  — hapus

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";

const patchSchema = z.object({
  label: z.string().optional(),
  penerima: z.string().optional(),
  noHp: z.string().optional(),
  provinsi: z.string().optional(),
  kota: z.string().optional(),
  kecamatan: z.string().optional(),
  kodePos: z.string().optional(),
  detail: z.string().optional(),
  isUtama: z.boolean().optional(),
  isToko: z.boolean().optional(),
  isPengembalian: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const me = await requireCustomer();
  const { id } = await ctx.params;
  const data = patchSchema.parse(await req.json());

  const alamat = await prisma.alamat.findUnique({ where: { id } });
  if (!alamat || alamat.userId !== me.id) return fail(404, "Alamat tidak ditemukan");

  const updated = await prisma.$transaction(async (tx) => {
    if (data.isUtama) {
      await tx.alamat.updateMany({
        where: { userId: me.id },
        data: { isUtama: false },
      });
    }
    return tx.alamat.update({ where: { id }, data });
  });
  return ok(updated);
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const me = await requireCustomer();
  const { id } = await ctx.params;

  const alamat = await prisma.alamat.findUnique({ where: { id } });
  if (!alamat || alamat.userId !== me.id) return fail(404, "Alamat tidak ditemukan");

  await prisma.$transaction(async (tx) => {
    await tx.alamat.delete({ where: { id } });
    if (alamat.isUtama) {
      const fallback = await tx.alamat.findFirst({
        where: { userId: me.id },
        orderBy: { id: "asc" },
      });
      if (fallback) {
        await tx.alamat.update({ where: { id: fallback.id }, data: { isUtama: true } });
      }
    }
  });
  return ok({ deleted: true });
});