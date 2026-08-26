// GET /api/admin/counters — 1 endpoint untuk semua badge counter sidebar admin
// HIGH FIX: Menggabungkan 4 API call terpisah (order stats, custom, komplain, chat)
// yang sebelumnya dipanggil setiap 30 detik menjadi 1 request paralel.
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

export const GET = handler(async () => {
  await requireAdmin();

  const [orderStats, customStats, komplainStats, chatStats, ulasanStats, refundCount, tukarCount, stokKritisCount] = await Promise.all([
    // Order stats: berapa menunggu konfirmasi & diproses
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: {
        status: { in: ["MENUNGGU_KONFIRMASI", "DIPROSES", "MENUNGGU_PEMBAYARAN"] },
      },
    }),
    // Custom order: berapa perlu estimasi, verifikasi, siap dilunasi
    prisma.customorder.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: {
        status: {
          in: [
            "MENUNGGU_ESTIMASI",
            "MENUNGGU_PERSETUJUAN",
            "MENUNGGU_VERIFIKASI_DP",
            "MENUNGGU_VERIFIKASI_LUNAS",
            "MENUNGGU_VERIFIKASI_PELUNASAN",
            "SIAP_DILUNASI",
          ],
        },
      },
    }),
    // Komplain: berapa baru dan ditinjau
    prisma.komplain.count({
      where: { status: { in: ["BARU", "DITINJAU"] } },
    }),
    // Chat: berapa user message belum dibaca admin
    prisma.chatsupportmessage.groupBy({
      by: ["userId"],
      where: { fromRole: "USER", status: { not: "READ" } },
      _count: { _all: true },
    }),
    // Ulasan: pending reviews (not replied and not hidden)
    prisma.ulasan.count({
      where: { balasan: null, isHidden: false },
    }),
    // Refund: pending review, received by admin, or waiting for transfer
    prisma.refund.count({
      where: {
        status: {
          in: ["MENUNGGU_REVIEW_ADMIN", "DITERIMA_ADMIN", "TRANSFER_DIKIRIM"],
        },
      },
    }),
    // Tukar: pending review, received by admin, or waiting to ship exchange item
    prisma.tukar.count({
      where: {
        status: {
          in: ["MENUNGGU_REVIEW_ADMIN", "DITERIMA_ADMIN", "VARIAN_BARU_DIKIRIM"],
        },
      },
    }),
    // Stok kritis (stok <= 2)
    prisma.produkvarian.count({
      where: {
        stok: { lte: 2 },
      },
    }),
  ]);

  // Parse order stats
  const orderMap = Object.fromEntries(
    orderStats.map((r) => [r.status, r._count._all])
  );
  const validasi = orderMap["MENUNGGU_KONFIRMASI"] ?? 0;
  const penjualan = orderMap["DIPROSES"] ?? 0;

  // Parse custom stats
  const customMap = Object.fromEntries(
    customStats.map((r) => [r.status, r._count._all])
  );
  const customCount =
    (customMap["MENUNGGU_ESTIMASI"] ?? 0) +
    (customMap["MENUNGGU_PERSETUJUAN"] ?? 0) +
    (customMap["MENUNGGU_VERIFIKASI_DP"] ?? 0) +
    (customMap["MENUNGGU_VERIFIKASI_LUNAS"] ?? 0) +
    (customMap["MENUNGGU_VERIFIKASI_PELUNASAN"] ?? 0) +
    (customMap["SIAP_DILUNASI"] ?? 0);

  // Chat pending = jumlah user yang punya unread messages
  const chatPending = chatStats.length;
  const returnCount = refundCount + tukarCount;

  const total = validasi + penjualan + customCount + komplainStats + chatPending + ulasanStats + returnCount + stokKritisCount;

  return ok({
    chat: chatPending,
    validasi,
    penjualan,
    custom: customCount,
    komplain: komplainStats,
    ulasan: ulasanStats,
    return: returnCount,
    stok: stokKritisCount,
    total,
  });
});
