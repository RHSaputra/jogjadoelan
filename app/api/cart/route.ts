// GET    /api/cart                 — list cart user
// POST   /api/cart                 — add (produkId, ukuran?, warna?, qty)
// DELETE /api/cart                 — clear all
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapCartToDTO } from "@/lib/api/cart-mapper";

const PRODUK_WITH_IMAGES = {
  produk: {
    include: { produkimage: { orderBy: { urutan: "asc" as const } } },
  },
};

export const GET = handler(async () => {
  const u = await requireCustomer();
  const rows = await prisma.cartitem.findMany({
    where: { userId: u.id },
    include: PRODUK_WITH_IMAGES,
    orderBy: { createdAt: "desc" },
  });
  return ok(rows.map(mapCartToDTO));
});

const addSchema = z.object({
  produkId: z.string().min(1),
  ukuran: z.string().optional(),
  warna: z.string().optional(),
  qty: z.number().int().positive().default(1),
});

export const POST = handler(async (req: Request) => {
  const u = await requireCustomer();
  const body = addSchema.parse(await req.json());
  const ukuran = body.ukuran?.trim() || "";
  const warna = body.warna?.trim() || "";

  const produk = await prisma.produk.findUnique({ where: { id: body.produkId } });
  if (!produk) return fail(404, "Produk tidak ditemukan");

  // Upsert: kalau item produk+ukuran+warna sudah ada → tambah qty
  // NOTE: prisma schema cartitem.id tidak punya default, jadi wajib diisi saat create.
  const item = await prisma.cartitem.upsert({
    where: {
      userId_produkId_ukuran_warna: {
        userId: u.id,
        produkId: body.produkId,
        ukuran,
        warna,
      },
    },
    create: {
      id: crypto.randomUUID(),
      userId: u.id,
      produkId: body.produkId,
      ukuran,
      warna,
      qty: body.qty,
    },
    update: { qty: { increment: body.qty } },
    include: PRODUK_WITH_IMAGES,
  });
  return ok(mapCartToDTO(item));
});

export const DELETE = handler(async () => {
  const u = await requireCustomer();
  await prisma.cartitem.deleteMany({ where: { userId: u.id } });
  return ok({ cleared: true });
});