import { pushSystemChatLog } from "@/lib/chat-system-server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapRefundToDTO } from "@/lib/api/refund-mapper";
import { sendOrderEmail } from "@/lib/email/send";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ alasan: z.string().min(1) });

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const r = await prisma.refund.findUnique({ where: { id }, include: { user: true } });
  if (!r) return fail(404, "Refund tidak ditemukan");
  if (!["MENUNGGU_REVIEW_ADMIN", "MENUNGGU_PENGIRIMAN_BALIK", "DIKIRIM_BALIK", "DITERIMA_ADMIN"].includes(r.status)) {
    return fail(400, "Tidak bisa menolak pada status ini");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.refund.update({
      where: { id },
      data: { status: "DITOLAK", rejectReason: body.alasan },
    });
    await tx.komplain.update({
      where: { id: r.komplainId },
      data: {
        status: "DITOLAK",
        penolakan: { alasan: body.alasan, by: "admin", at: new Date().toISOString() },
      },
    });
    await pushSystemChatLog(r.userId, `Refund ditolak. Alasan: ${body.alasan}`, { kind: "komplain", refId: r.komplainId, label: "Komplain " + r.komplainId, href: "/komplain/" + r.komplainId }, tx);
    await tx.notifikasi.create({
      data: {
        userId: r.userId,
        type: "REFUND",
        title: "Refund Ditolak",
        body: body.alasan,
        link: `/refund/${r.komplainId}/ditolak`,
        refundId: id,
        komplainId: r.komplainId,
      },
    });
    return u;
  });

  await pusher.trigger(`private-komplain-${r.komplainId}`, "status-change", { status: "DITOLAK" }).catch(() => {});

  // Kirim email notification ke customer (non-blocking)
  sendOrderEmail("order-cancelled", {
    recipientEmail: r.user.email,
    recipientName: r.user.username,
    orderId: r.orderId,
    reason: `Refund ditolak: ${body.alasan}`,
  }).catch(err => console.error("[EMAIL] refund-rejected customer email failed:", err));

  return ok(mapRefundToDTO(updated));
});