// GET    /api/wishlist
// POST   /api/wishlist   body: { produkId }
// DELETE /api/wishlist   clear all
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapWishToDTO } from "@/lib/api/wishlist-mapper";

export const GET = handler(async () => {
  const u = await requireCustomer();
  const rows = await prisma.wishlistitem.findMany({
    where: { userId: u.id },
    include: { produk: { include: { produkimage: { orderBy: { urutan: "asc" as const } } } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(rows.map(mapWishToDTO));
});

const schema = z.object({ produkId: z.string().min(1) });

export const POST = handler(async (req: Request) => {
  const u = await requireCustomer();
  const body = schema.parse(await req.json());
  const produk = await prisma.produk.findUnique({ where: { id: body.produkId } });
  if (!produk) return fail(404, "Produk tidak ditemukan");

  const item = await prisma.wishlistitem.upsert({
    where: { userId_produkId: { userId: u.id, produkId: body.produkId } },
    create: { userId: u.id, produkId: body.produkId },
    update: {},   // no-op kalau sudah ada
    include: { produk: { include: { produkimage: { orderBy: { urutan: "asc" as const } } } } },
  });
  return ok(mapWishToDTO(item));
});

export const DELETE = handler(async () => {
  const u = await requireCustomer();
  await prisma.wishlistitem.deleteMany({ where: { userId: u.id } });
  return ok({ cleared: true });
});