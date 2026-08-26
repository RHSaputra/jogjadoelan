// GET /api/admin/ulasan?q=&hidden=
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapUlasanToDTO } from "@/lib/api/ulasan-mapper";

const qs = z.object({
  q: z.string().optional(),
  hidden: z.enum(["all", "true", "false"]).default("all"),
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));
  const where: Prisma.ulasanWhereInput = {};
  if (f.hidden === "true") where.isHidden = true;
  if (f.hidden === "false") where.isHidden = false;
  if (f.q) {
    where.OR = [
      { komentar: { contains: f.q } },
      { produk: { is: { nama: { contains: f.q } } } },
      { user: { is: { OR: [{ username: { contains: f.q } }, { email: { contains: f.q } }] } } },
    ];
  }
  const rows = await prisma.ulasan.findMany({
    where,
    include: {
      user: { select: { id: true, username: true, email: true } },
      produk: { select: { id: true, nama: true, gambarUtama: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok(rows.map(mapUlasanToDTO));
});