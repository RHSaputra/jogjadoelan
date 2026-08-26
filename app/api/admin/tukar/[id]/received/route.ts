import { pushSystemChatLog } from "@/lib/chat-system-server";
// Admin konfirmasi barang LAMA sudah diterima — restock varian lama +1
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapTukarToDTO } from "@/lib/api/tukar-mapper";
import { mutateProductStock } from "@/lib/server/stock-mutation";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const t = await prisma.tukar.findUnique({ where: { id } });
  if (!t) return fail(404, "Tukar tidak ditemukan");
  if (t.status !== "DIKIRIM_BALIK") {
    return fail(400, "Belum bisa terima — barang belum dikirim balik");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    // Restock varian LAMA (+1)
    await mutateProductStock(tx, t.productId, t.ukuranLama, t.warnaLama, +1);

    const u = await tx.tukar.update({
      where: { id },
      data: { status: "DITERIMA_ADMIN", adminReceivedAt: now },
    });
    await tx.komplain.update({
      where: { id: t.komplainId },
      data: { status: "DIPROSES" },
    });
    await pushSystemChatLog(t.userId, `Admin telah menerima barang lama. Stok ukuran ${t.ukuranLama ?? "-"} dikembalikan (+1). Menunggu pengiriman varian pengganti.`, { kind: "komplain", refId: t.komplainId, label: "Komplain " + t.komplainId, href: "/komplain/" + t.komplainId }, tx);
    return u;
  });

  await pusher.trigger(`private-komplain-${t.komplainId}`, "status-change", { status: "DIPROSES" }).catch(() => {});

  return ok(mapTukarToDTO(updated));
});