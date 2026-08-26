import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapWishToDTO } from "@/lib/api/wishlist-mapper";

const schema = z.object({ produkIds: z.array(z.string()).default([]) });

export const POST = handler(async (req: Request) => {
  const u = await requireCustomer();
  const body = schema.parse(await req.json());

  if (body.produkIds.length) {
    const valid = await prisma.produk.findMany({
      where: { id: { in: [...new Set(body.produkIds)] } },
      select: { id: true },
    });
    await prisma.wishlistitem.createMany({
      data: valid.map((p) => ({ userId: u.id, produkId: p.id })),
      skipDuplicates: true,
    });
  }

  const all = await prisma.wishlistitem.findMany({
    where: { userId: u.id },
    include: { produk: { include: { produkimage: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(all.map(mapWishToDTO));
});