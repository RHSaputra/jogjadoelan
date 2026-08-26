// POST /api/custom/[id]/reject  → customer tolak quote admin
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";
import { mapCustomOrderToDTO } from "@/lib/api/custom-mapper";

export const POST = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const u = await requireUser();
    const { id } = await ctx.params;

    const c = await prisma.customorder.findUnique({ where: { id } });
    if (!c) return fail(404, "Custom order tidak ditemukan");
    if (c.userId !== u.id) return fail(403, "Akses ditolak");
    if (c.status !== "MENUNGGU_PERSETUJUAN" && c.status !== "ESTIMATED") {
      return fail(400, "Order tidak bisa ditolak di status ini");
    }

    const updated = await prisma.customorder.update({
      where: { id },
      data: { status: "REJECTED" },
      include: {
        user: { select: { id: true, username: true, email: true } },
        customprogress: { orderBy: { createdAt: "asc" } },
        payment: { orderBy: { createdAt: "asc" } },
      },
    });
    return ok(mapCustomOrderToDTO(updated));
  },
);