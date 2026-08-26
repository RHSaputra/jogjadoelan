// GET /api/order/[id]  — detail pesanan milik user

import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapOrderToLegacy } from "@/lib/api/order-mapper";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const me = await requireCustomer();
  const { id } = await ctx.params;
  const o = await prisma.order.findUnique({
    where: { id },
    include: { orderitem: true, ordertimeline: { orderBy: { at: "asc" } }, payment: true },
  });
  if (!o || o.userId !== me.id) return fail(404, "Pesanan tidak ditemukan");
  return ok(mapOrderToLegacy({
    ...o,
    items: o.orderitem,
    timeline: o.ordertimeline,
    payments: o.payment,
  }));
});
