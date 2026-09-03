// POST /api/order/[id]/bayar  — upload bukti bayar (multipart/form-data)
// fields: file (File), pengirimNama?, pengirimBank?, pengirimNoRek?, jamTransfer? (ISO)

import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { saveUpload } from "@/lib/upload";
import { mapOrderToLegacy } from "@/lib/api/order-mapper";
import { sendOrderEmail, sendAdminEmail } from "@/lib/email/send";
import { pushAdminNotification } from "@/lib/admin-notification-server";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const me = await requireCustomer();
  const { id } = await ctx.params;

  const o = await prisma.order.findUnique({ where: { id } });
  if (!o || o.userId !== me.id) return fail(404, "Pesanan tidak ditemukan");
  if (!["MENUNGGU_PEMBAYARAN", "MENUNGGU_KONFIRMASI"].includes(o.status)) {
    return fail(400, "Order tidak menerima pembayaran lagi");
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return fail(422, "File bukti bayar wajib diisi");

  // --- VALIDASI IDEMPOTENCY / DOUBLE CLICK ---
  const recentPayment = await prisma.payment.findFirst({
    where: { orderId: id, createdAt: { gte: new Date(Date.now() - 10000) } },
    select: { id: true },
  });
  if (recentPayment) {
    return fail(429, "Bukti pembayaran sedang diproses. Mohon tunggu beberapa saat.");
  }

  const uploaded = await saveUpload(file, "order", { imageOnly: true });
  const now = new Date();
  const pengirimNama = (form.get("pengirimNama") as string) ?? o.userId;
  const pengirimBank = (form.get("pengirimBank") as string) ?? null;
  const pengirimNoRek = (form.get("pengirimNoRek") as string) ?? null;
  const jamTransfer = form.get("jamTransfer")
    ? new Date(String(form.get("jamTransfer")))
    : now;

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id } });
    if (!current || current.userId !== me.id) {
      throw new Error("Pesanan tidak ditemukan");
    }
    if (!["MENUNGGU_PEMBAYARAN", "MENUNGGU_KONFIRMASI"].includes(current.status)) {
      throw new Error("Order tidak menerima pembayaran lagi");
    }

    await tx.payment.create({
      data: {
        id: crypto.randomUUID(),
        orderId: id,
        type: "FULL",
        metode: current.metodeBayar,
        bankKey: current.bankKey,
        nominal: current.total,
        buktiPath: uploaded.path,
        pengirimNama,
        pengirimBank,
        pengirimNoRek,
        jamTransfer,
        status: "PENDING",
      },
    });

    const ord = await tx.order.update({
      where: { id },
      data: {
        buktiBayar: uploaded.path,
        buktiBayarAt: now,
        status: "MENUNGGU_KONFIRMASI",
        ordertimeline: { create: { id: crypto.randomUUID(), step: "DIBAYAR", label: "Bukti Pembayaran Diunggah", at: now } },
      },
      include: { orderitem: true, ordertimeline: { orderBy: { at: "asc" } }, payment: true },
    });

    await tx.notifikasi.create({
      data: {
        id: crypto.randomUUID(),
        userId: me.id,
        orderId: id,
        type: "ORDER",
        title: "Bukti pembayaran diterima",
        body: `Pembayaran untuk pesanan ${id} telah diunggah, menunggu konfirmasi admin.`,
        link: `/pesanan/${id}`,
      },
    });

    return ord;
  });

  // Kirim email notifikasi ke customer & admin (non-blocking)
  void sendOrderEmail("payment-received", {
    recipientEmail: me.email,
    recipientName: me.username,
    orderId: id,
    total: o.total,
  });

  // Notifikasi admin — ambil admin email dari DB
  prisma.adminuser.findMany({ where: { aktif: true }, select: { email: true, nama: true } })
    .then((admins) => {
      admins.forEach((admin) => {
        if (admin.email) {
          sendAdminEmail("new-payment", {
            adminEmail: admin.email,
            adminName: admin.nama,
            orderId: id,
            total: o.total,
            customerName: me.username,
          }).catch(err => console.error(`[EMAIL] admin new-payment to ${admin.email} failed:`, err));
        }
      });
    }).catch(err => console.error("[EMAIL] admin new-payment query failed:", err));

  // Pusher Admin Notification
  pushAdminNotification(
    "Pembayaran Masuk",
    `Customer ${me.username} mengunggah bukti pembayaran untuk Order ${id}.`,
    "info",
    "order"
  );

  return ok(mapOrderToLegacy({
    ...updated,
    items: updated.orderitem,
    timeline: updated.ordertimeline,
    payments: updated.payment,
  }));
});
