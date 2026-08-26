import { logger } from "@/lib/logger";
// POST /api/custom/[id]/cancel  → customer batalkan pesanan custom
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";
import { mapCustomOrderToDTO } from "@/lib/api/custom-mapper";
import { sendOrderEmail } from "@/lib/email/send";

const SELECT_FULL = {
  include: {
    user: { select: { id: true, username: true, email: true } },
    customprogress: { orderBy: { createdAt: "asc" as const } },
    payment: { orderBy: { createdAt: "asc" as const } },
  },
};

const Body = z.object({
  alasan: z.string().trim().max(500).optional(),
});

export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const u = await requireUser();
    const { id } = await ctx.params;
    const body = Body.safeParse(await req.json().catch(() => null));
    const alasan = body.success ? body.data.alasan : undefined;

    const c = await prisma.customorder.findUnique({ where: { id } });
    if (!c) return fail(404, "Custom order tidak ditemukan");
    if (c.userId !== u.id) return fail(403, "Akses ditolak");

    // Hanya bisa batalkan di status tertentu
    const bisaBatal = ["MENUNGGU_ESTIMASI", "MENUNGGU_PERSETUJUAN", "MENUNGGU_PEMBAYARAN"];
    if (!bisaBatal.includes(c.status)) {
      return fail(400, "Pesanan tidak bisa dibatalkan di status ini");
    }

    const catatan = alasan
      ? `${c.notes ?? ""}\n\n[DIBATALKAN PELANGGAN] ${alasan}`.trim()
      : `${c.notes ?? ""}\n\n[DIBATALKAN PELANGGAN]`.trim();

    const updated = await prisma.customorder.update({
      where: { id },
      data: {
        status: "DIBATALKAN",
        notes: catatan || null,
      },
      ...SELECT_FULL,
    });

    // Notifikasi ke admin
    await prisma.notifikasi.create({
      data: {
        userId: c.userId,
        title: "Pesanan Dibatalkan",
        body: `Pesanan custom ${id} dibatalkan oleh pelanggan.${alasan ? ` Alasan: ${alasan.slice(0, 100)}` : ""}`,
        type: "CUSTOM",
        link: `/admin/custom/${id}`,
      },
    }).catch(() => {});

    // Kirim email pembatalan pesanan ke customer (non-blocking)
    try {
      sendOrderEmail("order-cancelled", {
        recipientEmail: u.email,
        recipientName: u.username,
        orderId: id,
        reason: alasan,
      }).catch(err => {
        logger.error("Failed to send order cancelled email:", err);
      });
    } catch (err) {
      logger.error("Failed to send order cancelled email:", err);
    }

    return ok(mapCustomOrderToDTO(updated));
  },
);
