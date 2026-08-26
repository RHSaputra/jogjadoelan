// GET /api/admin/custom?tab=&q=  → { orders, stats }
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapCustomOrderToDTO } from "@/lib/api/custom-mapper";
import type { customorder_status as CustomStatus } from "@prisma/client";

export type AdminCustomTab =
  | "all" | "perlu_estimasi" | "verifikasi" | "diproses"
  | "siap_dilunasi" | "dikirim" | "selesai" | "ditolak";

const TAB_MAP: Record<AdminCustomTab, CustomStatus[]> = {
  all: [],
  perlu_estimasi: ["SUBMITTED", "MENUNGGU_ESTIMASI"],
  verifikasi: ["MENUNGGU_VERIFIKASI_DP", "MENUNGGU_VERIFIKASI_LUNAS", "MENUNGGU_VERIFIKASI_PELUNASAN"],
  diproses: ["DIPROSES"],
  siap_dilunasi: ["SIAP_DILUNASI"],
  dikirim: ["DIKIRIM"],
  selesai: ["SELESAI"],
  ditolak: ["DIBATALKAN", "REJECTED"],
};

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const url = new URL(req.url);
  const tab = (url.searchParams.get("tab") ?? "all") as AdminCustomTab;
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const where: { status?: { in: CustomStatus[] } } = {};
  if (tab !== "all" && TAB_MAP[tab]?.length) where.status = { in: TAB_MAP[tab] };

  const rows = await prisma.customorder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, email: true } },
      customprogress: { orderBy: { createdAt: "asc" } },
      payment: { orderBy: { createdAt: "asc" } },
    },
  });

  let orders = rows.map(mapCustomOrderToDTO);
  if (q) {
    orders = orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.jenis.toLowerCase().includes(q) ||
        (o.notes ?? "").toLowerCase().includes(q),
    );
  }

  // stats: hitung dari SEMUA orders (bukan hasil filter), biar dashboard akurat
  const allRows = q || tab !== "all"
    ? await prisma.customorder.findMany({
        select: { status: true, estimasi: true, hargaFinal: true },
      })
    : rows.map((r) => ({ status: r.status, estimasi: r.estimasi, hargaFinal: r.hargaFinal }));

  const counts: Record<AdminCustomTab, number> = {
    all: allRows.length, perlu_estimasi: 0, verifikasi: 0, diproses: 0,
    siap_dilunasi: 0, dikirim: 0, selesai: 0, ditolak: 0,
  };
  let omzet = 0;
  for (const o of allRows) {
    for (const k of Object.keys(TAB_MAP) as AdminCustomTab[]) {
      if (k !== "all" && TAB_MAP[k].includes(o.status)) counts[k]++;
    }
    if (["SELESAI", "DIPROSES", "DIKIRIM", "SIAP_DILUNASI"].includes(o.status)) {
      const est = (o.estimasi as { total?: number } | null)?.total ?? o.hargaFinal ?? 0;
      omzet += est;
    }
  }

  return ok({ orders, stats: { counts, omzet } });
});