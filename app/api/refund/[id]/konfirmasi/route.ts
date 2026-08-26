import { pushSystemChatLog } from "@/lib/chat-system-server";
// Customer konfirmasi dana refund sudah diterima
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapRefundToDTO } from "@/lib/api/refund-mapper";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const r = await prisma.refund.findFirst({ where: { id, userId: u.id } });
  if (!r) return fail(404, "Refund tidak ditemukan");
  if (r.status !== "TRANSFER_DIKIRIM") {
    return fail(400, "Belum bisa konfirmasi pada status ini");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u2 = await tx.refund.update({
      where: { id },
      data: { status: "SELESAI", customerConfirmedAt: now },
    });
    await tx.komplain.update({ where: { id: r.komplainId }, data: { status: "BERHASIL" } });
    await pushSystemChatLog(r.userId, "Customer mengkonfirmasi dana refund sudah diterima. Komplain selesai.", { kind: "komplain", refId: r.komplainId, label: "Komplain " + r.komplainId, href: "/komplain/" + r.komplainId }, tx);
    return u2;
  });
  // Notifikasi real-time ke admin via komplain channel
  await pusher.trigger(`private-komplain-${r.komplainId}`, "status-change", { status: "BERHASIL" }).catch(() => {});
  return ok(mapRefundToDTO(updated));
});