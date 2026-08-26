import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { toLowerEnum } from "@/lib/api/enum-mapper";

const qs = z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) });

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const { limit } = qs.parse(Object.fromEntries(searchParams));
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { id: true, username: true, email: true } } },
  });
  return ok(rows.map((o) => ({
    id: o.id,
    userName: o.user.username ?? o.user.email ?? "User",
    total: o.total,
    status: toLowerEnum(o.status),
    createdAt: o.createdAt.toISOString(),
  })));
});