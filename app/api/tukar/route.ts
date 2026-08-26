import { pushSystemChatLog } from "@/lib/chat-system-server";
// GET /api/tukar  → list tukar milik user (atau semua jika admin)
// POST /api/tukar → body: { komplainId, productId?, productNama, productGambar?, ukuranLama?, ukuranBaru, warnaLama?, warnaBaru?, notes?, alamatTujuan }
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireCustomer, getSessionUser } from "@/lib/auth-server";
import { mapTukarToDTO } from "@/lib/api/tukar-mapper";
import { sendOrderEmail, sendAdminEmail } from "@/lib/email/send";
import { pushAdminNotification } from "@/lib/admin-notification-server";

const alamatSchema = z.object({
  nama: z.string().min(1),
  hp: z.string().min(1),
  alamat: z.string().min(1),
  kota: z.string().min(1),
  kodePos: z.string().min(1),
});

const schema = z.object({
  komplainId: z.string().min(1),
  productId: z.string().optional(),
  productNama: z.string().min(1),
  productGambar: z.string().optional(),
  ukuranLama: z.string().optional(),
  ukuranBaru: z.string().min(1),
  warnaLama: z.string().optional(),
  warnaBaru: z.string().optional(),
  notes: z.string().optional(),
  alamatTujuan: alamatSchema,
});

function genTukarId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `TKR-${ymd}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export const GET = handler(async () => {
  const s = await getSessionUser();
  if (!s) return ok([]);
  const where = s.role === "ADMIN" || s.role === "SUPER_ADMIN" ? {} : { userId: s.id };
  const list = await prisma.tukar.findMany({
    where,
    include: { user: { select: { username: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(list.map((t) => ({
    ...mapTukarToDTO(t),
    userName: t.user?.username ?? t.user?.email ?? `User ${t.userId.slice(0, 6)}`,
  })));
});

export const POST = handler(async (req: Request) => {
  const u = await requireCustomer();
  const body = schema.parse(await req.json());

  const k = await prisma.komplain.findFirst({
    where: { id: body.komplainId, userId: u.id, tindakan: "TUKAR" },
  });
  if (!k) return fail(404, "Komplain tukar tidak ditemukan");
  if (!["DISETUJUI", "MENUNGGU_REVIEW_ADMIN"].includes(k.status)) {
    return fail(400, "Status komplain tidak valid untuk tukar");
  }
  if (await prisma.tukar.findUnique({ where: { komplainId: k.id } })) {
    return fail(409, "Tukar sudah pernah diajukan");
  }

  const created = await prisma.$transaction(async (tx) => {
    const t = await tx.tukar.create({
      data: {
        id: genTukarId(),
        komplainId: k.id,
        orderId: k.orderId!,
        userId: u.id,
        status: "MENUNGGU_REVIEW_ADMIN",
        productId: body.productId ?? null,
        productNama: body.productNama,
        productGambar: body.productGambar ?? null,
        ukuranLama: body.ukuranLama ?? null,
        ukuranBaru: body.ukuranBaru,
        warnaLama: body.warnaLama ?? null,
        warnaBaru: body.warnaBaru ?? null,
        notes: body.notes ?? null,
        alamatTujuan: body.alamatTujuan,
      },
    });
    await tx.komplain.update({
      where: { id: k.id },
      data: {
        status: "MENUNGGU_REVIEW_ADMIN",
        tukarForm: {
          productNama: body.productNama,
          ukuranBaru: body.ukuranBaru,
          warnaBaru: body.warnaBaru ?? "",
          alamatTujuan: body.alamatTujuan,
          submittedAt: t.createdAt.toISOString(),
        },
      },
    });
    await pushSystemChatLog(k.userId, `Formulir tukar diajukan. Varian pengganti: ukuran ${body.ukuranBaru}${body.warnaBaru ? ` warna ${body.warnaBaru}` : ""}. Menunggu admin memverifikasi ketersediaan stok.`, { kind: "komplain", refId: k.id, label: "Komplain " + k.id, href: "/komplain/" + k.id }, tx);
    return t;
  });

  // Kirim email penukaran diajukan ke customer (non-blocking)
  sendOrderEmail("tukar-requested", {
    recipientEmail: u.email,
    recipientName: u.username,
    orderId: created.orderId,
    komplainId: created.komplainId,
    productNama: created.productNama,
    ukuranBaru: created.ukuranBaru,
  }).catch(err => console.error("[EMAIL] customer tukar-requested failed:", err));

  // Notifikasi email admin (non-blocking)
  prisma.adminuser.findMany({ where: { aktif: true }, select: { email: true, nama: true } })
    .then((admins) => {
      admins.forEach((admin) => {
        if (admin.email) {
          sendAdminEmail("new-tukar", {
            adminEmail: admin.email,
            adminName: admin.nama,
            tukarId: created.id,
            customerName: u.username,
            orderId: created.orderId,
            productNama: created.productNama,
            ukuranBaru: created.ukuranBaru,
          }).catch(err => console.error(`[EMAIL] admin new-tukar to ${admin.email} failed:`, err));
        }
      });
    }).catch(err => console.error("[EMAIL] admin new-tukar query failed:", err));

  // Pusher Admin Notification
  pushAdminNotification(
    "Permintaan Tukar",
    `Customer ${u.username} meminta penukaran barang untuk Komplain ${body.komplainId}.`,
    "warning",
    "tukar"
  );

  return ok(mapTukarToDTO(created));
});