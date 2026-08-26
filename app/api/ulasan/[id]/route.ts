// PATCH  { rating, komentar, foto }   — edit dalam 7 hari
// DELETE                              — hapus milik sendiri
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapUlasanToDTO } from "@/lib/api/ulasan-mapper";

type Ctx = { params: Promise<{ id: string }> };
const EDIT_WINDOW_DAYS = 7;

const patchSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  komentar: z.string().min(3).max(2000).optional(),
  foto: z.array(z.object({
    url: z.string(), type: z.literal("image"), name: z.string().optional(),
  })).max(5).optional(),
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const body = patchSchema.parse(await req.json());

  const exist = await prisma.ulasan.findFirst({ where: { id, userId: u.id } });
  if (!exist) return fail(404, "Ulasan tidak ditemukan");
  const ageMs = Date.now() - exist.createdAt.getTime();
  if (ageMs > EDIT_WINDOW_DAYS * 24 * 3600 * 1000) {
    return fail(400, `Ulasan hanya bisa diedit dalam ${EDIT_WINDOW_DAYS} hari`);
  }

  const updated = await prisma.ulasan.update({
    where: { id },
    data: {
      rating: body.rating ?? exist.rating,
      komentar: body.komentar ?? exist.komentar,
      fotoPaths: body.foto ?? (exist.fotoPaths === null ? Prisma.JsonNull : exist.fotoPaths),
    },
    include: {
      user: { select: { id: true, username: true, email: true } },
      produk: { select: { id: true, nama: true, gambarUtama: true } },
    },
  });
  return ok(mapUlasanToDTO(updated));
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const r = await prisma.ulasan.deleteMany({ where: { id, userId: u.id } });
  if (r.count === 0) return fail(404, "Ulasan tidak ditemukan");
  return ok({ deleted: true });
});