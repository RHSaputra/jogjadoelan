// GET /api/ulasan — public list of visible (non-hidden) ulasans
// POST /api/ulasan — customer buat ulasan baru (requires auth)
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";
import { mapUlasanToDTO } from "@/lib/api/ulasan-mapper";

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const produkId = searchParams.get("produkId");
  const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 200);

  const where: Record<string, unknown> = { isHidden: false };
  if (produkId) where.produkId = produkId;

  const rows = await prisma.ulasan.findMany({
    where,
    include: {
      user: { select: { id: true, username: true, email: true } },
      produk: { select: { id: true, nama: true, gambarUtama: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return ok(rows.map(mapUlasanToDTO));
});

const PostBody = z.object({
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  komentar: z.string().min(1).max(2000),
  foto: z.array(z.object({ url: z.string(), type: z.string().optional() })).optional(),
});

export const POST = handler(async (req: Request) => {
  const u = await requireUser();
  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(422, "Payload tidak valid");
  const b = parsed.data;

  // Verify orderItem belongs to this user
  const item = await prisma.orderitem.findUnique({
    where: { id: b.orderItemId },
    include: { order: { select: { userId: true, status: true } } },
  });
  if (!item) return fail(404, "Item pesanan tidak ditemukan");
  if (!item.produkId) return fail(400, "Item pesanan tidak memiliki produk terkait");
  if (item.order.userId !== u.id) return fail(403, "Akses ditolak");
  if (item.order.status !== "SELESAI") {
    return fail(400, "Pesanan belum selesai");
  }

  const existing = await prisma.ulasan.findUnique({ where: { orderItemId: b.orderItemId } });
  if (existing) return fail(409, "Ulasan sudah ada untuk item ini");

  const produkId = item.produkId;

  const ulasan = await prisma.ulasan.create({
    data: {
      userId: u.id,
      produkId,
      orderItemId: b.orderItemId,
      orderId: item.orderId,
      rating: b.rating,
      komentar: b.komentar.trim(),
      fotoPaths: b.foto ?? [],
    },
    include: {
      user: { select: { id: true, username: true, email: true } },
      produk: { select: { id: true, nama: true, gambarUtama: true } },
    },
  });

  // Update denormalized rating on Produk
  const [avgResult, totalCount] = await Promise.all([
    prisma.ulasan.aggregate({
      where: { produkId, isHidden: false },
      _avg: { rating: true },
    }),
    prisma.ulasan.count({ where: { produkId, isHidden: false } }),
  ]);
  await prisma.produk.update({
    where: { id: produkId },
    data: {
      rating: avgResult._avg?.rating ?? 0,
      jumlahUlasan: totalCount,
    },
  });

  try {
    await prisma.notifikasi.create({
      data: {
        userId: u.id,
        type: "ULASAN",
        title: "Ulasan Dikirim",
        body: `Terima kasih! Ulasan Anda untuk produk ${ulasan.produk?.nama || "produk"} telah berhasil dikirim.`,
        link: `/ulasan/${item.orderId}/sukses`,
        orderId: item.orderId,
      },
    });
  } catch (err) {
    console.error("Failed to create ulasan notification:", err);
  }

  return ok(mapUlasanToDTO(ulasan));
});
