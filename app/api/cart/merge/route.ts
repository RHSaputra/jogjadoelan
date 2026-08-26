// POST /api/cart/merge   body: { items: [{produkId, ukuran?, warna?, qty}] }
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapCartToDTO } from "@/lib/api/cart-mapper";

const schema = z.object({
  items: z
    .array(
      z.object({
        produkId: z.string().min(1),
        ukuran: z.string().optional(),
        warna: z.string().optional(),
        qty: z.number().int().positive(),
      }),
    )
    .default([]),
});

export const POST = handler(async (req: Request) => {
  const u = await requireCustomer();
  const body = schema.parse(await req.json());

  if (body.items.length) {
    // Validasi produk ada
    const ids = [...new Set(body.items.map((i) => i.produkId))];
    const produks = await prisma.produk.findMany({
      where: { id: { in: ids } }, select: { id: true },
    });
    const valid = new Set(produks.map((p) => p.id));

    await prisma.$transaction(
      body.items
        .filter((i) => valid.has(i.produkId))
        .map((i) => {
          const ukuran = i.ukuran?.trim() || "";
          const warna = i.warna?.trim() || "";
          return prisma.cartitem.upsert({
            where: {
              userId_produkId_ukuran_warna: {
                userId: u.id,
                produkId: i.produkId,
                ukuran,
                warna,
              },
            },
            create: {
              userId: u.id,
              produkId: i.produkId,
              ukuran,
              warna,
              qty: i.qty,
            },
            update: { qty: { increment: i.qty } },
          });
        }),
    );
  }

  const all = await prisma.cartitem.findMany({
    where: { userId: u.id },
    include: {
      produk: {
        include: { produkimage: { orderBy: { urutan: "asc" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(all.map(mapCartToDTO));
});