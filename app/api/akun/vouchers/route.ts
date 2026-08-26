// GET  /api/akun/vouchers          — daftar voucher yang sudah diklaim user
// POST /api/akun/vouchers          — klaim voucher baru; body: { kode }

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";

export const GET = handler(async () => {
  const me = await requireUser();
  const usages = await prisma.voucherusage.findMany({
    where: { userId: me.id },
    include: { voucher: true },
    orderBy: { dipakaiAt: "desc" },
  });
  return ok(
    usages.map((u) => ({
      voucherId: u.voucherId,
      kode: u.voucher.kode,
      judul: u.voucher.judul,
      nilai: u.voucher.nilai,
      jenis: u.voucher.jenis,
      minOrder: u.voucher.minOrder,
      maxDiscount: u.voucher.maxDiscount,
      expiredAt: u.voucher.expiredAt,
      dipakaiAt: u.dipakaiAt,
    })),
  );
});

const postSchema = z.object({
  kode: z.string().min(1),
});

export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const { kode } = postSchema.parse(await req.json());

  const voucher = await prisma.voucher.findUnique({ where: { kode } });
  if (!voucher) return fail(404, "Kode voucher tidak ditemukan");
  if (!voucher.aktif) return fail(400, "Voucher tidak aktif");
  if (voucher.expiredAt && new Date() > voucher.expiredAt)
    return fail(400, "Voucher sudah kadaluarsa");
  if (voucher.kuota !== null && voucher.terpakai >= voucher.kuota)
    return fail(400, "Kuota voucher sudah habis");

  const existing = await prisma.voucherusage.findUnique({
    where: { voucherId_userId: { voucherId: voucher.id, userId: me.id } },
  });
  if (existing) return fail(400, "Voucher sudah pernah diklaim", "ALREADY_CLAIMED");

  const usage = await prisma.voucherusage.create({
    data: { voucherId: voucher.id, userId: me.id },
    include: { voucher: true },
  });

  return ok({
    voucherId: usage.voucherId,
    kode: usage.voucher.kode,
    judul: usage.voucher.judul,
    dipakaiAt: usage.dipakaiAt,
  });
});
