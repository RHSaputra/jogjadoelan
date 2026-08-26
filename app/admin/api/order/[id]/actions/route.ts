// POST /api/admin/order/[id]/actions
// body: { action, payload? }

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import {
  mapOrderToLegacy,
  BANK_TO_LOWER,
} from "@/lib/api/order-mapper";
import { sendOrderEmail } from "@/lib/email/send";
import { mutateProductStock } from "@/lib/server/stock-mutation";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm-payment"), catatan: z.string().optional() }),
  z.object({ action: z.literal("reject-payment"), alasan: z.string().min(1) }),
  z.object({ action: z.literal("input-resi"), kurir: z.string().min(1), resi: z.string().min(1) }),
  z.object({ action: z.literal("edit-resi"), kurir: z.string().min(1), resi: z.string().min(1) }),
  z.object({ action: z.literal("delivered") }),
  z.object({ action: z.literal("force-selesai") }),
  z.object({ action: z.literal("cancel"), alasan: z.string().min(1) }),
  z.object({ action: z.literal("edit-catatan"), catatan: z.string() }),
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSyntheticTransferInfo(o: any) {
  const bankKey = o.bankKey ? BANK_TO_LOWER[o.bankKey as "BCA"] : "bca";
  const bankNama = bankKey.toUpperCase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = (o.alamat as any) ?? {};
  return {
    pengirim: { nama: a.nama ?? "Pelanggan", bank: bankNama },
    penerima: { nama: "Jogjadoelan Yogyakarta", lokasi: "Yogyakarta" },
    tujuan: { bank: bankNama, norek: "—", an: "Jogjadoelan Yogyakarta" },
    nominal: o.total,
    validatedAt: new Date().toISOString(),
  };
}

function deriveEstimasiTiba(iso: string) {
  const base = new Date(iso);
  const f = new Date(base); f.setDate(f.getDate() + 3);
  const t = new Date(base); t.setDate(t.getDate() + 5);
  return { from: f.toISOString(), to: t.toISOString() };
}

async function notifyCustomer(userId: string, orderId: string, kind: Parameters<typeof sendOrderEmail>[0], extra?: Partial<{ kurir: string; resi: string; reason: string }>) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true } });
    if (!user?.email) return;
    await sendOrderEmail(kind, {
      recipientEmail: user.email,
      recipientName: user.username,
      orderId,
      ...(extra ?? {}),
    });
  } catch { /* swallow */ }
}

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const me = await requireAdmin();
  const { id } = await ctx.params;
  const body = schema.parse(await req.json());
  const o = await prisma.order.findUnique({
    where: { id },
    include: { orderitem: true, ordertimeline: { orderBy: { at: "asc" } }, payment: true },
  });
  if (!o) return fail(404, "Pesanan tidak ditemukan");
  const now = new Date();

  const include = { orderitem: true, ordertimeline: { orderBy: { at: "asc" as const } }, payment: true } as const;

  // Helper to re-fetch order with aliases
  async function refetch() {
    const fresh = await prisma.order.findUnique({
      where: { id },
      include,
    });
    if (!fresh) return null;
    return {
      ...fresh,
      items: fresh.orderitem,
      timeline: fresh.ordertimeline,
      payments: fresh.payment,
    };
  }

  switch (body.action) {
    case "confirm-payment": {
      if (o.status !== "MENUNGGU_KONFIRMASI") return fail(400, "Status tidak tepat");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transferInfo = (o.transferInfo as any) ?? buildSyntheticTransferInfo(o);
      const pending = await prisma.payment.findFirst({
        where: { orderId: id, status: "PENDING" }, orderBy: { createdAt: "desc" },
      });
      if (pending) {
        await prisma.payment.update({
          where: { id: pending.id },
          data: { status: "VERIFIED", verifiedAt: now, verifiedById: me.id },
        });
      }
      await prisma.order.update({
        where: { id },
        data: {
          status: "DIPROSES",
          transferInfo,
          estimasiProsesHari: o.estimasiProsesHari ?? 2,
          catatanAdmin: body.catatan ?? o.catatanAdmin,
          ordertimeline: {
            create: [
              { id: crypto.randomUUID(), step: "DIKONFIRMASI", label: "Pembayaran Dikonfirmasi", at: now, byAdminId: me.id },
              { id: crypto.randomUUID(), step: "DIPROSES", label: "Pesanan Diproses", at: now, byAdminId: me.id },
            ],
          },
        },
      });
      const u = await refetch();
      notifyCustomer(o.userId, id, "payment-verified");
      notifyCustomer(o.userId, id, "order-diproses");
      return ok(mapOrderToLegacy(u!));
    }

    case "reject-payment": {
      if (o.status !== "MENUNGGU_KONFIRMASI") return fail(400, "Status tidak tepat");
      const pending = await prisma.payment.findFirst({
        where: { orderId: id, status: "PENDING" }, orderBy: { createdAt: "desc" },
      });
      if (pending) {
        await prisma.payment.update({
          where: { id: pending.id },
          data: { status: "REJECTED", alasanTolak: body.alasan, verifiedAt: now, verifiedById: me.id },
        });
      }
      await prisma.order.update({
        where: { id },
        data: {
          status: "MENUNGGU_PEMBAYARAN",
          buktiBayar: null,
          buktiBayarAt: null,
          catatanAdmin: `[BUKTI DITOLAK] ${body.alasan}`,
        },
      });
      const u = await refetch();
      notifyCustomer(o.userId, id, "payment-rejected", { reason: body.alasan });
      return ok(mapOrderToLegacy(u!));
    }

    case "input-resi": {
      if (o.status !== "DIPROSES") return fail(400, "Status harus 'diproses'");
      await prisma.order.update({
        where: { id },
        data: {
          status: "DIKIRIM",
          resi: body.resi,
          ekspedisi: { kurir: body.kurir, resi: body.resi, shippedAt: now.toISOString() },
          estimasiTiba: deriveEstimasiTiba(now.toISOString()),
          ordertimeline: { create: { id: crypto.randomUUID(), step: "DIKIRIM", label: "Pesanan Dikirim", at: now, byAdminId: me.id } },
        },
      });
      const u = await refetch();
      notifyCustomer(o.userId, id, "order-shipped", { kurir: body.kurir, resi: body.resi });
      notifyCustomer(o.userId, id, "order-siap-dikirim");
      return ok(mapOrderToLegacy(u!));
    }

    case "edit-resi": {
      if (o.status !== "DIKIRIM") return fail(400, "Hanya bisa edit resi saat status 'dikirim'");
      await prisma.order.update({
        where: { id },
        data: {
          resi: body.resi,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ekspedisi: { ...((o.ekspedisi as any) ?? {}), kurir: body.kurir, resi: body.resi },
        },
      });
      const u = await refetch();
      notifyCustomer(o.userId, id, "resi-added", { kurir: body.kurir, resi: body.resi });
      return ok(mapOrderToLegacy(u!));
    }

    case "delivered": {
      if (o.status !== "DIKIRIM") return fail(400, "Status harus 'dikirim'");
      await prisma.order.update({
        where: { id },
        data: {
          status: "SELESAI",
          deliveredAt: now,
          konfirmasiDiterimaAt: now,
          ordertimeline: {
            create: [
              { id: crypto.randomUUID(), step: "SAMPAI", label: "Paket Sampai di Tujuan", at: now, byAdminId: me.id },
              { id: crypto.randomUUID(), step: "SELESAI", label: "Selesai (Dikonfirmasi Admin)", at: now, byAdminId: me.id },
            ],
          },
        },
      });
      const u = await refetch();
      notifyCustomer(o.userId, id, "order-completed");
      return ok(mapOrderToLegacy(u!));
    }

    case "force-selesai": {
      if (o.status !== "DIKIRIM") return fail(400, "Status harus 'dikirim'");
      await prisma.order.update({
        where: { id },
        data: {
          status: "SELESAI",
          konfirmasiDiterimaAt: now,
          deliveredAt: o.deliveredAt ?? now,
          ordertimeline: { create: { id: crypto.randomUUID(), step: "SELESAI", label: "Selesai (Diselesaikan Admin)", at: now, byAdminId: me.id } },
        },
      });
      const u = await refetch();
      return ok(mapOrderToLegacy(u!));
    }

    case "cancel": {
      if (["DIKIRIM", "SELESAI", "DIBATALKAN", "KADALUARSA"].includes(o.status))
        return fail(400, "Status tidak bisa dibatalkan");
      // Restore stok (produk + varian) dalam transaksi atomik,
      // menggunakan pattern yang sama dengan customer cancel & cron expire.
      await prisma.$transaction(async (tx) => {
        for (const it of o.orderitem) {
          if (it.produkId) {
            await mutateProductStock(tx, it.produkId, it.ukuran, null, it.qty);
          }
        }
        // Reverse voucher usage jika ada
        if (o.voucherCode) {
          await tx.voucher.update({
            where: { kode: o.voucherCode },
            data: { terpakai: { decrement: 1 } },
          }).catch(() => {});
          await tx.voucherusage.deleteMany({ where: { orderId: id } }).catch(() => {});
        }
        await tx.order.update({
          where: { id },
          data: {
            status: "DIBATALKAN",
            catatanAdmin: `[DIBATALKAN ADMIN] ${body.alasan}`,
            ordertimeline: { create: { id: crypto.randomUUID(), step: "DIBATALKAN", label: "Pesanan Dibatalkan Admin", sub: body.alasan, at: now, byAdminId: me.id } },
          },
        });
      });
      const u = await refetch();
      notifyCustomer(o.userId, id, "order-cancelled", { reason: body.alasan });
      return ok(mapOrderToLegacy(u!));
    }

    case "edit-catatan": {
      await prisma.order.update({
        where: { id },
        data: { catatanAdmin: body.catatan || null },
      });
      const u = await refetch();
      return ok(mapOrderToLegacy(u!));
    }
  }
});