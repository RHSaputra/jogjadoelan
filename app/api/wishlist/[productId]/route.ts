// DELETE /api/wishlist/[productId] — hapus by productId (toggle off)

import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";

type Ctx = {
  params: Promise<{
    productId: string;
  }>;
};

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { productId } = await ctx.params;

  await prisma.wishlistitem.deleteMany({
    where: {
      userId: u.id,
      produkId: productId,
    },
  });

  return ok({
    deleted: true,
  });
});