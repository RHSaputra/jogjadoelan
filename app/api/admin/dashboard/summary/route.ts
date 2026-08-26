import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { unstable_cache } from "next/cache";

function startOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function daysAgo(n: number) {
  const x = startOfDay(); x.setDate(x.getDate() - n); return x;
}

const getCachedSummaryData = unstable_cache(
  async () => {
    const today = startOfDay();
    const last7 = daysAgo(6);
    const last30 = daysAgo(29);

    const [
      revToday, rev7, rev30, revAll,
      countToday, count7, count30, countAll,
      countMenungguPembayaran, countMenungguVerif, countDiproses, countDikirim,
      newUser7, newUser30, totalUser,
      komplainBaru, refundReview, tukarReview,
      lowStockCount,
    ] = await Promise.all([
      prisma.order.aggregate({ where: { status: "SELESAI", konfirmasiDiterimaAt: { gte: today } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { status: "SELESAI", konfirmasiDiterimaAt: { gte: last7 } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { status: "SELESAI", konfirmasiDiterimaAt: { gte: last30 } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { status: "SELESAI" }, _sum: { total: true } }),

      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { createdAt: { gte: last7 } } }),
      prisma.order.count({ where: { createdAt: { gte: last30 } } }),
      prisma.order.count(),

      prisma.order.count({ where: { status: "MENUNGGU_PEMBAYARAN" } }),
      prisma.order.count({ where: { status: "MENUNGGU_KONFIRMASI" } }),
      prisma.order.count({ where: { status: "DIPROSES" } }),
      prisma.order.count({ where: { status: "DIKIRIM" } }),

      prisma.user.count({ where: { createdAt: { gte: last7 } } }),
      prisma.user.count({ where: { createdAt: { gte: last30 } } }),
      prisma.user.count({ where: {} }),

      prisma.komplain.count({ where: { status: { in: ["BARU", "DITINJAU"] } } }),
      prisma.refund.count({ where: { status: "MENUNGGU_REVIEW_ADMIN" } }),
      prisma.tukar.count({ where: { status: "MENUNGGU_REVIEW_ADMIN" } }),

      prisma.produk.count({ where: { stok: { lte: 5 } } }),
    ]);

    return {
      revenue: {
        today: (revToday._sum?.total ?? 0),
        last7: (rev7._sum?.total ?? 0),
        last30: (rev30._sum?.total ?? 0),
        allTime: (revAll._sum?.total ?? 0),
      },
      orders: {
        today: countToday, last7: count7, last30: count30, allTime: countAll,
        pending: {
          menungguPembayaran: countMenungguPembayaran,
          menungguVerifikasi: countMenungguVerif,
          diproses: countDiproses,
          dikirim: countDikirim,
        },
      },
      customers: { new7: newUser7, new30: newUser30, total: totalUser },
      urgent: {
        komplainBaru, refundReview, tukarReview, lowStockCount,
        totalAction: komplainBaru + refundReview + tukarReview + countMenungguVerif,
      },
    };
  },
  ["dashboard-summary-cache-v2"],
  { revalidate: 30 }
);

export const GET = handler(async () => {
  await requireAdmin();
  const data = await getCachedSummaryData();
  return ok(data);
});