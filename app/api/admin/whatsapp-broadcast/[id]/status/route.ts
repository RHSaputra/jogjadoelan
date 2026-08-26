// app/api/admin/whatsapp-broadcast/[id]/status/route.ts
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const broadcast = await prisma.whatsappbroadcast.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!broadcast) {
    return fail(404, "Broadcast tidak ditemukan");
  }

  return ok({ broadcast });
});
