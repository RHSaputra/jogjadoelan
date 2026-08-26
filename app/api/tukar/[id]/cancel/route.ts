import { pushSystemChatLog } from "@/lib/chat-system-server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapTukarToDTO } from "@/lib/api/tukar-mapper";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ alasan: z.string().optional() });

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));
  const t = await prisma.tukar.findFirst({ where: { id, userId: u.id } });
  if (!t) return fail(404, "Tukar tidak ditemukan");
  if (!["MENUNGGU_REVIEW_ADMIN", "MENUNGGU_PENGIRIMAN_BALIK"].includes(t.status)) {
    return fail(400, "Tukar tidak bisa dibatalkan pada status ini");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u2 = await tx.tukar.update({
      where: { id },
      data: {
        status: "DIBATALKAN",
        cancelledAt: now,
        cancelReason: body.alasan ?? null,
      },
    });
    await tx.komplain.update({ where: { id: t.komplainId }, data: { status: "DIBATALKAN" } });
    await pushSystemChatLog(t.userId, `Tukar dibatalkan oleh pembeli${body.alasan ? `. Alasan: ${body.alasan}` : "."}`, { kind: "komplain", refId: t.komplainId, label: "Komplain " + t.komplainId, href: "/komplain/" + t.komplainId }, tx);
    return u2;
  });
  // Notifikasi real-time ke admin via komplain channel
  await pusher.trigger(`private-komplain-${t.komplainId}`, "status-change", { status: "DIBATALKAN" }).catch(() => {});
  return ok(mapTukarToDTO(updated));
});