// DELETE /api/notifikasi/[id]
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const r = await prisma.notifikasi.deleteMany({ where: { id, userId: u.id } });
  if (r.count === 0) return fail(404, "Notifikasi tidak ditemukan");
  return ok({ deleted: true });
});