// GET /api/admin/order?status=&jenis=&q=&from=&to=

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapOrderToLegacy, STATUS_TO_UPPER } from "@/lib/api/order-mapper";
import type { OrderStatus } from "@/lib/orders-storage";
import type { Prisma } from "@prisma/client";

const qs = z.object({
  status: z.string().optional(),
  jenis: z.enum(["all", "reguler", "custom"]).default("all"),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const PAGE_SIZE = 50;

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));

  const where: Prisma.orderWhereInput = {};
  if (f.status && f.status !== "all") {
    const upper = STATUS_TO_UPPER[f.status as OrderStatus];
    if (upper) where.status = upper;
  }
  if (f.jenis === "reguler") where.jenisOrder = "REGULER";
  else if (f.jenis === "custom") where.jenisOrder = "CUSTOM";

  if (f.q) {
    where.OR = [{ id: { contains: f.q } }];
  }
  if (f.from || f.to) {
    where.createdAt = {};
    if (f.from) where.createdAt.gte = new Date(f.from);
    if (f.to) where.createdAt.lte = new Date(new Date(f.to).getTime() + 86_400_000);
  }

  // Pagination
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? String(PAGE_SIZE))));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { orderitem: true, ordertimeline: true, payment: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  // Filter q tambahan (alamat.nama, noHp) — alamat JSON tidak bisa di-where biasa
  const filtered = f.q
    ? rows.filter((o) => {
        const a =
          o.alamat && typeof o.alamat === "object" && !Array.isArray(o.alamat)
            ? o.alamat
            : null;
        const q = f.q!.toLowerCase();
        const nama = typeof a?.nama === "string" ? a.nama.toLowerCase() : "";
        const noHp = typeof a?.noHp === "string" ? a.noHp : "";
        return o.id.toLowerCase().includes(q) || nama.includes(q) || noHp.includes(q);
      })
    : rows;

  return ok({
    data: filtered.map(mapOrderToLegacy),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});