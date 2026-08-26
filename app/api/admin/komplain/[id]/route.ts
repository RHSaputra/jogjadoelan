import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapKomplainToDTO } from "@/lib/api/komplain-mapper";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const k = await prisma.komplain.findUnique({
    where: { id },
    include: {
      
      user: { select: { id: true, username: true, email: true } },
      refund: true,
      tukar: true,
    },
  });
  if (!k) return fail(404, "Komplain tidak ditemukan");
  return ok({
    ...mapKomplainToDTO(k),
    userId: k.userId,
    userName: k.user.username ?? k.user.email ?? `User ${k.userId.slice(0, 6)}`,
    userEmail: k.user.email,
    refund: k.refund,
    tukar: k.tukar,
  });
});