import { pushSystemChatLog } from "@/lib/chat-system-server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapRefundToDTO } from "@/lib/api/refund-mapper";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ alasan: z.string().optional() });

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));
  const r = await prisma.refund.findFirst({ where: { id, userId: u.id } });
  if (!r) return fail(404, "Refund tidak ditemukan");
  if (!["MENUNGGU_REVIEW_ADMIN"].includes(r.status)) {
    return fail(400, "Refund tidak bisa dibatalkan pada status ini");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u2 = await tx.refund.update({
      where: { id },
      data: {
        status: "DIBATALKAN",
        cancelledAt: now,
        cancelReason: body.alasan ?? null,
      },
    });
    await tx.komplain.update({ where: { id: r.komplainId }, data: { status: "DIBATALKAN" } });
    await pushSystemChatLog(r.userId, `Refund dibatalkan oleh pembeli${body.alasan ? `. Alasan: ${body.alasan}` : "."}`, { kind: "komplain", refId: r.komplainId, label: "Komplain " + r.komplainId, href: "/komplain/" + r.komplainId }, tx);
    return u2;
  });
  // Notifikasi real-time ke admin via komplain channel
  await pusher.trigger(`private-komplain-${r.komplainId}`, "status-change", { status: "DIBATALKAN" }).catch(() => {});
  return ok(mapRefundToDTO(updated));
});