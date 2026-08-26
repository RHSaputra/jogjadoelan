// DELETE /api/voucher-usage/[id]  — [id] = voucherId, hapus usage milik user ini

import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id: voucherId } = await ctx.params;

  const existing = await prisma.voucherusage.findUnique({
    where: { voucherId_userId: { voucherId, userId: me.id } },
  });
  if (!existing) return fail(404, "Usage tidak ditemukan");

  await prisma.voucherusage.delete({
    where: { voucherId_userId: { voucherId, userId: me.id } },
  });
  return ok({ deleted: true });
});
