import { pushSystemChatLog } from "@/lib/chat-system-server";
// GET /api/refund           → list refund milik user (atau semua jika admin)
// POST /api/refund          → body: { komplainId, namaBank, atasNama, noRek }
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer, getSessionUser } from "@/lib/auth-server";
import { mapRefundToDTO } from "@/lib/api/refund-mapper";
import { sendOrderEmail, sendAdminEmail } from "@/lib/email/send";
import { pushAdminNotification } from "@/lib/admin-notification-server";

const schema = z.object({
  komplainId: z.string().min(1),
  namaBank: z.string().min(1),
  atasNama: z.string().min(1),
  noRek: z.string().min(1),
});

function genRefundId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `RFD-${ymd}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export const GET = handler(async () => {
  const s = await getSessionUser();
  if (!s) return ok([]);
  const where = s.role === "ADMIN" || s.role === "SUPER_ADMIN" ? {} : { userId: s.id };
  const list = await prisma.refund.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return ok(list.map(mapRefundToDTO));
});

export const POST = handler(async (req: Request) => {
  const u = await requireCustomer();
  const body = schema.parse(await req.json());

  const k = await prisma.komplain.findFirst({
    where: { id: body.komplainId, userId: u.id, tindakan: "REFUND" },
  });
  if (!k) return fail(404, "Komplain refund tidak ditemukan");
  if (k.status !== "DISETUJUI" && k.status !== "MENUNGGU_REVIEW_ADMIN") {
    return fail(400, "Status komplain tidak valid untuk refund");
  }

  const existing = await prisma.refund.findUnique({ where: { komplainId: k.id } });
  if (existing) return fail(409, "Refund sudah pernah diajukan");

  const created = await prisma.$transaction(async (tx) => {
    const r = await tx.refund.create({
      data: {
        id: genRefundId(),
        komplainId: k.id,
        orderId: k.orderId!,
        userId: u.id,
        status: "MENUNGGU_REVIEW_ADMIN",
        namaBank: body.namaBank,
        atasNama: body.atasNama,
        noRek: body.noRek,
      },
    });
    await tx.komplain.update({
      where: { id: k.id },
      data: {
        status: "MENUNGGU_REVIEW_ADMIN",
        refundForm: {
          namaBank: body.namaBank,
          atasNama: body.atasNama,
          noRek: body.noRek,
          submittedAt: r.createdAt.toISOString(),
        },
      },
    });
    await pushSystemChatLog(k.userId, `Formulir refund diajukan. Menunggu admin verifikasi rekening & menentukan nominal.`, { kind: "komplain", refId: k.id, label: "Komplain " + k.id, href: "/komplain/" + k.id }, tx);
    return r;
  });

  // Kirim email refund requested ke customer (non-blocking)
  void sendOrderEmail("order-refunded", {
    recipientEmail: u.email,
    recipientName: u.username,
    orderId: k.orderId!,
  });

  // Notifikasi admin (non-blocking)
  prisma.adminuser.findMany({ where: { aktif: true }, select: { email: true, nama: true } })
    .then((admins) => {
      admins.forEach((admin) => {
        if (admin.email) {
          sendAdminEmail("refund-request", {
            adminEmail: admin.email,
            adminName: admin.nama,
            orderId: k.orderId!,
            refundId: created.id,
            nominal: 0,
          }).catch(err => console.error(`[EMAIL] admin refund-request to ${admin.email} failed:`, err));
        }
      });
    }).catch(err => console.error("[EMAIL] admin refund-request query failed:", err));

  // Pusher Admin Notification
  pushAdminNotification(
    "Permintaan Refund",
    `Customer ${u.username} meminta refund untuk Komplain ${body.komplainId}.`,
    "warning",
    "refund"
  );

  return ok(mapRefundToDTO(created));
});