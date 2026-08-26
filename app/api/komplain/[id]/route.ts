// GET /api/komplain/[id]
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapKomplainToDTO } from "@/lib/api/komplain-mapper";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const k = await prisma.komplain.findFirst({
    where: { id, userId: u.id },
    include: {
      
      refund: true,
      tukar: true,
    },
  });
  if (!k) return fail(404, "Komplain tidak ditemukan");
  return ok(mapKomplainToDTO(k));
});