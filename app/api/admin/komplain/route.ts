// GET /api/admin/komplain?tab=&q=
import { z } from "zod";
import type { Prisma, komplain_status } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapKomplainToDTO } from "@/lib/api/komplain-mapper";

const TAB_STATUS: Record<string, komplain_status[]> = {
  all: [],
  baru: ["BARU"],
  ditinjau: ["DITINJAU"],
  disetujui: ["DISETUJUI"],
  menunggu_review_admin: ["MENUNGGU_REVIEW_ADMIN"],
  menunggu_balikan: ["MENUNGGU_BALIKAN"],
  diproses: ["DIPROSES"],
  berhasil: ["BERHASIL"],
  ditolak: ["DITOLAK", "DIBATALKAN"],
};

const qs = z.object({
  tab: z.string().default("all"),
  q: z.string().optional(),
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));
  const where: Prisma.komplainWhereInput = {};
  const allowed = TAB_STATUS[f.tab] ?? [];
  if (allowed.length) where.status = { in: allowed };
  if (f.q) {
    where.OR = [
      { id: { contains: f.q } },
      { orderId: { contains: f.q } },
      { deskripsi: { contains: f.q } },
      { jenisLabel: { contains: f.q } },
      { user: { is: { OR: [{ username: { contains: f.q } }, { email: { contains: f.q } }] } } },
    ];
  }
  const rows = await prisma.komplain.findMany({
    where,
    include: {
      
      user: { select: { id: true, username: true, email: true } },
      refund: true,
      tukar: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return ok(rows.map((k) => ({
    ...mapKomplainToDTO(k),
    userId: k.userId,
    userName: k.user.username ?? k.user.email ?? `User ${k.userId.slice(0, 6)}`,
    userEmail: k.user.email,
    refund: k.refund,
    tukar: k.tukar,
  })));
});