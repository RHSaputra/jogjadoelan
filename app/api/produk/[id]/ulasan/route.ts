export const dynamic = "force-dynamic";

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { mapUlasanToDTO } from "@/lib/api/ulasan-mapper";

type Ctx = { params: Promise<{ id: string }> };
const qs = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const GET = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));

  const where: Prisma.ulasanWhereInput = { produkId: id, isHidden: false };
  if (f.rating) where.rating = f.rating;

  const [rows, total, agg] = await Promise.all([
    prisma.ulasan.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.limit,
      take: f.limit,
    }),
    prisma.ulasan.count({ where }),
    prisma.ulasan.groupBy({
      by: ["rating"],
      where: { produkId: id, isHidden: false },
      _count: { _all: true },
    }),
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
  let sum = 0, count = 0;
  agg.forEach((r) => {
    breakdown[r.rating] = r._count._all;
    sum += r.rating * r._count._all;
    count += r._count._all;
  });
  const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

  return ok({
    items: rows.map((r) => mapUlasanToDTO(r)),
    total, page: f.page, limit: f.limit,
    summary: { avg, count, breakdown },
  });
});