// POST /api/admin/ulasan/[id]/balas — admin reply to ulasan
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({ teks: z.string().min(1).max(2000) });

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(422, "Payload tidak valid");

  const ulasan = await prisma.ulasan.findUnique({ where: { id } });
  if (!ulasan) return fail(404, "Ulasan tidak ditemukan");

  const updated = await prisma.ulasan.update({
    where: { id },
    data: { balasan: parsed.data.teks, balasanAt: new Date() },
  });

  try {
    await prisma.notifikasi.create({
      data: {
        userId: ulasan.userId,
        type: "ULASAN",
        title: "Ulasan Dibalas Admin",
        body: `Admin telah menanggapi ulasan Anda untuk pesanan ${ulasan.orderId}.`,
        link: `/ulasan/${ulasan.orderId}/sukses`,
        orderId: ulasan.orderId,
      },
    });
  } catch (err) {
    console.error("Failed to create admin reply notification:", err);
  }

  return ok({ id: updated.id, balasan: updated.balasan });
});
