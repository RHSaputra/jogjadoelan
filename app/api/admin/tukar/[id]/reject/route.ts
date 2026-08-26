import { pushSystemChatLog } from "@/lib/chat-system-server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapTukarToDTO } from "@/lib/api/tukar-mapper";
import { sendOrderEmail } from "@/lib/email/send";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ alasan: z.string().min(1) });

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const t = await prisma.tukar.findUnique({ where: { id }, include: { user: true } });
  if (!t) return fail(404, "Tukar tidak ditemukan");
  if (!["MENUNGGU_REVIEW_ADMIN", "MENUNGGU_PENGIRIMAN_BALIK", "DIKIRIM_BALIK", "DITERIMA_ADMIN"].includes(t.status)) {
    return fail(400, "Tidak bisa menolak pada status ini");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.tukar.update({
      where: { id },
      data: { status: "DITOLAK", rejectReason: body.alasan },
    });
    await tx.komplain.update({
      where: { id: t.komplainId },
      data: {
        status: "DITOLAK",
        penolakan: { alasan: body.alasan, by: "admin", at: new Date().toISOString() },
      },
    });
    await pushSystemChatLog(t.userId, `Pengajuan tukar ditolak. Alasan: ${body.alasan}`, { kind: "komplain", refId: t.komplainId, label: "Komplain " + t.komplainId, href: "/komplain/" + t.komplainId }, tx);
    await tx.notifikasi.create({
      data: {
        userId: t.userId,
        type: "TUKAR",
        title: "Tukar Ditolak",
        body: body.alasan,
        link: `/tukar/${t.komplainId}/ditolak`,
        tukarId: id,
        komplainId: t.komplainId,
      },
    });
    return u;
  });

  await pusher.trigger(`private-komplain-${t.komplainId}`, "status-change", { status: "DITOLAK" }).catch(() => {});

  // Kirim email notification ke customer (non-blocking)
  sendOrderEmail("tukar-rejected", {
    recipientEmail: t.user.email,
    recipientName: t.user.username,
    orderId: t.orderId,
    komplainId: t.komplainId,
    reason: body.alasan,
  }).catch(err => console.error("[EMAIL] tukar-rejected customer email failed:", err));

  return ok(mapTukarToDTO(updated));
});