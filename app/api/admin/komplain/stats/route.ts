import type { komplain_status } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

export const GET = handler(async () => {
  await requireAdmin();
  const all = await prisma.komplain.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const map = new Map(all.map((r) => [r.status, r._count._all]));
  const c = (s: komplain_status) => map.get(s) ?? 0;
  const counts = {
    all: all.reduce((s, r) => s + r._count._all, 0),
    baru: c("BARU"),
    ditinjau: c("DITINJAU"),
    disetujui: c("DISETUJUI"),
    menunggu_review_admin: c("MENUNGGU_REVIEW_ADMIN"),
    menunggu_balikan: c("MENUNGGU_BALIKAN"),
    diproses: c("DIPROSES"),
    berhasil: c("BERHASIL"),
    ditolak: c("DITOLAK") + c("DIBATALKAN"),
  };
  const urgentCount = counts.baru + counts.ditinjau + counts.menunggu_review_admin;
  return ok({ counts, urgentCount, total: counts.all });
});