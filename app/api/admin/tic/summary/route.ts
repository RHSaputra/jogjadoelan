// GET /api/admin/tic/summary?from=&to=
// Financial Intelligence Summary - aggregates from order, payment, refund, customorder
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const qs = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));

  let createdAtRange: Prisma.DateTimeFilter | undefined;
  if (f.from || f.to) {
    const range: Prisma.DateTimeFilter = {};
    if (f.from) range.gte = new Date(f.from);
    if (f.to) {
      const toDate = new Date(f.to);
      toDate.setHours(23, 59, 59, 999);
      range.lte = toDate;
    }
    createdAtRange = range;
  }
  const dateRange = createdAtRange ? { createdAt: createdAtRange } : {};

  // ─── ORDER STATS ──────────────────────────────────────────────
  const [
    totalOrders,
    orderSelesai,
    orderPending,
    orderDiproses,
    orderDikirim,
    orderDibatalkan,
    orderKadaluarsa,
    allOrdersForRevenue,
  ] = await Promise.all([
    // Total orders
    prisma.order.count({ where: { ...dateRange } }),
    // Selesai
    prisma.order.count({ where: { ...dateRange, status: "SELESAI" } }),
    // Pending (menunggu pembayaran + menunggu konfirmasi)
    prisma.order.count({
      where: { ...dateRange, status: { in: ["MENUNGGU_PEMBAYARAN", "MENUNGGU_KONFIRMASI"] } },
    }),
    // Diproses
    prisma.order.count({ where: { ...dateRange, status: "DIPROSES" } }),
    // Dikirim
    prisma.order.count({ where: { ...dateRange, status: "DIKIRIM" } }),
    // Dibatalkan
    prisma.order.count({ where: { ...dateRange, status: "DIBATALKAN" } }),
    // Kadaluarsa
    prisma.order.count({ where: { ...dateRange, status: "KADALUARSA" } }),
    // All orders for revenue calculation
    prisma.order.findMany({
      where: {
        ...dateRange,
        status: { in: ["SELESAI", "DIKIRIM", "DIPROSES", "MENUNGGU_KONFIRMASI"] },
      },
      select: { total: true, ongkir: true, biayaPacking: true, diskon: true, subtotal: true },
    }),
  ]);

  // ─── CUSTOM ORDER STATS ────────────────────────────────────────
  const customOrderSelesai = await prisma.customorder.count({
    where: { ...dateRange, status: "SELESAI" },
  });
  const customOrderDibatalkan = await prisma.customorder.count({
    where: { ...dateRange, status: "DIBATALKAN" },
  });

  // ─── PAYMENT STATS ────────────────────────────────────────────
  const verifiedPayments = await prisma.payment.findMany({
    where: {
      status: "VERIFIED",
      ...(f.from || f.to
        ? {
            createdAt: {
              ...(f.from ? { gte: new Date(f.from) } : {}),
              ...(f.to
                ? (() => {
                    const d = new Date(f.to);
                    d.setHours(23, 59, 59, 999);
                    return { lte: d };
                  })()
                : {}),
            },
          }
        : {}),
    },
    select: { nominal: true, type: true },
  });

  // ─── REFUND STATS ─────────────────────────────────────────────
  const refunds = await prisma.refund.findMany({
    where: {
      status: { in: ["SELESAI", "TRANSFER_DIKIRIM"] },
      ...(f.from || f.to
        ? {
            createdAt: {
              ...(f.from ? { gte: new Date(f.from) } : {}),
              ...(f.to
                ? (() => {
                    const d = new Date(f.to);
                    d.setHours(23, 59, 59, 999);
                    return { lte: d };
                  })()
                : {}),
            },
          }
        : {}),
    },
    select: { nominalRefund: true },
  });

  // ─── CALCULATE FINANCIALS ─────────────────────────────────────
  // Gross Revenue = sum of all order.total (SELESAI + DIKIRIM + DIPROSES + MENUNGGU_KONFIRMASI)
  const grossRevenue = allOrdersForRevenue.reduce((sum, o) => sum + o.total, 0);

  // Total verified payment nominal
  const totalVerifiedPayment = verifiedPayments.reduce((sum, p) => sum + p.nominal, 0);

  // Total Refund Amount
  const totalRefundAmount = refunds.reduce((sum, r) => sum + r.nominalRefund, 0);
  const totalRefundCount = refunds.length;

  // Net Revenue = Gross Revenue - Total Refund
  const netRevenue = grossRevenue - totalRefundAmount;

  // Gross Profit = Revenue - Ongkir (biaya yang ditanggung toko)
  const totalOngkir = allOrdersForRevenue.reduce((sum, o) => sum + o.ongkir, 0);
  const totalBiayaPacking = allOrdersForRevenue.reduce((sum, o) => sum + o.biayaPacking, 0);
  const grossProfit = grossRevenue - totalOngkir - totalBiayaPacking;

  // Net Profit = Gross Profit - Total Refund
  const netProfit = grossProfit - totalRefundAmount;

  // Losses = from cancelled orders that had verified payment
  const totalDibatalkan = orderDibatalkan + customOrderDibatalkan;

  // Refund Ratio = (Total Refund / Gross Revenue) * 100
  const refundRatio = grossRevenue > 0 ? (totalRefundAmount / grossRevenue) * 100 : 0;

  // Cancellation Ratio = (Dibatalkan / Total Orders) * 100
  const totalAllOrders = totalOrders + customOrderSelesai + customOrderDibatalkan;
  const cancellationRatio = totalAllOrders > 0 ? (totalDibatalkan / totalAllOrders) * 100 : 0;

  // Profit Margin = (Net Profit / Gross Revenue) * 100
  const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  return ok({
    orders: {
      total: totalOrders,
      selesai: orderSelesai,
      pending: orderPending,
      diproses: orderDiproses,
      dikirim: orderDikirim,
      dibatalkan: totalDibatalkan,
      kadaluarsa: orderKadaluarsa,
    },
    financials: {
      grossRevenue,
      netRevenue,
      grossProfit,
      netProfit,
      totalRefundAmount,
      totalRefundCount,
      totalOngkir,
      totalBiayaPacking,
      totalVerifiedPayment,
    },
    ratios: {
      refundRatio: Math.round(refundRatio * 100) / 100,
      cancellationRatio: Math.round(cancellationRatio * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
    },
  });
});
