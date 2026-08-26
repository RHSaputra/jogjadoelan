import { pushSystemChatLog } from "@/lib/chat-system-server";
// Customer input nomor resi & bukti pengiriman balik
// body: { noResi: string, buktiKirimPath: string }
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapRefundToDTO } from "@/lib/api/refund-mapper";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  noResi: z.string().min(1),
  buktiKirimPath: z.string().min(1),
  kurir: z.string().optional(),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const r = await prisma.refund.findFirst({ where: { id, userId: u.id } });
  if (!r) return fail(404, "Refund tidak ditemukan");
  if (r.status !== "MENUNGGU_PENGIRIMAN_BALIK") {
    return fail(400, "Belum bisa input resi pada status ini");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u2 = await tx.refund.update({
      where: { id },
      data: {
        status: "DIKIRIM_BALIK",
        noResi: body.noResi,
        buktiKirimPath: body.buktiKirimPath,
        buktiKirimAt: now,
        kurir: body.kurir || "Anteraja",
      },
    });
    const komplain = await tx.komplain.findUnique({ where: { id: r.komplainId } });
    const existingForm: Prisma.JsonObject =
      komplain?.refundForm && typeof komplain.refundForm === "object" && !Array.isArray(komplain.refundForm)
        ? komplain.refundForm
        : {};
    await tx.komplain.update({
      where: { id: r.komplainId },
      data: {
        status: "DIPROSES",
        refundForm: {
          ...existingForm,
          noResi: body.noResi,
          buktiResiUrl: body.buktiKirimPath,
        },
      },
    });
    await pushSystemChatLog(r.userId, `Customer mengirim balik barang. No. Resi ${body.kurir || r.kurir}: ${body.noResi}`, { kind: "komplain", refId: r.komplainId, label: "Komplain " + r.komplainId, href: "/komplain/" + r.komplainId }, tx);
    return u2;
  });
  // Notifikasi real-time ke admin via komplain channel
  await pusher.trigger(`private-komplain-${r.komplainId}`, "status-change", { status: "DIKIRIM_BALIK" }).catch(() => {});
  return ok(mapRefundToDTO(updated));
});