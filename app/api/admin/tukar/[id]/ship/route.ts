import { pushSystemChatLog } from "@/lib/chat-system-server";
// Admin kirim varian BARU — deduct varian baru -1 (dengan guard stok)
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapTukarToDTO } from "@/lib/api/tukar-mapper";
import { mutateProductStock } from "@/lib/server/stock-mutation";
import { sendOrderEmail } from "@/lib/email/send";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  adminNoResiKirim: z.string().min(1),
  adminKurirKirim: z.string().min(1),
  catatan: z.string().optional(),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());

  const t = await prisma.tukar.findUnique({ where: { id }, include: { user: true } });
  if (!t) return fail(404, "Tukar tidak ditemukan");
  if (t.status !== "DITERIMA_ADMIN") {
    return fail(400, "Belum bisa kirim — barang lama belum diterima");
  }

  const now = new Date();
  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Deduct varian BARU (-1) with guard
      await mutateProductStock(tx, t.productId, t.ukuranBaru, t.warnaBaru, -1, {
        guardNegative: true,
      });

      const u = await tx.tukar.update({
        where: { id },
        data: {
          status: "VARIAN_BARU_DIKIRIM",
          adminNoResiKirim: body.adminNoResiKirim,
          adminKurirKirim: body.adminKurirKirim,
          adminKirimVarianAt: now,
          ...(body.catatan ? { adminCatatan: body.catatan } : {}),
        },
      });
      await tx.komplain.update({
        where: { id: t.komplainId },
        data: { status: "DIPROSES" },
      });
      await pushSystemChatLog(t.userId, `Admin mengirim varian pengganti (ukuran ${t.ukuranBaru}${t.warnaBaru ? ` warna ${t.warnaBaru}` : ""}). Resi ${body.adminKurirKirim}: ${body.adminNoResiKirim}`, { kind: "komplain", refId: t.komplainId, label: "Komplain " + t.komplainId, href: "/komplain/" + t.komplainId }, tx);
      return u;
    });

    await pusher.trigger(`private-komplain-${t.komplainId}`, "status-change", { status: "DIPROSES" }).catch(() => {});

    // Kirim email notification ke customer (non-blocking)
    sendOrderEmail("tukar-shipped", {
      recipientEmail: t.user.email,
      recipientName: t.user.username,
      orderId: t.orderId,
      komplainId: t.komplainId,
      kurir: body.adminKurirKirim,
      resi: body.adminNoResiKirim,
    }).catch(err => console.error("[EMAIL] tukar-shipped customer email failed:", err));

    return ok(mapTukarToDTO(updated));
  } catch (e) {
    return fail(400, e instanceof Error && e.message ? e.message : "Gagal mengirim varian pengganti");
  }
});