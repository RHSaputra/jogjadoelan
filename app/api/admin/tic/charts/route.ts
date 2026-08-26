// GET /api/admin/tic/charts?period=daily|weekly|monthly&days=30&from=&to=
// Chart data: Revenue/Profit/Refund trend + Top Products + Top Customers
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const qs = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  days: z.coerce.number().int().min(7).max(365).default(30),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));

  const toDate = f.to ? (() => { const d = new Date(f.to!); d.setHours(23,59,59,999); return d; })() : new Date();
  const fromDate = f.from ? new Date(f.from) : (() => { const d = new Date(toDate); d.setDate(d.getDate() - f.days); return d; })();

  // ─── ORDERS IN RANGE ──────────────────────────────────────────
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      status: { in: ["SELESAI", "DIKIRIM", "DIPROSES", "MENUNGGU_KONFIRMASI"] },
    },
    select: {
      id: true,
      total: true,
      ongkir: true,
      biayaPacking: true,
      createdAt: true,
      refund: { select: { nominalRefund: true, status: true } },
      orderitem: {
        select: {
          produkId: true,
          snapNama: true,
          snapGambar: true,
          subtotal: true,
          qty: true,
        },
      },
      user: { select: { username: true } },
    },
  });

  // ─── TREND DATA ───────────────────────────────────────────────
  type TrendPoint = { date: string; revenue: number; profit: number; refund: number; orders: number };
  const trendMap = new Map<string, TrendPoint>();

  for (const o of orders) {
    const date = o.createdAt;
    let key: string;

    if (f.period === "monthly") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } else if (f.period === "weekly") {
      // Week number within year
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const weekNo = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      key = `${date.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
    } else {
      key = date.toISOString().slice(0, 10);
    }

    if (!trendMap.has(key)) {
      trendMap.set(key, { date: key, revenue: 0, profit: 0, refund: 0, orders: 0 });
    }

    const point = trendMap.get(key)!;
    const refundTotal = o.refund.reduce((s, r) => s + r.nominalRefund, 0);
    const biayaToko = o.ongkir + o.biayaPacking;
    const profit = o.total - biayaToko - refundTotal;

    point.revenue += o.total;
    point.profit += profit;
    point.refund += refundTotal;
    point.orders += 1;
  }

  const trend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // ─── TOP PRODUCTS ─────────────────────────────────────────────
  type ProdStat = { produkId: string; nama: string; gambar: string | null; totalRevenue: number; totalQty: number; totalProfit: number };
  const prodMap = new Map<string, ProdStat>();

  for (const o of orders) {
    const refundTotal = o.refund.reduce((s, r) => s + r.nominalRefund, 0);
    const refundRatioPerItem = o.total > 0 ? refundTotal / o.total : 0;

    for (const item of o.orderitem) {
      if (!item.produkId) continue;
      if (!prodMap.has(item.produkId)) {
        prodMap.set(item.produkId, {
          produkId: item.produkId,
          nama: item.snapNama,
          gambar: item.snapGambar,
          totalRevenue: 0,
          totalQty: 0,
          totalProfit: 0,
        });
      }
      const p = prodMap.get(item.produkId)!;
      const itemRefund = Math.round(item.subtotal * refundRatioPerItem);
      p.totalRevenue += item.subtotal;
      p.totalQty += item.qty;
      p.totalProfit += item.subtotal - itemRefund;
    }
  }

  const topProducts = Array.from(prodMap.values())
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 10);

  // ─── TOP CUSTOMERS ────────────────────────────────────────────
  type CustStat = { username: string; totalTransaksi: number; totalRevenue: number };
  const custMap = new Map<string, CustStat>();

  for (const o of orders) {
    const key = o.user.username;
    if (!custMap.has(key)) {
      custMap.set(key, { username: key, totalTransaksi: 0, totalRevenue: 0 });
    }
    const c = custMap.get(key)!;
    c.totalTransaksi += 1;
    c.totalRevenue += o.total;
  }

  const topCustomers = Array.from(custMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  return ok({ trend, topProducts, topCustomers, period: f.period });
});
