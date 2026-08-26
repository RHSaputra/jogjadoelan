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

  const r = await prisma.ulasan.updateMany({
    where: { id },
    data: {
      isHidden: true,
      hiddenReason: body.alasan ?? "Disembunyikan admin",
    },
  });

  if (r.count === 0) {
    return fail(404, "Ulasan tidak ditemukan");
  }

  return ok({
    hidden: true,
  });
});