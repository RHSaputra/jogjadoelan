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

const schema = z.object({
  pesan: z.string().min(1),
  files: z.array(z.object({
    url: z.string(), type: z.enum(["image", "video"]), name: z.string().optional(),
  })).default([]),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const k = await prisma.komplain.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!k) return fail(404, "Komplain tidak ditemukan");

  const newMsg = await pushSystemChatLog(k.userId, body.pesan, { kind: "komplain", refId: id, label: "Komplain " + id, href: "/komplain/" + id }, prisma);

  await prisma.$transaction([
    prisma.komplain.update({ where: { id }, data: { updatedAt: new Date() } }),
    prisma.notifikasi.create({
      data: {
        userId: k.userId,
        type: "KOMPLAIN",
        title: "Pesan Baru dari Admin",
        body: body.pesan.slice(0, 120),
        link: `/komplain/${id}`,
        komplainId: id,
      },
    }),
  ]);

  const reload = await prisma.komplain.findUnique({
    where: { id },
  });

  // Trigger Pusher
  const pusherPayload = {
    id: newMsg.id,
    by: "admin",
    pesan: newMsg.pesan,
    files: body.files,
    createdAt: newMsg.createdAt.toISOString(),
  };
  await pusher.trigger(`private-komplain-${id}`, "message", pusherPayload).catch(() => {});
  
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

  return ok(mapKomplainToDTO(reload!));
});
