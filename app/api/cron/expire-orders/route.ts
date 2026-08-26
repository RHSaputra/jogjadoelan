import { logger } from "@/lib/logger";
// GET /api/cron/expire-orders
// Server-side cron endpoint untuk auto-expire order yang melewati batas pembayaran.
// Dipanggil oleh Vercel Cron, external cron service, atau manual via curl.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mutateProductStock } from "@/lib/server/stock-mutation";
import { sendOrderEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Verifikasi cron secret untuk keamanan
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Cari semua order yang sudah lewat batas expiry
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: "MENUNGGU_PEMBAYARAN",
      expiredAt: { lte: now },
    },
    include: { orderitem: true },
  });

  let expiredCount = 0;
  let failedCount = 0;
  const expiredIds: string[] = [];

  for (const order of expiredOrders) {
    try {
      // Gunakan optimistic locking: cek ulang status di dalam transaksi
      const processed = await prisma.$transaction(async (tx) => {
        // Re-check status order — prevents double-processing race condition
        const current = await tx.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });

        // Jika status sudah berubah (sudah diproses oleh cron lain), skip
        if (!current || current.status !== "MENUNGGU_PEMBAYARAN") {
          logger.warn(`[cron/expire-orders] Order ${order.id} already processed (status: ${current?.status ?? "not found"}), skipping.`);
          return false;
        }

        // 1. Restore stok (handle varian via mutateProductStock)
        for (const it of order.orderitem) {
          if (it.produkId) {
            await mutateProductStock(tx, it.produkId, it.ukuran, null, it.qty);
          }
        }

        // 2. Reverse voucher usage jika ada — dengan validasi
        if (order.voucherCode) {
          const voc = await tx.voucher.findUnique({ where: { kode: order.voucherCode }, select: { id: true } });
          if (voc) {
            await tx.voucher.update({
              where: { kode: order.voucherCode },
              data: { terpakai: { decrement: 1 } },
            });
          } else {
            logger.warn(`[cron/expire-orders] Voucher ${order.voucherCode} not found for order ${order.id}, skipping reversal`);
          }
          await tx.voucherusage.deleteMany({ where: { orderId: order.id } }).catch(() => {});
        }

        // 3. Update status ke KADALUARSA
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "KADALUARSA",
            ordertimeline: {
              create: {
                id: crypto.randomUUID(),
                step: "KADALUARSA",
                label: "Pesanan Kadaluarsa",
                sub: "Batas waktu pembayaran terlampaui (auto-expire by cron)",
                at: now,
              },
            },
          },
        });

        // 4. Buat notifikasi untuk customer
        await tx.notifikasi.create({
          data: {
            id: crypto.randomUUID(),
            userId: order.userId,
            orderId: order.id,
            type: "ORDER",
            title: "Pesanan kadaluarsa",
            body: `Pesanan ${order.id} otomatis dibatalkan karena melewati batas waktu pembayaran 1×24 jam.`,
            link: `/pesanan/${order.id}`,
          },
        });

        return true;
      });

      if (!processed) continue; // Skip order yang sudah diproses oleh concurrent run

      // Kirim email notifikasi ke customer (non-blocking)
      prisma.user.findUnique({ where: { id: order.userId }, select: { email: true, username: true } })
        .then((user) => {
          if (user?.email) {
            sendOrderEmail("order-expired", { recipientEmail: user.email, recipientName: user.username, orderId: order.id });
          }
        }).catch(err => logger.error("[EMAIL] cron order-expired notification failed:", err));

      expiredIds.push(order.id);
      expiredCount++;
    } catch (e) {
      logger.error(`[cron/expire-orders] Gagal expire order ${order.id}:`, e);
      failedCount++;
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    expiredCount,
    failedCount,
    totalChecked: expiredOrders.length,
    expiredIds,
  });
}