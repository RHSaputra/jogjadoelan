// POST /api/ulasan/from-order
// Legacy-compatible upsert: caller passes {orderId, productId, rating, komentar, foto}
// Server resolves orderItemId, then create-or-update the ulasan.
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";
import { mapUlasanToDTO } from "@/lib/api/ulasan-mapper";

const Body = z.object({
  orderId: z.string().min(1),
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  komentar: z.string().min(1).max(2000),
  foto: z
    .array(z.object({ url: z.string(), type: z.string().optional(), name: z.string().optional() }))
    .optional(),
});

export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(422, "Payload tidak valid");
  const b = parsed.data;

  // 1) Verify order belongs to user
  const order = await prisma.order.findFirst({
    where: { id: b.orderId, userId: u.id },
    include: { orderitem: true },
  });
  if (!order) return fail(404, "Pesanan tidak ditemukan");
  if (order.status !== "SELESAI") {
    return fail(400, "Pesanan belum selesai");
  }

  // 2) Find matching orderItem by productId (or fallback to first item)
  const item =
    order.orderitem.find((it) => it.produkId === b.productId) ??
    order.orderitem[0];
  if (!item) return fail(404, "Item pesanan tidak ditemukan");
  if (!item.produkId) return fail(400, "Item pesanan tidak memiliki produk terkait");

  // 3) Upsert ulasan
  const existing = await prisma.ulasan.findUnique({ where: { orderItemId: item.id } });
  const ulasan = existing
    ? await prisma.ulasan.update({
        where: { id: existing.id },
        data: {
          rating: b.rating,
          komentar: b.komentar.trim(),
          fotoPaths: b.foto ?? [],
        },
        include: {
          user: { select: { id: true, username: true, email: true } },
          produk: { select: { id: true, nama: true, gambarUtama: true } },
        },
      })
    : await prisma.ulasan.create({
        data: {
          userId: u.id,
          produkId: item.produkId,
          orderItemId: item.id,
          orderId: order.id,
          rating: b.rating,
          komentar: b.komentar.trim(),
          fotoPaths: b.foto ?? [],
        },
        include: {
          user: { select: { id: true, username: true, email: true } },
          produk: { select: { id: true, nama: true, gambarUtama: true } },
        },
      });

  // 4) Recompute denormalized rating on Produk
  const agg = await prisma.ulasan.aggregate({
    where: { produkId: item.produkId, isHidden: false },
    _avg: { rating: true },
    _count: { id: true },
  });
  await prisma.produk.update({
    where: { id: item.produkId },
    data: {
      rating: agg._avg.rating ?? 0,
      jumlahUlasan: agg._count.id,
    },
  });

  try {
    await prisma.notifikasi.create({
      data: {
        userId: u.id,
        type: "ULASAN",
        title: "Ulasan Dikirim",
        body: `Terima kasih! Ulasan Anda untuk produk ${ulasan.produk?.nama || "produk"} telah berhasil dikirim.`,
        link: `/ulasan/${order.id}/sukses`,
        orderId: order.id,
      },
    });
  } catch (err) {
    console.error("Failed to create ulasan notification:", err);
  }

  return ok(mapUlasanToDTO(ulasan));
});
