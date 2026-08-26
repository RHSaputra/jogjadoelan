// POST /api/akun/alamat  — tambah alamat baru
// GET  /api/akun/alamat  — list (opsional, /me sudah include juga)

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";

const alamatSchema = z.object({
  label: z.string().min(1),
  penerima: z.string().min(1),
  noHp: z.string().min(8),
  provinsi: z.string().min(1),
  kota: z.string().min(1),
  kecamatan: z.string().min(1),
  kodePos: z.string().min(3),
  detail: z.string().min(1),
  isUtama: z.boolean().default(false),
  isToko: z.boolean().default(false),
  isPengembalian: z.boolean().default(false),
});

export const GET = handler(async () => {
  const me = await requireCustomer();
  const list = await prisma.alamat.findMany({
    where: { userId: me.id },
    orderBy: { isUtama: "desc" },
  });
  return ok(list);
});

export const POST = handler(async (req: Request) => {
  const me = await requireCustomer();
  const data = alamatSchema.parse(await req.json());

  const created = await prisma.$transaction(async (tx) => {
    if (data.isUtama) {
      await tx.alamat.updateMany({
        where: { userId: me.id },
        data: { isUtama: false },
      });
    }
    return tx.alamat.create({
      data: { ...data, userId: me.id, id: `ALM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
    });
  });
  return ok(created);
});