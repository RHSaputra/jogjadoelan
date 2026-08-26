import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { STATUS_TO_UPPER } from "@/lib/api/order-mapper";
import type { OrderStatus } from "@/lib/orders-storage";

export const GET = handler(async () => {
  await requireAdmin();
  const grouped = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { total: true },
  });
  const byStatus: Partial<Record<OrderStatus, number>> = {};
  let total = 0;
  let omzet = 0;
  for (const g of grouped) {
    const lower = (Object.keys(STATUS_TO_UPPER) as OrderStatus[]).find(
      (k) => STATUS_TO_UPPER[k] === g.status,
    );
    if (lower) byStatus[lower] = g._count._all;
    total += g._count._all;
    if (["DIPROSES", "DIKIRIM", "SELESAI"].includes(g.status)) {
      omzet += g._sum.total ?? 0;
    }
  }
  return ok({ total, byStatus, omzet });
});