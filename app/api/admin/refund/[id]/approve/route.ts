import { pushSystemChatLog } from "@/lib/chat-system-server";
// body: { nominalRefund: number, catatanAdmin?: string }
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapRefundToDTO } from "@/lib/api/refund-mapper";
import { sendOrderEmail } from "@/lib/email/send";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  nominalRefund: z.number().int().positive(),
  catatanAdmin: z.string().optional(),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const r = await prisma.refund.findUnique({ where: { id }, include: { user: true } });
  if (!r) return fail(404, "Refund tidak ditemukan");
  if (r.status !== "MENUNGGU_REVIEW_ADMIN") return fail(400, "Status refund tidak valid");

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.refund.update({
      where: { id },
      data: {
        status: "MENUNGGU_PENGIRIMAN_BALIK",
        nominalRefund: body.nominalRefund,
        catatanAdmin: body.catatanAdmin ?? null,
        adminApprovedAt: now,
      },
    });
    await tx.komplain.update({ where: { id: r.komplainId }, data: { status: "MENUNGGU_BALIKAN" } });
    await pushSystemChatLog(r.userId, `Refund disetujui. Nominal: Rp${body.nominalRefund.toLocaleString("id-ID")}. Silakan kirim barang balik dan input nomor resi pada halaman refund.`, { kind: "komplain", refId: r.komplainId, label: "Komplain " + r.komplainId, href: "/komplain/" + r.komplainId }, tx);
    await tx.notifikasi.create({
      data: {
        userId: r.userId,
        type: "REFUND",
        title: "Refund Disetujui",
        body: `Refund ${id} disetujui senilai Rp${body.nominalRefund.toLocaleString("id-ID")}.`,
        link: `/refund/${r.komplainId}`,
        refundId: id,
        komplainId: r.komplainId,
      },
    });
    return u;
  });

  await pusher.trigger(`private-komplain-${r.komplainId}`, "status-change", { status: "MENUNGGU_BALIKAN" }).catch(() => {});

  // Kirim email notification ke customer (non-blocking)
  sendOrderEmail("order-refunded", {
    recipientEmail: r.user.email,
    recipientName: r.user.username,
    orderId: r.orderId,
  }).catch(err => console.error("[EMAIL] refund-approved order-refunded customer email failed:", err));

  return ok(mapRefundToDTO(updated));
});