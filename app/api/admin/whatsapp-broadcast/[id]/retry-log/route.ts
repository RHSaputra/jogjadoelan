// app/api/admin/whatsapp-broadcast/[id]/retry-log/route.ts
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { sendBroadcastToRecipient } from "@/lib/notification/broadcast-sender";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  logId: z.string().min(1),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id: broadcastId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return fail(422, "ID log tidak valid");
  }

  const { logId } = parsed.data;

  const log = await prisma.whatsappbroadcastlog.findUnique({
    where: { id: logId, broadcastId },
  });

  if (!log) {
    return fail(404, "Log penerima tidak ditemukan");
  }

  if (log.status === "SENT") {
    return fail(400, "Pesan sudah berhasil dikirim sebelumnya");
  }

  const broadcast = await prisma.whatsappbroadcast.findUnique({
    where: { id: broadcastId },
  });

  if (!broadcast) {
    return fail(404, "Broadcast tidak ditemukan");
  }

  const prevStatus = log.status;
  const result = await sendBroadcastToRecipient(
    {
      id: broadcast.id,
      channel: broadcast.channel,
      judul: broadcast.judul,
      pesan: broadcast.pesan,
      gambar: broadcast.gambar,
    },
    {
      nama: log.nama,
      noHp: log.noHp,
      email: log.email,
      userId: log.userId,
    }
  );

  const updatedLog = await prisma.whatsappbroadcastlog.update({
    where: { id: logId },
    data: {
      status: result.success ? "SENT" : "FAILED",
      error: result.success ? null : result.error || "Gagal mengirim",
      retries: log.retries + 1,
      sentAt: result.success ? new Date() : null,
    },
  });

  if (result.success && prevStatus === "FAILED") {
    await prisma.whatsappbroadcast.update({
      where: { id: broadcastId },
      data: {
        terkirim: { increment: 1 },
        gagal: { decrement: 1 },
      },
    });
  }

  return ok({ log: updatedLog });
});
