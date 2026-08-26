import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

interface StatsQueryResult {
  total: bigint;
  promo: bigint;
  low: bigint;
  out: bigint;
  totalValue: number | null;
  totalStokUnits: number | null;
}

export const GET = handler(async () => {
  await requireAdmin();

  // Single database round-trip to compute all metrics
  const results = await prisma.$queryRaw<StatsQueryResult[]>`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN isPromo = 1 OR diskonPersen > 0 OR promoLabel IS NOT NULL THEN 1 ELSE 0 END) as promo,
      SUM(CASE WHEN stok > 0 AND stok < 5 THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN stok <= 0 THEN 1 ELSE 0 END) as \`out\`,
      SUM(harga * stok) as totalValue,
      SUM(stok) as totalStokUnits
    FROM produk
  `;

  const stats = results[0] || {
    total: BigInt(0),
    promo: BigInt(0),
    low: BigInt(0),
    out: BigInt(0),
    totalValue: 0,
    totalStokUnits: 0,
  };

  return ok({
    total: Number(stats.total),
    promo: Number(stats.promo),
    low: Number(stats.low),
    out: Number(stats.out),
    overridden: 0,
    totalValue: Number(stats.totalValue || 0),
    totalStokUnits: Number(stats.totalStokUnits || 0),
  });
});