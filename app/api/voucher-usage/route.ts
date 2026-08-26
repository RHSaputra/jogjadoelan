// GET  /api/voucher-usage?voucherId=xxx  → { used, count }
// POST /api/voucher-usage               → { voucherId, orderId? } mark used

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";

export const GET = handler(async (req: Request) => {
  const me = await requireUser();
  const { searchParams } = new URL(req.url);
  const voucherId = searchParams.get("voucherId");
  if (!voucherId) return fail(422, "voucherId wajib");

  const count = await prisma.voucherusage.count({
    where: { voucherId, userId: me.id },
  });
  return ok({ used: count > 0, count });
});

const postSchema = z.object({
  voucherId: z.string().min(1),
  orderId: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const { voucherId, orderId } = postSchema.parse(await req.json());

  const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } });
  if (!voucher) return fail(404, "Voucher tidak ditemukan");

  const usage = await prisma.voucherusage.upsert({
    where: { voucherId_userId: { voucherId, userId: me.id } },
    update: { orderId: orderId ?? null },
    create: { voucherId, userId: me.id, orderId: orderId ?? null },
  });
  return ok(usage);
});
