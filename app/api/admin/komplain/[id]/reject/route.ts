import { pushSystemChatLog } from "@/lib/chat-system-server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapKomplainToDTO } from "@/lib/api/komplain-mapper";
import { sendKomplainEmail } from "@/lib/email/send";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ alasan: z.string().min(1) });

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const k = await prisma.komplain.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!k) return fail(404, "Komplain tidak ditemukan");

  const now = new Date().toISOString();
  await prisma.$transaction([
    await pushSystemChatLog(k.userId, `Mohon maaf, komplain Anda tidak dapat kami proses. Alasan: ${body.alasan}`, { kind: "komplain", refId: id, label: "Komplain " + id, href: "/komplain/" + id }, prisma),
    prisma.komplain.update({
      where: { id },
      data: {
        status: "DITOLAK",
        penolakan: { alasan: body.alasan, by: "admin", at: now },
      },
    }),
    prisma.notifikasi.create({
      data: {
        userId: k.userId,
        type: "KOMPLAIN",
        title: "Komplain Ditolak",
        body: `Komplain ${id} ditolak: ${body.alasan}`,
        link: `/komplain/${id}`,
        komplainId: id,
      },
    }),
  ]);

  const reload = await prisma.komplain.findUnique({
    where: { id },
  });

  // Kirim email balasan komplain (non-blocking)
  try {
    sendKomplainEmail("komplain-replied", {
      recipientEmail: k.user.email,
      recipientName: k.user.username,
      komplainId: id,
      adminName: admin.username,
    }).catch(err => {
      logger.error("Failed to send komplain replied email:", err);
    });
  } catch (err) {
    logger.error("Failed to send komplain replied email:", err);
  }

  // Notifikasi real-time ke customer agar UI langsung update tanpa refresh
  await pusher.trigger(`private-komplain-${id}`, "status-change", { status: "DITOLAK" }).catch(() => {});

  return ok(mapKomplainToDTO(reload!));
});