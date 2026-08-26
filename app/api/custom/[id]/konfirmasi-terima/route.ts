// POST /api/custom/[id]/konfirmasi-terima  → customer konfirmasi pesanan diterima (DIKIRIM → SELESAI)
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

    // Hanya bisa konfirmasi terima jika status DIKIRIM
    if (c.status !== "DIKIRIM") {
      return fail(400, "Pesanan belum dikirim, tidak bisa konfirmasi penerimaan");
    }

    const updated = await prisma.customorder.update({
      where: { id },
      data: {
        status: "SELESAI",
        customerApprovedAt: new Date(),
      },
      ...SELECT_FULL,
    });

    // Buat notifikasi ke admin
    await prisma.notifikasi.create({
      data: {
        userId: c.userId,
        title: "Pesanan Diterima",
        body: `Pesanan custom ${id} telah dikonfirmasi diterima oleh pelanggan.`,
        type: "CUSTOM",
        link: `/custom/${id}`,
      },
    }).catch(() => {});

    return ok(mapCustomOrderToDTO(updated));
  },
);