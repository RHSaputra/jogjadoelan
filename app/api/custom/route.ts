// GET  /api/custom        → list custom order milik user yang login
// POST /api/custom        → submit custom order baru (status SUBMITTED → MENUNGGU_ESTIMASI)
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";
import { CustomOrderInputSchema } from "@/lib/api/custom-schemas";
import { mapCustomOrderToDTO } from "@/lib/api/custom-mapper";
import { pushAdminNotification } from "@/lib/admin-notification-server";

const SELECT_FULL = {
  include: {
    user: { select: { id: true, username: true, email: true } },
    customprogress: { orderBy: { createdAt: "asc" as const } },
    payment: { orderBy: { createdAt: "asc" as const } },
  },
};

function nextCustomId() {
  // format konsisten: "JD-C-xxxxx"
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `JD-C-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export const GET = handler(async () => {
  const u = await requireUser();
  const rows = await prisma.customorder.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
    ...SELECT_FULL,
  });
  return ok(rows.map(mapCustomOrderToDTO));
});

export const POST = handler(async (req: Request) => {
  const u = await requireUser();

  // Extra safety: prevent FK violation if session userId is stale/not in DB.
  const exists = await prisma.user.findUnique({
    where: { id: u.id },
    select: { id: true },
  });
  if (!exists) {
    return fail(401, "Sesi login tidak valid (user tidak ditemukan)", "UNAUTHORIZED", {
      userId: u.id,
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = CustomOrderInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail(422, "Data form tidak valid", "VALIDATION", {
      _: parsed.error.message,
    });
  }
  const f = parsed.data;

  const created = await prisma.customorder.create({
    data: {
      id: nextCustomId(),
      userId: u.id,
      status: "MENUNGGU_ESTIMASI",
      jenis: f.jenis,
      ukuran: f.ukuran,
      finishing: f.finishing ?? null,
      strap: f.strap ?? null,
      motifBusa: f.motifBusa ?? null,
      bahan: f.bahan ?? null,
      aksesoris: f.aksesoris ?? null,
      warnaList: f.warnaList,
      warnaCatatan: f.warnaCatatan ?? null,
      notes: f.notes ?? null,
      referensiPaths: f.referensiPaths,
    },
    ...SELECT_FULL,
  });

  // Pusher Admin Notification
  pushAdminNotification(
    "Custom Order Baru",
    `Customer ${u.username} mengajukan custom order baru.`,
    "info",
    "custom"
  );

  return ok(mapCustomOrderToDTO(created), { status: 201 });
});
