// POST /api/notifikasi/[id]/read
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  await prisma.notifikasi.updateMany({
    where: { id, userId: u.id },
    data: { isRead: true },
  });
  return ok({ ok: true });
});