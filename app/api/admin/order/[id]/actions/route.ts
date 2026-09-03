import { logger } from "@/lib/logger";
// app/api/admin/order/[id]/actions/route.ts
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapOrderToLegacy, STEP_TO_UPPER } from "@/lib/api/order-mapper";
/** Pure helper — inlined to avoid importing the "use client" orders-storage module. */
function deriveEstimasiTiba(shippedAtIso?: string | null): { from: string; to: string } | null {
  if (!shippedAtIso) return null;
  const base = new Date(shippedAtIso);
  if (isNaN(base.getTime())) return null;
  const f = new Date(base); f.setDate(f.getDate() + 3);
  const t = new Date(base); t.setDate(t.getDate() + 5);
  return { from: f.toISOString(), to: t.toISOString() };
}
import { mutateProductStock } from "@/lib/server/stock-mutation";
import { sendOrderEmail } from "@/lib/email/send";


type Ctx = { params: Promise<{ id: string }> };

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm-payment"), payload: z.object({ catatan: z.string().optional() }).optional() }),
  z.object({ action: z.literal("reject-payment"),  payload: z.object({ alasan: z.string().min(1) }) }),
  z.object({ action: z.literal("input-resi"),      payload: z.object({ kurir: z.string().min(1), resi: z.string().min(1) }) }),
  z.object({ action: z.literal("edit-resi"),       payload: z.object({ kurir: z.string().min(1), resi: z.string().min(1) }) }),
  z.object({ action: z.literal("mark-delivered"),  payload: z.object({}).optional() }),
  z.object({ action: z.literal("force-selesai"),   payload: z.object({}).optional() }),
  z.object({ action: z.literal("cancel"),          payload: z.object({ alasan: z.string().min(1) }) }),
  z.object({ action: z.literal("edit-catatan"),    payload: z.object({ catatan: z.string() }) }),
]);

const INCLUDE = {
  orderitem: true,
  ordertimeline: { orderBy: { at: "asc" as const } },
  payment: true,
  user: true,
};

async function pushNotif(
  userId: string,
  orderId: string,
  type: "ORDER" | "PEMBAYARAN" | "PENGIRIMAN",
  title: string,
  body: string,
  link: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const dbClient = tx ?? prisma;
  await dbClient.notifikasi.create({
    data: { userId, orderId, type, title, body, link },
  });
}

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const { action } = body;

  const o = await prisma.order.findUnique({ where: { id }, include: INCLUDE });
  if (!o) return fail(404, "Pesanan tidak ditemukan");

  const now = new Date();

  /* ── CONFIRM PAYMENT ─────────────────────────────────────── */
  if (action === "confirm-payment") {
    if (o.status !== "MENUNGGU_KONFIRMASI") return fail(400, "Status bukan menunggu konfirmasi");
    const catatan = body.payload?.catatan;

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id }, select: { status: true } });
      if (!current || current.status !== "MENUNGGU_KONFIRMASI") {
        throw new Error("Status pesanan bukan menunggu konfirmasi");
      }

      await tx.payment.updateMany({
        where: { orderId: id, status: "PENDING" },
        data: { status: "VERIFIED", verifiedAt: now, verifiedById: admin.id },
      });

      const ord = await tx.order.update({
        where: { id },
        data: {
          status: "DIPROSES",
          catatanAdmin: catatan ?? o.catatanAdmin,
          estimasiProsesHari: o.estimasiProsesHari ?? 2,
          ordertimeline: {
            create: [
              { id: crypto.randomUUID(), step: STEP_TO_UPPER["dikonfirmasi"], label: "Pembayaran Dikonfirmasi", at: now, byAdminId: admin.id },
              { id: crypto.randomUUID(), step: STEP_TO_UPPER["diproses"],     label: "Pesanan Diproses",        at: now, byAdminId: admin.id },
            ],
          },
        },
        include: INCLUDE,
      });

      await pushNotif(
        o.userId,
        id,
        "ORDER",
        "Pesanan diproses",
        `Pesanan ${id} sudah dikonfirmasi & masuk tahap diproses.`,
        `/pesanan/${id}`,
        tx,
      );

      return ord;
    });

    // Email customer: pembayaran dikonfirmasi + pesanan diproses
    sendOrderEmail("payment-verified", {
      recipientEmail: o.user.email,
      recipientName: o.user.username,
      recipientPhone: o.user.noHp,
      userId: o.userId,
      orderId: id,
    }).catch(err => logger.error("[EMAIL] payment-verified failed:", err));
    sendOrderEmail("order-diproses", {
      recipientEmail: o.user.email,
      recipientName: o.user.username,
      recipientPhone: o.user.noHp,
      userId: o.userId,
      orderId: id,
    }).catch(err => logger.error("[EMAIL] order-diproses failed:", err));

    return ok(mapOrderToLegacy(updated));
  }

  /* ── REJECT PAYMENT ──────────────────────────────────────── */
  if (action === "reject-payment") {
    if (o.status !== "MENUNGGU_KONFIRMASI") return fail(400, "Status bukan menunggu konfirmasi");
    const { alasan } = body.payload;

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id }, select: { status: true } });
      if (!current || current.status !== "MENUNGGU_KONFIRMASI") {
        throw new Error("Status pesanan bukan menunggu konfirmasi");
      }

      await tx.payment.updateMany({
        where: { orderId: id, status: "PENDING" },
        data: { status: "REJECTED", alasanTolak: alasan },
      });

      const ord = await tx.order.update({
        where: { id },
        data: {
          status: "MENUNGGU_PEMBAYARAN",
          buktiBayar: null,
          buktiBayarAt: null,
          catatanAdmin: `[BUKTI DITOLAK] ${alasan}`,
          ordertimeline: {
            create: { id: crypto.randomUUID(), step: STEP_TO_UPPER["dibuat"], label: "Bukti Pembayaran Ditolak", sub: alasan, at: now, byAdminId: admin.id },
          },
        },
        include: INCLUDE,
      });

      await pushNotif(
        o.userId,
        id,
        "PEMBAYARAN",
        "Bukti pembayaran ditolak",
        `Pesanan ${id}: ${alasan}. Silakan unggah ulang bukti transfer.`,
        `/pembayaran/${id}`,
        tx,
      );

      return ord;
    });

    // Email customer: pembayaran ditolak
    sendOrderEmail("payment-rejected", { recipientEmail: o.user.email, recipientName: o.user.username, orderId: id, reason: alasan })
      .catch(err => logger.error("[EMAIL] payment-rejected failed:", err));

    return ok(mapOrderToLegacy(updated));
  }

  /* ── INPUT RESI ──────────────────────────────────────────── */
  if (action === "input-resi") {
    if (o.status !== "DIPROSES") return fail(400, "Status bukan diproses");
    const { kurir, resi } = body.payload;

    const ekspedisi = { kurir, resi, shippedAt: now.toISOString() };
    const estimasiTiba = deriveEstimasiTiba(now.toISOString());

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "DIKIRIM",
        resi,
        ekspedisi,
        estimasiTiba: estimasiTiba ?? Prisma.JsonNull,
        ordertimeline: {
          create: { id: crypto.randomUUID(), step: STEP_TO_UPPER["dikirim"], label: "Pesanan Dikirim", at: now, byAdminId: admin.id },
        },
      },
      include: INCLUDE,
    });

    await pushNotif(o.userId, id, "PENGIRIMAN",
      "Pesanan dikirim",
      `Pesanan ${id} dikirim via ${kurir} — resi: ${resi}`,
      `/pesanan/${id}`
    );

    // Email customer: pesanan dikirim + info resi
    sendOrderEmail("order-shipped", {
      recipientEmail: o.user.email,
      recipientName: o.user.username,
      recipientPhone: o.user.noHp,
      userId: o.userId,
      orderId: id,
      kurir,
      resi,
    }).catch(err => logger.error("[EMAIL] order-shipped failed:", err));

    return ok(mapOrderToLegacy(updated));
  }

  /* ── EDIT RESI ───────────────────────────────────────────── */
  if (action === "edit-resi") {
    if (o.status !== "DIKIRIM") return fail(400, "Status bukan dikirim");
    const { kurir, resi } = body.payload;
    const eksOld = (o.ekspedisi as Record<string, unknown>) ?? {};
    const updated = await prisma.order.update({
      where: { id },
      data: { resi, ekspedisi: { ...eksOld, kurir, resi } },
      include: INCLUDE,
    });
    
    // Email customer: resi diperbarui
    sendOrderEmail("resi-added", { recipientEmail: o.user.email, recipientName: o.user.username, orderId: id, kurir, resi })
      .catch(err => logger.error("[EMAIL] resi-added failed:", err));

    return ok(mapOrderToLegacy(updated));
  }

  /* ── MARK DELIVERED ──────────────────────────────────────── */
  if (action === "mark-delivered") {
    if (o.status !== "DIKIRIM") return fail(400, "Status bukan dikirim");
    if (o.deliveredAt) return fail(400, "Sudah ditandai sampai sebelumnya");
    const updated = await prisma.order.update({
      where: { id },
      data: {
        deliveredAt: now,
        ordertimeline: {
          create: { id: crypto.randomUUID(), step: STEP_TO_UPPER["sampai"], label: "Paket Sampai di Tujuan", at: now, byAdminId: admin.id },
        },
      },
      include: INCLUDE,
    });
    await pushNotif(o.userId, id, "PENGIRIMAN",
      "Paket sampai",
      `Pesanan ${id} sudah sampai. Mohon konfirmasi penerimaan.`,
      `/pesanan/${id}`
    );

    // Email customer: paket sampai
    sendOrderEmail("order-completed", { recipientEmail: o.user.email, recipientName: o.user.username, orderId: id })
      .catch(err => logger.error("[EMAIL] mark-delivered email failed:", err));

    return ok(mapOrderToLegacy(updated));
  }

  /* ── FORCE SELESAI ───────────────────────────────────────── */
  if (action === "force-selesai") {
    if (o.status !== "DIKIRIM") return fail(400, "Status bukan dikirim");
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "SELESAI",
        konfirmasiDiterimaAt: now,
        deliveredAt: o.deliveredAt ?? now,
        ordertimeline: {
          create: { id: crypto.randomUUID(), step: STEP_TO_UPPER["selesai"], label: "Selesai (Diselesaikan Admin)", at: now, byAdminId: admin.id },
        },
      },
      include: INCLUDE,
    });
    await pushNotif(o.userId, id, "ORDER",
      "Pesanan diselesaikan admin",
      `Pesanan ${id} ditandai selesai oleh admin. Garansi 3×24 jam aktif.`,
      `/pesanan/${id}`
    );
    
    sendOrderEmail("order-completed", {
      recipientEmail: o.user.email,
      recipientName: o.user.username,
      recipientPhone: o.user.noHp,
      userId: o.userId,
      orderId: id,
    }).catch(err => {
      logger.error("Failed to send order completed email:", err);
    });

    return ok(mapOrderToLegacy(updated));
  }

  /* ── CANCEL ──────────────────────────────────────────────── */
  if (action === "cancel") {
    const blocked = ["DIKIRIM", "SELESAI", "DIBATALKAN", "KADALUARSA"];
    if (blocked.includes(o.status)) return fail(400, "Pesanan tidak bisa dibatalkan di status ini");
    const { alasan } = body.payload;

    // Restore stok + update status dalam transaksi
    const updated = await prisma.$transaction(async (tx) => {
      // Restore stok (handle varian via mutateProductStock)
      for (const it of o.orderitem) {
        if (it.produkId) {
          await mutateProductStock(tx, it.produkId, it.ukuran, null, it.qty);
        }
      }
      // Reverse voucher usage jika ada
      if (o.voucherCode) {
        await tx.voucher.update({
          where: { kode: o.voucherCode },
          data: { terpakai: { decrement: 1 } },
        }).catch(() => {});
        await tx.voucherusage.deleteMany({ where: { orderId: id } }).catch(() => {});
      }
      return tx.order.update({
        where: { id },
        data: {
          status: "DIBATALKAN",
          catatanAdmin: `[DIBATALKAN ADMIN] ${alasan}`,
          ordertimeline: {
            create: { id: crypto.randomUUID(), step: STEP_TO_UPPER["dibatalkan"], label: "Pesanan Dibatalkan Admin", sub: alasan, at: now, byAdminId: admin.id },
          },
        },
        include: INCLUDE,
      });
    });

    await pushNotif(o.userId, id, "ORDER",
      "Pesanan dibatalkan admin",
      `Pesanan ${id} dibatalkan: ${alasan}.`,
      `/pesanan/${id}`
    );

    // Email customer: pesanan dibatalkan
    sendOrderEmail("order-cancelled", { recipientEmail: o.user.email, recipientName: o.user.username, orderId: id, reason: alasan })
      .catch(err => logger.error("[EMAIL] order-cancelled failed:", err));

    return ok(mapOrderToLegacy(updated));
  }

  /* ── EDIT CATATAN ────────────────────────────────────────── */
  if (action === "edit-catatan") {
    const blocked = ["SELESAI", "DIBATALKAN", "KADALUARSA"];
    if (blocked.includes(o.status)) return fail(400, "Tidak bisa edit catatan di status ini");
    const updated = await prisma.order.update({
      where: { id },
      data: { catatanAdmin: body.payload.catatan || null },
      include: INCLUDE,
    });
    return ok(mapOrderToLegacy(updated));
  }

  return fail(400, "Aksi tidak dikenal");
});

/* ── GET — ambil satu order untuk admin ──────────────────── */
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const o = await prisma.order.findUnique({ where: { id }, include: INCLUDE });
  if (!o) return fail(404, "Pesanan tidak ditemukan");
  return ok(mapOrderToLegacy(o));
});
