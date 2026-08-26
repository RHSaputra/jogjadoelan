import { z } from "zod";
import type { Prisma, notifikasi_type } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { toUpperEnum } from "@/lib/api/enum-mapper";

const schema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.enum(["promo", "info"]).default("info"),
  link: z.string().optional(),
  targetUserIds: z.array(z.string()).optional(), // null = semua (tapi difilter)
  target: z.enum(["semua", "aktif"]).optional().default("semua"),
});

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const body = schema.parse(await req.json());

  // Bangun filter user
  const userWhere: Prisma.userWhereInput = {};

  if (body.targetUserIds?.length) {
    // Spesifik user ID
    userWhere.id = { in: body.targetUserIds };
  }

  if (body.target === "aktif") {
    // Customer dengan order dalam 30 hari terakhir
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUserIds = await prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ["userId"],
    });

    const ids = activeUserIds.map((o) => o.userId);

    if (ids.length === 0) return ok({ sent: 0 });

    // Intersect dengan targetUserIds jika ada
    if (body.targetUserIds?.length) {
      const targetSet = new Set(body.targetUserIds);
      userWhere.id = { in: ids.filter((id) => targetSet.has(id)) };
    } else {
      userWhere.id = { in: ids };
    }
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    select: { id: true },
  });

  if (users.length === 0) return ok({ sent: 0 });

  await prisma.notifikasi.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title: body.title,
      body: body.body,
      type: toUpperEnum(body.type) as notifikasi_type,
      link: body.link,
    })),
  });

  return ok({ sent: users.length });
});