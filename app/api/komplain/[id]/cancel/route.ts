// POST /api/komplain/[id]/cancel  body: { alasan?: string }
import { z } from "zod";
import { pushSystemChatLog } from "@/lib/chat-system-server";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapKomplainToDTO } from "@/lib/api/komplain-mapper";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ alasan: z.string().optional() });

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));

  const k = await prisma.komplain.findFirst({ where: { id, userId: u.id } });
  if (!k) return fail(404, "Komplain tidak ditemukan");

  const pesan = body.alasan
    ? `Pengajuan dibatalkan oleh pembeli. Alasan: ${body.alasan}`
    : `Pengajuan dibatalkan oleh pembeli.`;

  await prisma.$transaction([
    await pushSystemChatLog(k.userId, pesan, { kind: "komplain", refId: id, label: "Komplain " + id, href: "/komplain/" + id }, prisma),
    prisma.komplain.update({
      where: { id },
      data: { status: "DIBATALKAN" },
    }),
  ]);

  const reload = await prisma.komplain.findUnique({
    where: { id },
  });
  // Notifikasi real-time ke admin
  await pusher.trigger(`private-komplain-${id}`, "status-change", { status: "DIBATALKAN" }).catch(() => {});
  return ok(mapKomplainToDTO(reload!));
});