import { pushSystemChatLog } from "@/lib/chat-system-server";
// POST /api/komplain/[id]/chat
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapKomplainToDTO } from "@/lib/api/komplain-mapper";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  pesan: z.string().min(1),
  files: z.array(z.object({
    url: z.string(),
    type: z.enum(["image", "video"]),
    name: z.string().optional(),
  })).default([]),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());

  const k = await prisma.komplain.findFirst({ where: { id, userId: u.id } });
  if (!k) return fail(404, "Komplain tidak ditemukan");

  const newMsg = await pushSystemChatLog(k.userId, body.pesan, { kind: "komplain", refId: id, label: "Komplain " + id, href: "/komplain/" + id }, prisma);

  // Jika status masih BARU, naik ke DITINJAU
  await prisma.komplain.update({
    where: { id },
    data: {
      status: k.status === "BARU" ? "DITINJAU" : k.status,
      updatedAt: new Date(),
    },
  });

  const reload = await prisma.komplain.findUnique({
    where: { id },
  });

  // Trigger Pusher
  const pusherPayload = {
    id: newMsg.id,
    by: "user",
    pesan: newMsg.pesan,
    files: body.files,
    createdAt: newMsg.createdAt.toISOString(),
  };
  await pusher.trigger(`private-komplain-${id}`, "message", pusherPayload).catch(() => {});

  return ok(mapKomplainToDTO(reload!));
});