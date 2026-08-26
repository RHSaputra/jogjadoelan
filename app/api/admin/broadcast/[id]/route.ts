// DELETE /api/admin/broadcast/[id]
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

export const DELETE = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await ctx.params;
    const row = await prisma.broadcast.findUnique({ where: { id } });
    if (!row) return fail(404, "Broadcast tidak ditemukan");
    await prisma.broadcast.delete({ where: { id } });
    return ok({ id });
  },
);
