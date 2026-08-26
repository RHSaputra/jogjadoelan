// GET  /api/admin/ekspedisi — list semua ekspedisi
// PUT  /api/admin/ekspedisi — bulk replace seluruh list
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const itemSchema = z.object({
  id: z.string().optional(),
  keyUnik: z.string().min(1),
  nama: z.string().min(1),
  layanan: z.string().nullish(),
  estimasi: z.string().nullish(),
  harga: z.number().int().default(0),
  trackUrlTemplate: z.string().nullish(),
  isApi: z.boolean().default(false),
  forReturn: z.boolean().default(false),
  aktif: z.boolean().default(true),
  urutan: z.number().int().default(0),
});

export const GET = handler(async () => {
  await requireAdmin();
  const list = await prisma.ekspedisi.findMany({ orderBy: { urutan: "asc" } });
  return ok(list);
});

export const PUT = handler(async (req: Request) => {
  await requireAdmin();
  const body = z.array(itemSchema).parse(await req.json());
  await prisma.ekspedisi.deleteMany();
  await prisma.ekspedisi.createMany({
    data: body.map((e, i) => ({
      keyUnik: e.keyUnik || `kurir-${i}`,
      nama: e.nama,
      layanan: e.layanan ?? null,
      estimasi: e.estimasi ?? null,
      harga: e.harga ?? 0,
      trackUrlTemplate: e.trackUrlTemplate ?? null,
      isApi: e.isApi,
      forReturn: e.forReturn,
      aktif: e.aktif,
      urutan: e.urutan ?? i,
    })),
  });
  const result = await prisma.ekspedisi.findMany({ orderBy: { urutan: "asc" } });
  return ok(result);
});
