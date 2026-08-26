import { pushSystemChatLog } from "@/lib/chat-system-server";
// Customer konfirmasi varian pengganti diterima
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapTukarToDTO } from "@/lib/api/tukar-mapper";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const u = await requireCustomer();
  const { id } = await ctx.params;
  const t = await prisma.tukar.findFirst({ where: { id, userId: u.id } });
  if (!t) return fail(404, "Tukar tidak ditemukan");
  if (t.status !== "VARIAN_BARU_DIKIRIM") {
    return fail(400, "Belum bisa konfirmasi pada status ini");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const u2 = await tx.tukar.update({
      where: { id },
      data: { status: "SELESAI", customerConfirmedAt: now },
    });
    await tx.komplain.update({ where: { id: t.komplainId }, data: { status: "BERHASIL" } });
    await pushSystemChatLog(t.userId, "Customer mengkonfirmasi varian pengganti sudah diterima. Komplain selesai.", { kind: "komplain", refId: t.komplainId, label: "Komplain " + t.komplainId, href: "/komplain/" + t.komplainId }, tx);
    return u2;
  });
  // Notifikasi real-time ke admin via komplain channel
  await pusher.trigger(`private-komplain-${t.komplainId}`, "status-change", { status: "BERHASIL" }).catch(() => {});
  return ok(mapTukarToDTO(updated));
});