import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const qs = z.object({ days: z.coerce.number().int().min(7).max(90).default(30) });

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const { days } = qs.parse(Object.fromEntries(searchParams));

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));

  const rows = await prisma.order.findMany({
    where: { status: "SELESAI", konfirmasiDiterimaAt: { gte: from } },
    select: { total: true, konfirmasiDiterimaAt: true },
  });

  // Bucket harian
  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from); d.setDate(from.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }
  for (const r of rows) {
    if (!r.konfirmasiDiterimaAt) continue;
    const key = r.konfirmasiDiterimaAt.toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (b) { b.revenue += r.total; b.orders += 1; }
  }

  return ok({
    days,
    series: Array.from(buckets, ([date, v]) => ({ date, ...v })),
  });
});