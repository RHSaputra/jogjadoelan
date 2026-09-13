import { logger } from "@/lib/logger";
// GET /api/cron/auto-selesai
// Server-side cron endpoint untuk auto-selesai order yang dikirim > 72 jam tanpa komplain aktif.
// Dipanggil oleh Vercel Cron, external cron service, atau manual via curl.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOrderEmail } from "@/lib/email/send";
import type { komplain_status } from "@prisma/client";

export const dynamic = "force-dynamic";

const AUTO_SELESAI_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 72 jam (3 hari)

const KOMPLAIN_AKTIF_STATUSES: komplain_status[] = [
  "BARU",
  "DITINJAU",
  "DISETUJUI",
  "MENUNGGU_REVIEW_ADMIN",
  "MENUNGGU_BALIKAN",
  "DIPROSES",
];

export async function GET(req: Request) {
  // Verifikasi cron secret untuk keamanan
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Cari semua order yang berstatus DIKIRIM
  const dikirimOrders = await prisma.order.findMany({
    where: {
      status: "DIKIRIM",
    },
    include: {
      ordertimeline: { where: { step: "DIKIRIM" }, orderBy: { at: "desc" }, take: 1 },
      komplain: { where: { status: { in: KOMPLAIN_AKTIF_STATUSES } }, select: { id: true } },
    },
  });

  let completedCount = 0;
  let failedCount = 0;
  const completedIds: string[] = [];

  for (const order of dikirimOrders) {
    try {
      // 1. Cek komplain aktif — jika ada komplain aktif, skip
      if (order.komplain.length > 0) {
        continue;
      }

      // 2. Tentukan waktu pengiriman (deliveredAt -> ekspedisi.shippedAt -> ordertimeline step DIKIRIM)
      let shippedAt: Date | null = order.deliveredAt ?? null;
      if (!shippedAt && order.ekspedisi && typeof order.ekspedisi === "object" && "shippedAt" in order.ekspedisi) {
        const sa = (order.ekspedisi as { shippedAt?: string }).shippedAt;
        if (sa) shippedAt = new Date(sa);
      }
      if (!shippedAt && order.ordertimeline[0]?.at) {
        shippedAt = order.ordertimeline[0].at;
      }

      if (!shippedAt || isNaN(shippedAt.getTime())) {
        continue;
      }

      // Cek apakah sudah lewat 72 jam
      if (now.getTime() - shippedAt.getTime() < AUTO_SELESAI_WINDOW_MS) {
        continue;
      }

      // 3. Gunakan optimistic locking & $transaction untuk auto-selesai
      const processed = await prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });

        if (!current || current.status !== "DIKIRIM") {
          logger.warn(`[cron/auto-selesai] Order ${order.id} status already changed (${current?.status ?? "not found"}), skipping.`);
          return false;
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "SELESAI",
            konfirmasiDiterimaAt: now,
            ordertimeline: {
              create: {
                id: crypto.randomUUID(),
                step: "SELESAI",
                label: "Pesanan Otomatis Selesai",
                sub: "Diselesaikan otomatis oleh sistem (72 jam setelah dikirim)",
                at: now,
              },
            },
          },
        });

        await tx.notifikasi.create({
          data: {
            id: crypto.randomUUID(),
            userId: order.userId,
            orderId: order.id,
            type: "ORDER",
            title: "Pesanan selesai otomatis",
            body: `Pesanan ${order.id} telah otomatis diselesaikan oleh sistem 72 jam setelah dikirim.`,
            link: `/pesanan/${order.id}`,
          },
        });

        return true;
      });

      if (!processed) continue;

      // Kirim email notifikasi ke customer (non-blocking)
      prisma.user.findUnique({ where: { id: order.userId }, select: { email: true, username: true } })
        .then((user) => {
          if (user?.email) {
            sendOrderEmail("order-completed", { recipientEmail: user.email, recipientName: user.username, orderId: order.id });
          }
        }).catch(err => logger.error("[EMAIL] cron auto-selesai notification failed:", err));

      completedIds.push(order.id);
      completedCount++;
    } catch (e) {
      logger.error(`[cron/auto-selesai] Gagal auto-selesai order ${order.id}:`, e);
      failedCount++;
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    completedCount,
    failedCount,
    totalChecked: dikirimOrders.length,
    completedIds,
  });
}
