// GET    /api/notifikasi          — list milik user login
// POST   /api/notifikasi          — create (internal use; protected admin)
// DELETE /api/notifikasi          — clear all milik user

import { z } from "zod";
import type { notifikasi_type } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireCustomer, requireAdmin } from "@/lib/auth-server";
import { mapNotifToDTO } from "@/lib/api/notif-mapper";
import { toUpperEnum } from "@/lib/api/enum-mapper";

export const GET = handler(async () => {
  const u = await requireCustomer();

  // Clean up notifications older than 30 days asynchronously in background
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  prisma.notifikasi.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo } }
  }).catch((err) => console.error("Gagal membersihkan notifikasi lama:", err));

  const rows = await prisma.notifikasi.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok(rows.map(mapNotifToDTO));
});

const createSchema = z.object({
  userId: z.string().min(1).optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.string().default("info"),
  link: z.string().optional(),
  orderId: z.string().optional(),
  komplainId: z.string().optional(),
  refundId: z.string().optional(),
  tukarId: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const body = createSchema.parse(await req.json());
  if (!body.userId) return ok({ error: "userId wajib diisi" });
  const created = await prisma.notifikasi.create({
    data: {
      userId: body.userId,
      title: body.title,
      body: body.body,
      type: toUpperEnum(body.type) as notifikasi_type,
      link: body.link,
      orderId: body.orderId,
      komplainId: body.komplainId,
      refundId: body.refundId,
      tukarId: body.tukarId,
    },
  });
  return ok(mapNotifToDTO(created));
});

export const DELETE = handler(async () => {
  const u = await requireCustomer();
  await prisma.notifikasi.deleteMany({ where: { userId: u.id } });
  return ok({ cleared: true });
});
