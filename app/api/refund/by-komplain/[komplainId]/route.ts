import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth-server";
import { mapRefundToDTO } from "@/lib/api/refund-mapper";

type Ctx = { params: Promise<{ komplainId: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const s = await getSessionUser();
  if (!s) return ok(null);
  const { komplainId } = await ctx.params;
  const where: { komplainId: string; userId?: string } = { komplainId };
  if (s.role !== "ADMIN" && s.role !== "SUPER_ADMIN") where.userId = s.id;
  const r = await prisma.refund.findFirst({ where });
  return ok(r ? mapRefundToDTO(r) : null);
});