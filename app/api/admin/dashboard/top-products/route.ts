import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const qs = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));

  const from = new Date(); from.setDate(from.getDate() - f.days);

  const grouped = await prisma.orderitem.groupBy({
    by: ["produkId"],
    where: { order: { status: "SELESAI", konfirmasiDiterimaAt: { gte: from } } },
    _sum: { qty: true, subtotal: true },
    orderBy: { _sum: { qty: "desc" } },
    take: f.limit,
  });

  const ids = grouped.map((g) => g.produkId).filter((id): id is string => id !== null);
  const produks = await prisma.produk.findMany({
    where: { id: { in: ids } },
    select: { id: true, nama: true, gambarUtama: true, harga: true, stok: true },
  });
  const map = new Map(produks.map((p) => [p.id, p]));

  const validGroups = grouped.filter((g): g is { produkId: string; _sum: typeof g._sum } => g.produkId !== null);
  return ok(validGroups.map((g) => {
    const produk = map.get(g.produkId);
    return {
      produkId: g.produkId,
      nama: produk?.nama ?? "(produk dihapus)",
      gambar: produk?.gambarUtama ?? null,
      harga: produk?.harga ?? 0,
      stokSaatIni: produk?.stok ?? 0,
      totalTerjual: g._sum.qty ?? 0,
      totalRevenue: g._sum.subtotal ?? 0,
    };
  }));
});