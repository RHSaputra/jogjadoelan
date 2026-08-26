// POST /api/admin/custom/[id]/action  → semua aksi admin custom order
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { mapCustomOrderToDTO } from "@/lib/api/custom-mapper";
import { sendOrderEmail } from "@/lib/email/send";
import type { customorder_status as CustomStatus, notifikasi_type as NotifType } from "@prisma/client";

const EstimasiItem = z.object({
  label: z.string().min(1), sub: z.string().default(""),
  harga: z.number().int().nonnegative(), hari: z.number().int().nonnegative(),
});

const Body = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("set-estimasi"),
    items: z.array(EstimasiItem).min(1),
    catatan: z.string().max(1000).optional().nullable(),
    tanggalMulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    tanggalSelesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  z.object({ kind: z.literal("verify-dp") }),
  z.object({ kind: z.literal("verify-lunas") }),
  z.object({ kind: z.literal("verify-pelunasan") }),
  z.object({ kind: z.literal("reject-order"), alasan: z.string().min(1).max(500) }),
  z.object({ kind: z.literal("reject-dp"), alasan: z.string().min(1).max(500) }),
  z.object({ kind: z.literal("reject-lunas"), alasan: z.string().min(1).max(500) }),
  z.object({ kind: z.literal("reject-pelunasan"), alasan: z.string().min(1).max(500) }),
  z.object({ kind: z.literal("mark-siap-dilunasi") }),
  z.object({ kind: z.literal("mark-dikirim") }),
  z.object({ kind: z.literal("mark-selesai") }),
  z.object({ kind: z.literal("toggle-late"), val: z.boolean().optional() }),
  z.object({ kind: z.literal("append-catatan"), catatan: z.string().min(1).max(2000) }),
  z.object({
    kind: z.literal("add-progress"),
    tahap: z.string().min(1).max(100),
    deskripsi: z.string().max(500).optional().nullable(),
    fotoPath: z.string().optional().nullable(),
  }),
  z.object({ kind: z.literal("delete-progress"), updateId: z.string().min(1) }),
]);

function notifMap(kind: string): { title: string; type: NotifType; link?: string } | null {
  switch (kind) {
    case "set-estimasi": return { title: "Estimasi & Harga Siap", type: "CUSTOM", link: "/custom/estimasi" };
    case "verify-dp": return { title: "DP Disetujui — Produksi Dimulai", type: "PEMBAYARAN" };
    case "verify-lunas": return { title: "Pembayaran Lunas Disetujui", type: "PEMBAYARAN" };
    case "verify-pelunasan": return { title: "Pelunasan Disetujui — Order Selesai", type: "PEMBAYARAN" };
    case "reject-dp": return { title: "Bukti DP Ditolak", type: "PEMBAYARAN" };
    case "reject-lunas": return { title: "Bukti Lunas Ditolak", type: "PEMBAYARAN" };
    case "reject-pelunasan": return { title: "Bukti Pelunasan Ditolak", type: "PEMBAYARAN" };
    case "mark-siap-dilunasi": return { title: "Helm Custom Siap!", type: "CUSTOM" };
    case "mark-dikirim": return { title: "Helm Custom Dikirim", type: "PENGIRIMAN" };
    case "mark-selesai": return { title: "Pesanan Custom Selesai", type: "CUSTOM" };
    case "toggle-late": return { title: "Pemberitahuan Keterlambatan", type: "CUSTOM" };
    case "add-progress": return { title: "Update Produksi Baru", type: "CUSTOM" };
    default: return null;
  }
}

async function pushNotif(userId: string, body: string, n: NonNullable<ReturnType<typeof notifMap>>, link?: string) {
  await prisma.notifikasi.create({
    data: { userId, title: n.title, body, type: n.type, link: link ?? n.link ?? null },
  }).catch(err => console.error("[NOTIF] pushNotif failed:", err));
}

export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(422, "Payload tidak valid");
    const b = parsed.data;

    const o = await prisma.customorder.findUnique({ where: { id } });
    if (!o) return fail(404, "Custom order tidak ditemukan");

    let nextStatus: CustomStatus | undefined;
    let dataPatch: Record<string, unknown> = {};
    let notifBody = "";

    switch (b.kind) {
      case "set-estimasi": {
        if (!["SUBMITTED", "MENUNGGU_ESTIMASI", "DRAFT"].includes(o.status))
          return fail(400, "Tidak bisa set estimasi di status ini");
        const total = b.items.reduce((s, it) => s + it.harga, 0);
        nextStatus = "MENUNGGU_PERSETUJUAN";
        dataPatch = {
          estimasi: { items: b.items, total },
          estimasiTanggal: b.tanggalMulai && b.tanggalSelesai
            ? { mulai: b.tanggalMulai, selesai: b.tanggalSelesai }
            : null,
          quotedByAdminAt: new Date(),
          quotedCatatan: b.catatan?.trim() || null,
        };
        notifBody = `Custom order ${id}: estimasi Rp ${total.toLocaleString("id-ID")}. Silakan setujui untuk lanjut bayar.`;
        break;
      }
      case "verify-dp": {
        if (o.status !== "MENUNGGU_VERIFIKASI_DP") return fail(400, "Bukan status verifikasi DP");
        nextStatus = "DIPROSES";
        await prisma.payment.updateMany({
          where: { customOrderId: id, type: "DP", status: "PENDING" },
          data: { status: "VERIFIED", verifiedAt: new Date(), verifiedById: admin.id },
        });
        notifBody = `Custom order ${id} masuk tahap produksi.`;
        break;
      }
      case "verify-lunas": {
        if (o.status !== "MENUNGGU_VERIFIKASI_LUNAS") return fail(400, "Bukan status verifikasi Lunas");
        nextStatus = "DIPROSES";
        await prisma.payment.updateMany({
          where: { customOrderId: id, type: "FULL", status: "PENDING" },
          data: { status: "VERIFIED", verifiedAt: new Date(), verifiedById: admin.id },
        });
        notifBody = `Custom order ${id} masuk tahap produksi.`;
        break;
      }
      case "verify-pelunasan": {
        if (o.status !== "MENUNGGU_VERIFIKASI_PELUNASAN") return fail(400, "Bukan status verifikasi Pelunasan");
        // Pelunasan terverifikasi → kembali ke DIPROSES agar admin bisa kirim
        nextStatus = "DIPROSES";
        await prisma.payment.updateMany({
          where: { customOrderId: id, type: "PELUNASAN", status: "PENDING" },
          data: { status: "VERIFIED", verifiedAt: new Date(), verifiedById: admin.id },
        });
        dataPatch = { sisaAmount: 0 };
        notifBody = `Pelunasan custom order ${id} disetujui. Silakan siapkan pengiriman.`;
        break;
      }
      case "reject-order": {
        if (["SELESAI", "DIKIRIM"].includes(o.status)) return fail(400, "Tidak bisa ditolak di status ini");
        nextStatus = "REJECTED";
        dataPatch = { notes: `${o.notes ?? ""}\n\n[DITOLAK ADMIN] ${b.alasan}`.trim() };
        notifBody = `Custom order ${id} ditolak admin. Alasan: ${b.alasan.slice(0, 100)}`;
        break;
      }
      case "reject-dp":
      case "reject-lunas":
      case "reject-pelunasan": {
        const map = {
          "reject-dp": { from: "MENUNGGU_VERIFIKASI_DP", to: "MENUNGGU_PEMBAYARAN", payType: "DP", tag: "DP" },
          "reject-lunas": { from: "MENUNGGU_VERIFIKASI_LUNAS", to: "MENUNGGU_PEMBAYARAN", payType: "FULL", tag: "LUNAS" },
          "reject-pelunasan": { from: "MENUNGGU_VERIFIKASI_PELUNASAN", to: "SIAP_DILUNASI", payType: "PELUNASAN", tag: "PELUNASAN" },
        } as const;
        const m = map[b.kind];
        if (o.status !== m.from) return fail(400, "Status tidak sesuai");
        nextStatus = m.to as CustomStatus;
        await prisma.payment.updateMany({
          where: { customOrderId: id, type: m.payType, status: "PENDING" },
          data: { status: "REJECTED", verifiedAt: new Date(), verifiedById: admin.id, alasanTolak: b.alasan },
        });
        dataPatch = { notes: `${o.notes ?? ""}\n\n[${m.tag} DITOLAK] ${b.alasan}`.trim() };
        notifBody = `Bukti ${m.tag} ${id} ditolak. Alasan: ${b.alasan.slice(0, 100)}. Upload ulang.`;
        break;
      }
      case "mark-siap-dilunasi": {
        if (o.status !== "DIPROSES" || o.paymentType !== "DP") return fail(400, "Tidak boleh di status ini");
        nextStatus = "SIAP_DILUNASI";
        notifBody = `Custom order ${id} siap! Silakan lunasi sisa pembayaran.`;
        break;
      }
      case "mark-dikirim": {
        // Hanya bisa kirim dari DIPROSES (setelah produksi selesai / pelunasan verified)
        if (o.status !== "DIPROSES") return fail(400, "Pesanan harus dalam status diproduksi terlebih dahulu");
        nextStatus = "DIKIRIM";
        notifBody = `Custom order ${id} sudah dikirim.`;
        break;
      }
      case "mark-selesai": {
        // Hanya bisa selesai dari DIKIRIM (konfirmasi terima by customer atau manual admin)
        if (o.status !== "DIKIRIM") return fail(400, "Pesanan harus dikirim terlebih dahulu");
        nextStatus = "SELESAI";
        notifBody = `Custom order ${id} ditandai selesai. Jangan lupa kasih ulasan!`;
        break;
      }
      case "toggle-late": {
        const next = b.val ?? !o.isLate;
        dataPatch = { isLate: next };
        if (next) notifBody = `Custom order ${id} mengalami keterlambatan produksi. Mohon maaf.`;
        break;
      }
      case "append-catatan": {
        dataPatch = { notes: `${o.notes ?? ""}\n\n[ADMIN] ${b.catatan}`.trim() };
        break;
      }
      case "add-progress": {
        if (!["DIPROSES", "SIAP_DILUNASI", "DIKIRIM"].includes(o.status))
          return fail(400, "Tidak boleh tambah progress di status ini");
        await prisma.customprogress.create({
          data: {
            customOrderId: id, tahap: b.tahap, deskripsi: b.deskripsi ?? null,
            fotoPath: b.fotoPath ?? null, byAdminId: admin.id,
          },
        });
        notifBody = b.deskripsi?.slice(0, 120) ?? `Update progress baru: ${b.tahap}`;
        break;
      }
      case "delete-progress": {
        await prisma.customprogress.delete({ where: { id: b.updateId } }).catch(() => {});
        break;
      }
    }

    const updated = await prisma.customorder.update({
      where: { id },
      data: { ...dataPatch, ...(nextStatus ? { status: nextStatus } : {}) },
      include: {
        user: { select: { id: true, username: true, email: true } },
        customprogress: { orderBy: { createdAt: "asc" } },
        payment: { orderBy: { createdAt: "asc" } },
      },
    });

    if (notifBody) {
      const n = notifMap(b.kind);
      if (n) await pushNotif(updated.userId, notifBody, n, `/custom/${id}`);
    }

    // Kirim email notification ke customer (non-blocking)
    if (notifBody) {
      prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true, username: true } })
        .then((user) => {
          if (!user?.email) return;
          const n = notifMap(b.kind);
          if (!n) return;
          const emailKind = mapCustomActionToEmailKind(b.kind);
          if (emailKind) {
            const total = (updated.estimasi as { total?: number } | null)?.total ?? updated.hargaFinal ?? 0;
            const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            const sisaAmount = updated.sisaAmount ?? updated.hargaFinal ?? 0;
            const reason = (b as { alasan?: string }).alasan ?? undefined;

            sendOrderEmail(emailKind, {
              recipientEmail: user.email,
              recipientName: user.username,
              orderId: id,
              total,
              expiredAt,
              sisaAmount,
              daysLeft: 3,
              reason,
            });
          }
        }).catch(err => console.error("[EMAIL] custom order email failed:", err));
    }

    return ok(mapCustomOrderToDTO(updated));
  },
);

/** Map custom admin action kind ke OrderEmailKind */
function mapCustomActionToEmailKind(kind: string): Parameters<typeof sendOrderEmail>[0] | null {
  switch (kind) {
    case "set-estimasi": return "order-created";
    case "verify-dp":
    case "verify-lunas": return "payment-verified";
    case "verify-pelunasan": return "pelunasan-success";
    case "reject-dp":
    case "reject-lunas":
    case "reject-pelunasan": return "pelunasan-failed";
    case "mark-siap-dilunasi": return "pelunasan-reminder";
    case "mark-dikirim": return "order-siap-dikirim";
    case "mark-selesai": return "order-completed";
    case "reject-order": return "order-cancelled";
    case "add-progress": return "order-diproses";
    default: return null;
  }
}
