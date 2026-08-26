import { pushSystemChatLog } from "@/lib/chat-system-server";
// body: { noResiBalik: string, buktiKirimBalikPath: string }
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapTukarToDTO } from "@/lib/api/tukar-mapper";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  noResiBalik: z.string().min(1),
  buktiKirimBalikPath: z.string().min(1),
  kurirBalik: z.string().optional(),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const t = await prisma.tukar.findFirst({ where: { id, userId: u.id } });
  if (!t) return fail(404, "Tukar tidak ditemukan");
  if (t.status !== "MENUNGGU_PENGIRIMAN_BALIK") {
    return fail(400, "Belum bisa input resi pada status ini");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u2 = await tx.tukar.update({
      where: { id },
      data: {
        status: "DIKIRIM_BALIK",
        noResiBalik: body.noResiBalik,
        buktiKirimBalikPath: body.buktiKirimBalikPath,
        buktiKirimBalikAt: now,
        kurirBalik: body.kurirBalik || "Anteraja",
      },
    });
    const komplain = await tx.komplain.findUnique({ where: { id: t.komplainId } });
    const existingForm: Prisma.JsonObject =
      komplain?.tukarForm && typeof komplain.tukarForm === "object" && !Array.isArray(komplain.tukarForm)
        ? komplain.tukarForm
        : {};
    await tx.komplain.update({
      where: { id: t.komplainId },
      data: {
        status: "DIPROSES",
        tukarForm: {
          ...existingForm,
          noResi: body.noResiBalik,
          buktiResiUrl: body.buktiKirimBalikPath,
        },
      },
    });
    await pushSystemChatLog(t.userId, `Customer mengirim balik barang lama. No. Resi ${body.kurirBalik || t.kurirBalik}: ${body.noResiBalik}`, { kind: "komplain", refId: t.komplainId, label: "Komplain " + t.komplainId, href: "/komplain/" + t.komplainId }, tx);
    return u2;
  });
  // Notifikasi real-time ke admin via komplain channel
  await pusher.trigger(`private-komplain-${t.komplainId}`, "status-change", { status: "DIKIRIM_BALIK" }).catch(() => {});
  return ok(mapTukarToDTO(updated));
});