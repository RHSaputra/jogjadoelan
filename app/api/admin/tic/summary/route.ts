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
    // Aggregasi pendapatan pesanan langsung di level database SQL
    prisma.order.aggregate({
      where: {
        ...dateRange,
        status: { in: ["SELESAI", "DIKIRIM", "DIPROSES", "MENUNGGU_KONFIRMASI"] },
      },
      _sum: { total: true, ongkir: true, biayaPacking: true, diskon: true, subtotal: true },
    }),
  ]);

  // ─── CUSTOM ORDER STATS ────────────────────────────────────────
  const [customOrderSelesai, customOrderDibatalkan] = await Promise.all([
    prisma.customorder.count({
      where: { ...dateRange, status: "SELESAI" },
    }),
    prisma.customorder.count({
      where: { ...dateRange, status: "DIBATALKAN" },
    }),
  ]);

  // ─── PAYMENT STATS (NATIVE AGGREGATE) ─────────────────────────
  const paymentDateFilter = (f.from || f.to)
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
    : {};

  const verifiedPaymentsAgg = await prisma.payment.aggregate({
    where: {
      status: "VERIFIED",
      ...paymentDateFilter,
    },
    _sum: { nominal: true },
  });

  // ─── REFUND STATS (NATIVE AGGREGATE) ──────────────────────────
  const refundDateFilter = (f.from || f.to)
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
    : {};

  const refundAgg = await prisma.refund.aggregate({
    where: {
      status: { in: ["SELESAI", "TRANSFER_DIKIRIM"] },
      ...refundDateFilter,
    },
    _sum: { nominalRefund: true },
    _count: true,
  });

  // ─── CALCULATE FINANCIALS ─────────────────────────────────────
  const grossRevenue = allOrdersForRevenue._sum?.total ?? 0;
  const totalVerifiedPayment = verifiedPaymentsAgg._sum?.nominal ?? 0;
  const totalRefundAmount = refundAgg._sum?.nominalRefund ?? 0;
  const totalRefundCount = refundAgg._count ?? 0;
  const totalOngkir = allOrdersForRevenue._sum?.ongkir ?? 0;
  const totalBiayaPacking = allOrdersForRevenue._sum?.biayaPacking ?? 0;

  const netRevenue = grossRevenue - totalRefundAmount;
  const grossProfit = grossRevenue - totalOngkir - totalBiayaPacking;
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
