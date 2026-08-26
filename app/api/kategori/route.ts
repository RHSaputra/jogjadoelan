export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { serverCache, TTL } from "@/lib/server-cache";

export const GET = handler(async () => {
  const cacheKey = "kategori-list";

  const cachedData = await serverCache.getOrSet(
    cacheKey,
    async () => {
      const rows = await prisma.produk.groupBy({
        by: ["jenis", "jenisLabel"],
        where: { isActive: true },
        _count: { _all: true },
      });
      const totalAll = rows.reduce((s, r) => s + r._count._all, 0);

      return [
        { value: "semua", label: "Semua", count: totalAll },
        ...rows.map((r) => ({
          value: r.jenis,
          label: r.jenisLabel,
          count: r._count._all,
        })),
      ];
    },
    TTL.MEDIUM // 5 minutes TTL
  );

  return ok(cachedData);
});