import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const r = await prisma.ulasan.deleteMany({ where: { id } });
  if (r.count === 0) return fail(404, "Ulasan tidak ditemukan");
  return ok({ deleted: true });
});