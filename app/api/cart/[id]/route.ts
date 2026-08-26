// PATCH  { qty }
// DELETE
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapCartToDTO } from "@/lib/api/cart-mapper";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ qty: z.number().int().positive() });

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const exist = await prisma.cartitem.findFirst({ where: { id, userId: u.id } });
  if (!exist) return fail(404, "Item tidak ditemukan");
  const updated = await prisma.cartitem.update({
    where: { id },
    data: { qty: body.qty },
    include: {
      produk: {
        include: { produkimage: { orderBy: { urutan: "asc" } } },
      },
    },
  });
  return ok(mapCartToDTO(updated));
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const r = await prisma.cartitem.deleteMany({ where: { id, userId: u.id } });
  if (r.count === 0) return fail(404, "Item tidak ditemukan");
  return ok({ deleted: true });
});