// GET /api/admin/audit?adminId=&action=&entity=&entityId=&from=&to=&page=&limit=
import { z } from "zod";
import type { Prisma, auditlog_action } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const qs = z.object({
  adminId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
  from: z.string().optional(),  // ISO
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10000).default(50),
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));

  const where: Prisma.auditlogWhereInput = {};
  if (f.adminId) where.adminId = f.adminId;
  if (f.action) where.action = f.action as auditlog_action;
  if (f.entity) where.entity = f.entity;
  if (f.entityId) where.entityId = f.entityId;
  if (f.from || f.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (f.from) createdAt.gte = new Date(f.from);
    if (f.to) createdAt.lte = new Date(f.to);
    where.createdAt = createdAt;
  }

  const [rows, total] = await Promise.all([
    prisma.auditlog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.limit,
      take: f.limit,
    }),
    prisma.auditlog.count({ where }),
  ]);

  return ok({
    items: rows.map((r) => ({
      id: r.id,
      adminId: r.adminId,
      adminName: r.adminName,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      meta: r.meta,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
    })),
    total, page: f.page, limit: f.limit,
  });
});

export const DELETE = handler(async () => {
  await requireAdmin();
  const deleted = await prisma.auditlog.deleteMany({});
  return ok({ message: `Berhasil menghapus ${deleted.count} log aktivitas` });
});