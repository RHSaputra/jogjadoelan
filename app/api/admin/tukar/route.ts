// GET /api/admin/tukar?tab=&q= — list semua tukar (admin-only)
import { z } from "zod";
import type { Prisma, tukar_status } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapTukarToDTO } from "@/lib/api/tukar-mapper";

const TAB_STATUS: Record<string, tukar_status[]> = {
  all: [],
  menunggu_review_admin: ["MENUNGGU_REVIEW_ADMIN"],
  menunggu_pengiriman_balik: ["MENUNGGU_PENGIRIMAN_BALIK"],
  dikirim_balik: ["DIKIRIM_BALIK"],
  diterima_admin: ["DITERIMA_ADMIN"],
  varian_baru_dikirim: ["VARIAN_BARU_DIKIRIM"],
  selesai: ["SELESAI"],
  ditolak: ["DITOLAK", "DIBATALKAN"],
  aktif: [
    "MENUNGGU_REVIEW_ADMIN",
    "MENUNGGU_PENGIRIMAN_BALIK",
    "DIKIRIM_BALIK",
    "DITERIMA_ADMIN",
    "VARIAN_BARU_DIKIRIM",
  ],
};

const qs = z.object({
  tab: z.string().default("all"),
  q: z.string().optional(),
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const f = qs.parse(Object.fromEntries(searchParams));
  const where: Prisma.tukarWhereInput = {};
  const allowed = TAB_STATUS[f.tab] ?? [];
  if (allowed.length) where.status = { in: allowed };
  if (f.q) {
    where.OR = [
      { id: { contains: f.q } },
      { komplainId: { contains: f.q } },
      { orderId: { contains: f.q } },
      { productNama: { contains: f.q } },
      { ukuranBaru: { contains: f.q } },
      { user: { is: { OR: [{ username: { contains: f.q } }, { email: { contains: f.q } }] } } },
    ];
  }
  const rows = await prisma.tukar.findMany({
    where,
    include: { user: { select: { id: true, username: true, email: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return ok(
    rows.map((t) => ({
      ...mapTukarToDTO(t),
      userName: t.user.username ?? t.user.email ?? `User ${t.userId.slice(0, 6)}`,
      userEmail: t.user.email,
    }))
  );
});