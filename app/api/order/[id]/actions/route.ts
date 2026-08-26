// POST /api/order/[id]/actions  — body { action, payload? }
// Aksi customer: cancel | konfirmasi-diterima | delete

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapOrderToLegacy } from "@/lib/api/order-mapper";
import { mutateProductStock } from "@/lib/server/stock-mutation";
import { sendOrderEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.enum(["cancel", "konfirmasi-diterima", "delete", "expire"]),
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const me = await requireCustomer();
  const { id } = await ctx.params;
  const { action } = schema.parse(await req.json());

  const o = await prisma.order.findUnique({ where: { id }, include: { orderitem: true } });
  if (!o || o.userId !== me.id) return fail(404, "Pesanan tidak ditemukan");

  const now = new Date();

  if (action === "cancel") {
    if (o.status !== "MENUNGGU_PEMBAYARAN") return fail(400, "Pesanan tidak bisa dibatalkan");
    // restore stock + update status dalam transaksi
    const updated = await prisma.$transaction(async (tx) => {
      for (const it of o.orderitem) {
        if (it.produkId) {
          await mutateProductStock(tx, it.produkId, it.ukuran, null, it.qty);
        }
      }
      // Reverse voucher usage jika ada — dengan validasi
      if (o.voucherCode) {
        const voc = await tx.voucher.findUnique({ where: { kode: o.voucherCode }, select: { id: true } });
        if (voc) {
          await tx.voucher.update({
            where: { kode: o.voucherCode },
            data: { terpakai: { decrement: 1 } },
          });
        } else {
          logger.warn(`[cancel-order] Voucher ${o.voucherCode} not found for order ${id}, skipping reversal`);
        }
        await tx.voucherusage.deleteMany({ where: { orderId: id } }).catch(() => {});
      }
      return tx.order.update({
        where: { id },
        data: {
          status: "DIBATALKAN",
          ordertimeline: { create: { id: crypto.randomUUID(), step: "DIBATALKAN", label: "Pesanan Dibatalkan", sub: "Dibatalkan oleh pembeli", at: now } },
        },
        include: { orderitem: true, ordertimeline: { orderBy: { at: "asc" } }, payment: true },
      });
    });
    const mapped = mapOrderToLegacy({
      ...updated,
      items: updated.orderitem,
      timeline: updated.ordertimeline,
      payments: updated.payment,
    });
    // Email (non-blocking)
    sendOrderEmail("order-cancelled", { recipientEmail: me.email, recipientName: me.username, orderId: id }).catch(err => logger.error("[EMAIL] order-cancelled failed:", err));
    return ok(mapped);
  }

  if (action === "konfirmasi-diterima") {
    if (o.status !== "DIKIRIM") return fail(400, "Pesanan belum dikirim");
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "SELESAI",
        konfirmasiDiterimaAt: now,
        ordertimeline: { create: { id: crypto.randomUUID(), step: "SELESAI", label: "Customer Konfirmasi Diterima", at: now } },
      },
      include: { orderitem: true, ordertimeline: { orderBy: { at: "asc" } }, payment: true },
    });
    const mapped = mapOrderToLegacy({
      ...updated,
      items: updated.orderitem,
      timeline: updated.ordertimeline,
      payments: updated.payment,
    });
    // Email (non-blocking)
    sendOrderEmail("order-completed", { recipientEmail: me.email, recipientName: me.username, orderId: id }).catch(err => logger.error("[EMAIL] order-completed failed:", err));
    return ok(mapped);
  }

  if (action === "delete") {
    // Cek komplain aktif
    const komplainAktif = await prisma.komplain.findFirst({
      where: { orderId: id, status: { notIn: ["BERHASIL", "DITOLAK", "DIBATALKAN"] } },
    });
    if (komplainAktif) return fail(400, "Masih ada komplain aktif pada pesanan ini");
    await prisma.order.delete({ where: { id } });
    return ok({ deleted: true });
  }

  if (action === "expire") {
    if (o.status !== "MENUNGGU_PEMBAYARAN") return fail(400, "Pesanan tidak bisa di-expire");
    const updated = await prisma.$transaction(async (tx) => {
      for (const it of o.orderitem) {
        if (it.produkId) {
          await mutateProductStock(tx, it.produkId, it.ukuran, null, it.qty);
        }
      }
      // Reverse voucher usage jika ada — dengan validasi
      if (o.voucherCode) {
        const voc = await tx.voucher.findUnique({ where: { kode: o.voucherCode }, select: { id: true } });
        if (voc) {
          await tx.voucher.update({
            where: { kode: o.voucherCode },
            data: { terpakai: { decrement: 1 } },
          });
        } else {
          logger.warn(`[expire-order] Voucher ${o.voucherCode} not found for order ${id}, skipping reversal`);
        }
        await tx.voucherusage.deleteMany({ where: { orderId: id } }).catch(() => {});
      }
      return tx.order.update({
        where: { id },
        data: {
          status: "KADALUARSA",
          ordertimeline: {
            create: {
              id: crypto.randomUUID(),
              step: "KADALUARSA",
              label: "Pesanan Kadaluarsa",
              sub: "Batas waktu pembayaran terlampaui",
              at: now,
            },
          },
        },
        include: { orderitem: true, ordertimeline: { orderBy: { at: "asc" } }, payment: true },
      });
    });
    const mapped = mapOrderToLegacy({
      ...updated,
      items: updated.orderitem,
      timeline: updated.ordertimeline,
      payments: updated.payment,
    });
    // Email (non-blocking)
    sendOrderEmail("order-expired", { recipientEmail: me.email, recipientName: me.username, orderId: id }).catch(err => logger.error("[EMAIL] order-expired failed:", err));
    return ok(mapped);
  }

  return fail(400, "Aksi tidak dikenal");
});