// GET /api/admin/tic/transactions?page=&limit=&from=&to=&status=&jenisOrder=&search=
// Main transaction table for TIC
import { z } from "zod";
import type { Prisma, order_status, order_jenisOrder } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const qs = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10000).default(20),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  jenisOrder: z.string().optional(), // "REGULER" | "CUSTOM" | ""
  search: z.string().optional(), // search by invoice id or customer name/email
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));

  const dateWhere: Prisma.orderWhereInput = {};
  if (f.from || f.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (f.from) createdAt.gte = new Date(f.from);
    if (f.to) {
      const d = new Date(f.to);
      d.setHours(23, 59, 59, 999);
      createdAt.lte = d;
    }
    dateWhere.createdAt = createdAt;
  }

  // Build order where
  const orderWhere: Prisma.orderWhereInput = { ...dateWhere };
  if (f.status) {
    const validStatuses = ["MENUNGGU_PEMBAYARAN", "MENUNGGU_KONFIRMASI", "DIPROSES", "DIKIRIM", "SELESAI", "KADALUARSA", "DIBATALKAN"];
    if (validStatuses.includes(f.status)) orderWhere.status = f.status as order_status;
  }
  if (f.jenisOrder && ["REGULER", "CUSTOM"].includes(f.jenisOrder)) {
    orderWhere.jenisOrder = f.jenisOrder as order_jenisOrder;
  }
  if (f.search) {
    const s = f.search.trim();
    orderWhere.OR = [
      { id: { contains: s } },
      { user: { username: { contains: s } } },
      { user: { email: { contains: s } } },
    ];
  }

  const skip = (f.page - 1) * f.limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: f.limit,
      select: {
        id: true,
        status: true,
        jenisOrder: true,
        total: true,
        subtotal: true,
        ongkir: true,
        biayaPacking: true,
        diskon: true,
        createdAt: true,
        user: {
          select: { username: true, email: true },
        },
        refund: {
          select: { nominalRefund: true, status: true },
        },
        payment: {
          where: { status: "VERIFIED" },
          select: { nominal: true, type: true, metode: true },
        },
      },
    }),
    prisma.order.count({ where: orderWhere }),
  ]);

  const items = orders.map((o) => {
    const totalRefund = o.refund.reduce((s, r) => s + r.nominalRefund, 0);
    const hasRefund = o.refund.length > 0;
    const hasFullRefund = o.refund.some(
      (r) => r.status === "SELESAI" && r.nominalRefund >= o.total * 0.9,
    );

    // Determine transaction status label
    let txStatus: string = o.status;
    if (hasFullRefund) txStatus = "REFUND_PENUH";
    else if (hasRefund && totalRefund > 0) txStatus = "REFUND_SEBAGIAN";

    // Profit = total - ongkir - biayaPacking
    const biayaToko = o.ongkir + o.biayaPacking;
    const profit = o.total - biayaToko - totalRefund;

    return {
      id: o.id,
      invoice: o.id.toUpperCase(),
      customer: o.user.username,
      customerEmail: o.user.email,
      tanggal: o.createdAt.toISOString(),
      jenisOrder: o.jenisOrder,
      totalPembayaran: o.total,
      subtotal: o.subtotal,
      ongkir: o.ongkir,
      biayaPacking: o.biayaPacking,
      diskon: o.diskon,
      refund: totalRefund,
      profit,
      status: txStatus,
      rawStatus: o.status,
      metode: o.payment[0]?.metode ?? null,
    };
  });

  return ok({ items, total, page: f.page, limit: f.limit });
});
