// PATCH  /api/admin/ekspedisi/[id]
// DELETE /api/admin/ekspedisi/[id]
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const patchSchema = z.object({
  nama: z.string().min(1).optional(),
  layanan: z.string().nullish(),
  estimasi: z.string().nullish(),
  harga: z.number().int().optional(),
  trackUrlTemplate: z.string().nullish(),
  isApi: z.boolean().optional(),
  forReturn: z.boolean().optional(),
  aktif: z.boolean().optional(),
  urutan: z.number().int().optional(),
});

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;
  const body = patchSchema.parse(await req.json());
  try {
    const item = await prisma.ekspedisi.update({ where: { id }, data: body });
    return ok(item);
  } catch {
    return fail(404, "Ekspedisi tidak ditemukan", "NOT_FOUND");
  }
});

export const DELETE = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;
  try {
    await prisma.ekspedisi.delete({ where: { id } });
    return ok({ deleted: true });
  } catch {
    return fail(404, "Ekspedisi tidak ditemukan", "NOT_FOUND");
  }
});
