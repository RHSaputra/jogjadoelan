import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { runWhatsappBroadcast } from "@/lib/whatsapp";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  action: z.enum(["pause", "resume", "cancel"]),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return fail(422, "Aksi tidak valid");
  }

  const broadcast = await prisma.whatsappbroadcast.findUnique({ where: { id } });
  if (!broadcast) return fail(404, "Broadcast tidak ditemukan");

  const { action } = parsed.data;

  if (action === "pause") {
    if (!["PROCESSING", "PENDING"].includes(broadcast.status)) {
      return fail(400, "Broadcast tidak sedang berjalan");
    }
    await prisma.whatsappbroadcast.update({
      where: { id },
      data: { status: "PAUSED" },
    });
    return ok({ message: "Broadcast dijeda", status: "PAUSED" });
  }

  if (action === "resume") {
    if (broadcast.status !== "PAUSED") {
      return fail(400, "Broadcast tidak dalam status dijeda");
    }
    await prisma.whatsappbroadcast.update({
      where: { id },
      data: { status: "PROCESSING" },
    });
    runWhatsappBroadcast(id).catch((err) =>
      console.error("[BROADCAST] Resume failed:", err)
    );
    return ok({ message: "Broadcast dilanjutkan", status: "PROCESSING" });
  }

  if (action === "cancel") {
    if (["COMPLETED", "CANCELLED"].includes(broadcast.status)) {
      return fail(400, "Broadcast sudah selesai atau dibatalkan");
    }
    await prisma.whatsappbroadcast.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return ok({ message: "Broadcast dibatalkan", status: "CANCELLED" });
  }

  return fail(400, "Aksi tidak dikenal");
});
