import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  alasan: z.string().min(1).optional(),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();

  const { id } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));

  const ulasan = await prisma.ulasan.findUnique({
    where: { id },
    select: { produkId: true },
  });
  if (!ulasan) {
    return fail(404, "Ulasan tidak ditemukan");
  }

  await prisma.ulasan.update({
    where: { id },
    data: {
      isHidden: true,
      hiddenReason: body.alasan ?? "Disembunyikan admin",
    },
  });

  // Rekalkulasi denormalisasi rating & jumlah ulasan produk aktif
  const [avgResult, totalCount] = await Promise.all([
    prisma.ulasan.aggregate({
      where: { produkId: ulasan.produkId, isHidden: false },
      _avg: { rating: true },
    }),
    prisma.ulasan.count({ where: { produkId: ulasan.produkId, isHidden: false } }),
  ]);
  await prisma.produk.update({
    where: { id: ulasan.produkId },
    data: {
      rating: avgResult._avg?.rating ?? 0,
      jumlahUlasan: totalCount,
    },
  });

  return ok({
    hidden: true,
  });
});