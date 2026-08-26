// GET /api/admin/qris — ambil config QRIS (singleton id=1)
// PUT /api/admin/qris — update config QRIS
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const upsertSchema = z.object({
  merchantName: z.string().default("Jogjadoelan QRIS"),
  qrPath: z.string().nullish(),
  aktif: z.boolean().default(true),
});

export const GET = handler(async () => {
  await requireAdmin();
  const qris = await prisma.qrisconfig.findUnique({ where: { id: 1 } });
  return ok(qris ?? { merchantName: "Jogjadoelan QRIS", aktif: true, qrPath: null });
});

export const PUT = handler(async (req: Request) => {
  await requireAdmin();
  const body = upsertSchema.parse(await req.json());
  const qris = await prisma.qrisconfig.upsert({
    where: { id: 1 },
    update: body,
    create: { id: 1, ...body },
  });
  return ok(qris);
});
