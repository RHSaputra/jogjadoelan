import { logger } from "@/lib/logger";
import { pushSystemChatLog } from "@/lib/chat-system-server";
// GET  /api/komplain          — list milik user
// POST /api/komplain          — create baru

import { z } from "zod";
import type { komplain_jenis, komplain_tindakan } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapKomplainToDTO } from "@/lib/api/komplain-mapper";
import { toUpperEnum } from "@/lib/api/enum-mapper";
import { sendKomplainEmail, sendAdminEmail } from "@/lib/email/send";
import { pushAdminNotification } from "@/lib/admin-notification-server";

export const GET = handler(async () => {
  const u = await requireCustomer();
  const rows = await prisma.komplain.findMany({
    where: { userId: u.id },
    include: {
      
      refund: true,
      tukar: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return ok(rows.map(mapKomplainToDTO));
});

const createSchema = z.object({
  orderId: z.string().min(1),
  jenis: z.string().min(1),
  jenisLabel: z.string().min(1),
  tindakan: z.enum(["refund", "tukar", "komplain_saja"]),
  deskripsi: z.string().min(1),
  files: z.array(z.object({
    url: z.string(),
    type: z.enum(["image", "video"]),
    name: z.string().optional(),
  })).default([]),
});

function genKomplainId(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `KMP-${ymd}-${rnd}`;
}

const SAPAAN_ADMIN = "Halo! Laporan/Komplain Anda sudah kami terima. Admin akan meninjau secepatnya pada jam operasional Senin–Sabtu 08.00–17.00 WIB. Mohon menunggu ya.";

export const POST = handler(async (req: Request) => {
  const u = await requireCustomer();
  const body = createSchema.parse(await req.json());

  const order = await prisma.order.findFirst({
    where: { id: body.orderId, userId: u.id },
    select: { id: true },
  });
  // FIX: Gunakan fail(404) bukan ok({ error }) agar frontend mendapat error proper
  if (!order) return fail(404, "Order tidak ditemukan", "NOT_FOUND");

  const created = await prisma.komplain.create({
    data: {
      id: genKomplainId(),
      userId: u.id,
      orderId: body.orderId,
      jenis: toUpperEnum(body.jenis) as komplain_jenis,
      jenisLabel: body.jenisLabel,
      tindakan: toUpperEnum(body.tindakan) as komplain_tindakan,
      deskripsi: body.deskripsi,
      filesPaths: body.files,
      status: "BARU",
    },
  });

  await pushSystemChatLog(u.id, SAPAAN_ADMIN, { kind: "komplain", refId: created.id, label: "Komplain " + created.id, href: "/komplain/" + created.id });

  // Notifikasi balik ke customer — jangan gagalkan respons jika notifikasi gagal
  try {
    await prisma.notifikasi.create({
      data: {
        userId: u.id,
        type: "KOMPLAIN",
        title: "Komplain Diajukan",
        body: `Komplain ${created.id} telah diajukan dan menunggu tinjauan admin.`,
        link: `/komplain/${created.id}`,
        komplainId: created.id,
        orderId: body.orderId,
      },
    });
  } catch {
    /* notifikasi gagal tidak membatalkan komplain */
  }

  // Kirim email komplain dibuat (non-blocking)
  try {
    sendKomplainEmail("komplain-created", {
      recipientEmail: u.email,
      recipientName: u.username,
      komplainId: created.id,
    }).catch(err => {
      logger.error("Failed to send komplain created email:", err);
    });
  } catch (err) {
    logger.error("Failed to send komplain created email:", err);
  }

  // Notifikasi email admin (non-blocking)
  prisma.adminuser.findMany({ where: { aktif: true }, select: { email: true, nama: true } })
    .then((admins) => {
      admins.forEach((admin) => {
        if (admin.email) {
          sendAdminEmail("new-komplain", {
            adminEmail: admin.email,
            adminName: admin.nama,
            komplainId: created.id,
            customerName: u.username,
            jenisLabel: created.jenisLabel,
          }).catch(err => logger.error(`[EMAIL] admin new-komplain to ${admin.email} failed:`, err));
        }
      });
    }).catch(err => logger.error("[EMAIL] admin new-komplain query failed:", err));

  // Pusher Admin Notification
  pushAdminNotification(
    "Komplain Baru",
    `Customer ${u.username} mengajukan komplain untuk Order ${body.orderId}.`,
    "warning",
    "komplain"
  );

  return ok(mapKomplainToDTO(created));
});
