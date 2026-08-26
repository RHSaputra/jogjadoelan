// PATCH /api/admin/bank/[id] — update satu bank
// DELETE /api/admin/bank/[id] — hapus satu bank
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const patchSchema = z.object({
  keyUnik: z.string().min(1).optional(),
  nama: z.string().min(1).optional(),
  noRek: z.string().min(1).optional(),
  anNama: z.string().min(1).optional(),
  color: z.string().optional(),
  logoPath: z.string().nullish(),
  urutan: z.number().int().optional(),
  aktif: z.boolean().optional(),
});

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;
  const body = patchSchema.parse(await req.json());
  try {
    const bank = await prisma.bank.update({ where: { id }, data: body });
    return ok(bank);
  } catch {
    return fail(404, "Bank tidak ditemukan", "NOT_FOUND");
  }
});

export const DELETE = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;
  try {
    await prisma.bank.delete({ where: { id } });
    return ok({ deleted: true });
  } catch {
    return fail(404, "Bank tidak ditemukan", "NOT_FOUND");
  }
});
