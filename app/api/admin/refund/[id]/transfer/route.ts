import { pushSystemChatLog } from "@/lib/chat-system-server";
// body: { adminTransferProofPath: string }
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapRefundToDTO } from "@/lib/api/refund-mapper";
import { sendOrderEmail } from "@/lib/email/send";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ adminTransferProofPath: z.string().min(1) });

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const r = await prisma.refund.findUnique({ where: { id } });
  if (!r) return fail(404, "Refund tidak ditemukan");
  if (r.status !== "DITERIMA_ADMIN") return fail(400, "Belum bisa transfer pada status ini");
  if (!r.nominalRefund) return fail(400, "Nominal refund belum ditentukan");

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.refund.update({
      where: { id },
      data: {
        status: "TRANSFER_DIKIRIM",
        adminTransferProofPath: body.adminTransferProofPath,
        adminTransferredAt: now,
      },
    });
    await tx.komplain.update({
      where: { id: r.komplainId },
      data: {
        status: "BERHASIL",
        refundResult: {
          nominalRefund: r.nominalRefund,
          catatanAdmin: r.catatanAdmin ?? "",
          adminTransferProofPath: body.adminTransferProofPath,
          adminTransferredAt: now.toISOString(),
          // UI expected keys:
          nominal: r.nominalRefund,
          alasanRefund: r.catatanAdmin ?? "",
          buktiTransferUrl: body.adminTransferProofPath,
          transferredAt: now.toISOString(),
        },
      },
    });
    await pushSystemChatLog(r.userId, `Refund Rp${r.nominalRefund.toLocaleString("id-ID")} sudah ditransfer. Cek bukti terlampir.`, { kind: "komplain", refId: r.komplainId, label: "Komplain " + r.komplainId, href: "/komplain/" + r.komplainId }, tx);
    await tx.notifikasi.create({
      data: {
        userId: r.userId,
        type: "REFUND",
        title: "Refund Berhasil Ditransfer",
        body: `Dana Rp${r.nominalRefund.toLocaleString("id-ID")} sudah dikirim ke rekening Anda.`,
        link: `/refund/${r.komplainId}`,
        refundId: id,
        komplainId: r.komplainId,
      },
    });
    return u;
  });

  await pusher.trigger(`private-komplain-${r.komplainId}`, "status-change", { status: "BERHASIL" }).catch(() => {});

  // Kirim email refund completed ke customer (non-blocking)
  prisma.user.findUnique({ where: { id: r.userId }, select: { email: true, username: true } })
    .then((user) => {
      if (user?.email && r.nominalRefund) {
        sendOrderEmail("refund-completed", {
          recipientEmail: user.email,
          recipientName: user.username,
          orderId: r.orderId!,
          nominal: r.nominalRefund,
        }).catch(err => console.error("[EMAIL] refund-completed customer email failed:", err));
      }
    }).catch(err => console.error("[EMAIL] refund-completed user query failed:", err));

  return ok(mapRefundToDTO(updated));
});