import { pushSystemChatLog } from "@/lib/chat-system-server";
// body: { catatan?: string }
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapTukarToDTO } from "@/lib/api/tukar-mapper";
import { sendOrderEmail } from "@/lib/email/send";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ catatan: z.string().optional() });

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json().catch(() => ({})));
  const t = await prisma.tukar.findUnique({ where: { id }, include: { user: true } });
  if (!t) return fail(404, "Tukar tidak ditemukan");
  if (t.status !== "MENUNGGU_REVIEW_ADMIN") return fail(400, "Status tukar tidak valid");

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.tukar.update({
      where: { id },
      data: {
        status: "MENUNGGU_PENGIRIMAN_BALIK",
        adminApprovedAt: now,
        adminCatatan: body.catatan ?? null,
      },
    });
    await tx.komplain.update({ where: { id: t.komplainId }, data: { status: "MENUNGGU_BALIKAN" } });
    await pushSystemChatLog(t.userId, `Pengajuan tukar disetujui. Silakan kirim barang lama dan input nomor resi pada halaman tukar.${body.catatan ? ` Catatan: ${body.catatan}` : ""}`, { kind: "komplain", refId: t.komplainId, label: "Komplain " + t.komplainId, href: "/komplain/" + t.komplainId }, tx);
    await tx.notifikasi.create({
      data: {
        userId: t.userId,
        type: "TUKAR",
        title: "Tukar Disetujui",
        body: "Pengajuan tukar Anda disetujui. Silakan kirim barang lama.",
        link: `/tukar/${t.komplainId}`,
        tukarId: id,
        komplainId: t.komplainId,
      },
    });
    return u;
  });

  await pusher.trigger(`private-komplain-${t.komplainId}`, "status-change", { status: "MENUNGGU_BALIKAN" }).catch(() => {});

  // Kirim email notification ke customer (non-blocking)
  sendOrderEmail("tukar-approved", {
    recipientEmail: t.user.email,
    recipientName: t.user.username,
    orderId: t.orderId,
    komplainId: t.komplainId,
    kurir: t.kurirBalik,
  }).catch(err => console.error("[EMAIL] tukar-approved customer email failed:", err));

  return ok(mapTukarToDTO(updated));
});