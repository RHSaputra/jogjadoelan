import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth-server";
import { mapTukarToDTO } from "@/lib/api/tukar-mapper";

type Ctx = { params: Promise<{ komplainId: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const s = await getSessionUser();
  if (!s) return ok(null);
  const { komplainId } = await ctx.params;
  const where: { komplainId: string; userId?: string } = { komplainId };
  if (s.role !== "ADMIN" && s.role !== "SUPER_ADMIN") where.userId = s.id;
  const t = await prisma.tukar.findFirst({ where });
  return ok(t ? mapTukarToDTO(t) : null);
});