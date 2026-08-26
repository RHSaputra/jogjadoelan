import { pushSystemChatLog } from "@/lib/chat-system-server";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapRefundToDTO } from "@/lib/api/refund-mapper";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const r = await prisma.refund.findUnique({ where: { id } });
  if (!r) return fail(404, "Refund tidak ditemukan");
  if (r.status !== "DIKIRIM_BALIK") return fail(400, "Status tidak valid (harus DIKIRIM_BALIK)");

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.refund.update({
      where: { id },
      data: { status: "DITERIMA_ADMIN", adminReceivedAt: now },
    });
    await tx.komplain.update({ where: { id: r.komplainId }, data: { status: "DIPROSES" } });
    await pushSystemChatLog(r.userId, "Barang balikan sudah kami terima dan sedang diverifikasi sebelum transfer refund.", { kind: "komplain", refId: r.komplainId, label: "Komplain " + r.komplainId, href: "/komplain/" + r.komplainId }, tx);
    await tx.notifikasi.create({
      data: {
        userId: r.userId,
        type: "REFUND",
        title: "Barang Balik Diterima",
        body: `Barang balikan untuk refund ${id} telah kami terima.`,
        link: `/refund/${r.komplainId}`,
        refundId: id,
        komplainId: r.komplainId,
      },
    });
    return u;
  });

  // Notifikasi real-time ke customer via komplain channel
  await pusher.trigger(`private-komplain-${r.komplainId}`, "status-change", { status: "DIPROSES" }).catch(() => {});
  return ok(mapRefundToDTO(updated));
});