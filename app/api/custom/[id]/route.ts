// GET /api/custom/[id] → detail satu custom order milik user yang login (atau admin)

import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";
import { mapCustomOrderToDTO } from "@/lib/api/custom-mapper";

export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const u = await requireUser();
    const { id } = await ctx.params;

    const row = await prisma.customorder.findUnique({
      where: { id },
            include: {
        user: { select: { id: true, username: true, email: true } },
        customprogress: { orderBy: { createdAt: "asc" } },
        payment: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!row) return fail(404, "Custom order tidak ditemukan");

    const isOwner = row.userId === u.id;
    const isAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
    if (!isOwner && !isAdmin) return fail(403, "Akses ditolak");

    return ok(mapCustomOrderToDTO(row));
  },
);