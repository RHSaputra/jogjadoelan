import { logger } from "@/lib/logger";
// POST /api/custom/[id]/pay  → customer kirim bukti DP/Lunas/Pelunasan
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";
import { mapCustomOrderToDTO } from "@/lib/api/custom-mapper";
import { sendOrderEmail, sendAdminEmail } from "@/lib/email/send";
import { saveDataUrl } from "@/lib/upload";
import type { payment_bankKey } from "@prisma/client";

const Body = z.object({
  kind: z.enum(["dp", "lunas", "pelunasan"]),
  amount: z.number().int().positive().optional(),
  ongkir: z.number().int().nonnegative().optional().default(0),
  metode: z.enum(["transfer", "qris"]),
  bank: z.string().optional(),
  buktiDataUrl: z
    .string()
    .regex(/^data:image\/(png|jpe?g|webp);base64,/, "Bukti harus data URL gambar"),
  pengirimNama: z.string().trim().min(1).max(80).optional(),
});

export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const u = await requireUser();
    const { id } = await ctx.params;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((e) => `${e.path.join('.') || 'root'}: ${e.message}`)
        .join(', ');
      return fail(422, `Data pembayaran tidak valid: ${message}`);
    }
    const b = parsed.data;

    const c = await prisma.customorder.findUnique({ where: { id } });
    if (!c) return fail(404, "Custom order tidak ditemukan");
    if (c.userId !== u.id) return fail(403, "Akses ditolak");

    // --- VALIDASI IDEMPOTENCY / DOUBLE CLICK ---
    const recentPayment = await prisma.payment.findFirst({
      where: { customOrderId: id, createdAt: { gte: new Date(Date.now() - 10000) } },
      select: { id: true },
    });
    if (recentPayment) {
      return fail(429, "Pembayaran sedang diproses. Mohon tunggu beberapa saat.");
    }

    const estimasiProduk =
      (c.estimasi as { total?: number } | null)?.total ?? c.hargaFinal ?? 0;
    if (estimasiProduk <= 0) {
      return fail(400, `Estimasi harga belum di-set admin (estimasiProduk=${estimasiProduk}, hargaFinal=${c.hargaFinal ?? 'undefined'})`);
    }
    const ongkir = b.ongkir ?? 0;

    // Ambil biayaPacking dari SiteSetting agar konsisten dengan front-end.
    const packingRow = await prisma.sitesetting.findUnique({ where: { key: "biayaPacking" } });
    const packingDefault = 10000;
    const packingValue = packingRow ? (Number(packingRow.value) || packingDefault) : packingDefault;
    const hasItems = ((c.estimasi as { items?: unknown[] } | null)?.items?.length ?? 0) > 0;
    const biayaPacking = hasItems ? packingValue : 0;

    const totalTagihan = estimasiProduk + ongkir + biayaPacking;

    // hitung nominal & status target
    let nominal = 0;
    let nextStatus: "MENUNGGU_VERIFIKASI_DP" | "MENUNGGU_VERIFIKASI_LUNAS" | "MENUNGGU_VERIFIKASI_PELUNASAN";
    let paymentType: "DP" | "FULL" | "PELUNASAN";
    let coDataPatch: Record<string, unknown> = {};

    if (b.kind === "dp") {
      if (!b.amount) return fail(422, "Nominal DP wajib diisi");
      nominal = b.amount;
      nextStatus = "MENUNGGU_VERIFIKASI_DP";
      paymentType = "DP";
      coDataPatch = {
        paymentType: "DP",
        hargaFinal: totalTagihan,
        dpAmount: nominal,
        sisaAmount: Math.max(0, totalTagihan - nominal),
      };
    } else if (b.kind === "lunas") {
      nominal = totalTagihan;
      nextStatus = "MENUNGGU_VERIFIKASI_LUNAS";
      paymentType = "FULL";
      coDataPatch = {
        paymentType: "LUNAS",
        hargaFinal: totalTagihan,
        dpAmount: 0,
        sisaAmount: 0,
      };
    } else {
      const dpPaid = c.dpAmount ?? 0;
      nominal = Math.max(0, totalTagihan - dpPaid);
      nextStatus = "MENUNGGU_VERIFIKASI_PELUNASAN";
      paymentType = "PELUNASAN";
      coDataPatch = { sisaAmount: 0 };
    }

    if (nominal <= 0) return fail(400, `Tidak ada sisa yang perlu dibayar (nominal=${nominal}, totalTagihan=${totalTagihan}, dpPaid=${c.dpAmount ?? 0})`);

    const buktiPath = await saveDataUrl(b.buktiDataUrl, "order");

    await prisma.payment.create({
      data: {
        customOrderId: id,
        type: paymentType,
        metode: b.metode.toUpperCase() as "TRANSFER" | "QRIS",
        bankKey: b.bank ? (b.bank.toUpperCase() as payment_bankKey) : null,
        nominal,
        buktiPath,
        pengirimNama: b.pengirimNama ?? u.username,
        jamTransfer: new Date(),
        status: "PENDING",
      },
    });

    const updated = await prisma.customorder.update({
      where: { id },
      data: { ...coDataPatch, status: nextStatus },
      include: {
        user: { select: { id: true, username: true, email: true } },
        customprogress: { orderBy: { createdAt: "asc" } },
        payment: { orderBy: { createdAt: "asc" } },
      },
    });
    // Kirim email pelunasan success (non-blocking)
    if (b.kind === "lunas" || b.kind === "pelunasan") {
      const totalBayar = b.kind === "lunas" ? totalTagihan : (c.dpAmount ?? 0) + nominal;
      void sendOrderEmail("pelunasan-success", {
        recipientEmail: u.email,
        recipientName: u.username,
        orderId: id,
        total: totalBayar,
      });
     }
     // Kirim email DP received (non-blocking)
     if (b.kind === "dp") {
       void sendOrderEmail("dp-received", {
         recipientEmail: u.email,
         recipientName: u.username,
         orderId: id,
         total: nominal,
       }).catch(err => {
         logger.error("Failed to send DP received email:", err);
       });
     }

     // Notifikasi email admin (non-blocking)
     prisma.adminuser.findMany({ where: { aktif: true }, select: { email: true, nama: true } })
       .then((admins) => {
         admins.forEach((admin) => {
           if (admin.email) {
             sendAdminEmail("new-payment", {
               adminEmail: admin.email,
               adminName: admin.nama,
               orderId: id,
               total: nominal,
               customerName: u.username,
             }).catch(err => logger.error(`[EMAIL] admin custom order payment to ${admin.email} failed:`, err));
           }
         });
       }).catch(err => logger.error("[EMAIL] admin custom order payment query failed:", err));
     
     return ok(mapCustomOrderToDTO(updated));
  },
);
