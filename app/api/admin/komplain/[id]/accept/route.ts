import { pushSystemChatLog } from "@/lib/chat-system-server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapKomplainToDTO } from "@/lib/api/komplain-mapper";
import { sendKomplainEmail } from "@/lib/email/send";
import pusher from "@/lib/pusher-server";

type Ctx = { params: Promise<{ id: string }> };

const PESAN: Record<string, string> = {
  REFUND: "Komplain disetujui. Silakan isi formulir refund. Admin akan memverifikasi sebelum Anda memproses pengiriman pengembalian barang.",
  TUKAR: "Komplain disetujui. Silakan isi formulir tukar barang. Admin akan segera memverifikasi ketersediaan stok pengganti.",
  KOMPLAIN_SAJA: "Laporan Anda sudah kami terima dan ditindaklanjuti. Silakan cek pesan admin di ruang chat untuk info selanjutnya.",
};

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const k = await prisma.komplain.findUnique({ where: { id } });
  if (!k) return fail(404, "Komplain tidak ditemukan");

  const nextStatus = k.tindakan === "KOMPLAIN_SAJA" ? "BERHASIL" : "DISETUJUI";

  await prisma.$transaction([
    await pushSystemChatLog(k.userId, PESAN[k.tindakan], { kind: "komplain", refId: id, label: "Komplain " + id, href: "/komplain/" + id }, prisma),
    prisma.komplain.update({ where: { id }, data: { status: nextStatus } }),
    prisma.notifikasi.create({
      data: {
        userId: k.userId,
        type: "KOMPLAIN",
        title: "Komplain Disetujui",
        body: `Komplain ${id} telah disetujui admin.`,
        link: `/komplain/${id}`,
        komplainId: id,
      },
    }),
  ]);
  
  const reload = await prisma.komplain.findUnique({
    where: { id },
    include: {  user: { select: { username: true, email: true } } },
  });
  
  // Kirim email balasan komplain (non-blocking)
  try {
    sendKomplainEmail("komplain-replied", {
      recipientEmail: reload!.user.email,
      recipientName: reload!.user.username,
      komplainId: id,
      adminName: admin.username,
    }).catch(err => {
      logger.error("Failed to send komplain replied email:", err);
    });
  } catch (err) {
    logger.error("Failed to send komplain replied email:", err);
  }

  // Notifikasi real-time ke customer agar UI langsung update tanpa refresh
  await pusher.trigger(`private-komplain-${id}`, "status-change", { status: nextStatus }).catch(() => {});

  return ok(mapKomplainToDTO(reload!));
});
