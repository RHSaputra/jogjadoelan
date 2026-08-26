// POST /api/custom/[id]/konfirmasi → customer konfirmasi pesanan diterima
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";
import { mapCustomOrderToDTO } from "@/lib/api/custom-mapper";

const SELECT_FULL = {
  include: {
    user: { select: { id: true, username: true, email: true } },
    customprogress: { orderBy: { createdAt: "asc" as const } },
    payment: { orderBy: { createdAt: "asc" as const } },
  },
};

export const POST = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const u = await requireUser();
    const { id } = await ctx.params;

    const c = await prisma.customorder.findUnique({ where: { id } });
    if (!c) return fail(404, "Custom order tidak ditemukan");
    if (c.userId !== u.id) return fail(403, "Akses ditolak");
    if (c.status !== "DIKIRIM") {
      return fail(400, "Pesanan belum dalam status dikirim");
    }

    const updated = await prisma.customorder.update({
      where: { id },
      data: { status: "SELESAI" },
      ...SELECT_FULL,
    });

    await prisma.customprogress.create({
      data: {
        customOrderId: id,
        tahap: "Pesanan Diterima",
        deskripsi: "Customer mengkonfirmasi pesanan telah diterima.",
      },
    }).catch(() => {});

    await prisma.notifikasi.create({
      data: {
        userId: u.id,
        title: "Pesanan Custom Selesai",
        body: `Custom order ${id} telah dikonfirmasi diterima. Terima kasih!`,
        type: "CUSTOM",
        link: `/custom/${id}`,
      },
    }).catch(() => {});

    return ok(mapCustomOrderToDTO(updated));
  },
);
