import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const qs = z.object({
  threshold: z.coerce.number().int().min(0).max(100).default(5),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));
  const rows = await prisma.produk.findMany({
    where: { stok: { lte: f.threshold } },
    orderBy: { stok: "asc" },
    take: f.limit,
    select: { id: true, nama: true, gambarUtama: true, stok: true, harga: true },
  });
  return ok(rows);
});