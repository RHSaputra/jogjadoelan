import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";

export const GET = handler(async () => {
  const u = await requireCustomer();
  const rows = await prisma.orderitem.findMany({
    where: {
      order: { userId: u.id, status: "SELESAI" },
      ulasan: null,
    },
    include: {
      order: { select: { id: true, konfirmasiDiterimaAt: true } },
    },
    orderBy: { order: { konfirmasiDiterimaAt: "desc" } },
  });
  return ok(rows.map((it) => ({
    orderItemId: it.id,
    orderId: it.orderId,
    completedAt: it.order.konfirmasiDiterimaAt?.toISOString() ?? null,
    produkId: it.produkId,
    produkNama: it.snapNama,
    produkGambar: it.snapGambar ?? null,
    qty: it.qty,
    varianLabel: [it.ukuran, it.warna].filter(Boolean).join(" / ") || null,
  })));
});