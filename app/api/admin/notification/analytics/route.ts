import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Period = "day" | "week" | "month" | "year";

function getPeriodStart(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "day":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return start;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") || "month") as Period;
  const since = getPeriodStart(period);

  const baseWhere: Prisma.notificationlogWhereInput = {
    created_at: { gte: since },
  };

  const [
    total,
    sent,
    failed,
    pending,
    emailSent,
    waSent,
    broadcastSent,
    delivered,
  ] = await Promise.all([
    prisma.notificationlog.count({ where: baseWhere }),
    prisma.notificationlog.count({ where: { ...baseWhere, status: "sent" } }),
    prisma.notificationlog.count({ where: { ...baseWhere, status: "failed" } }),
    prisma.notificationlog.count({ where: { ...baseWhere, status: "pending" } }),
    prisma.notificationlog.count({
      where: { ...baseWhere, channel: "email", status: "sent" },
    }),
    prisma.notificationlog.count({
      where: { ...baseWhere, channel: "whatsapp", status: "sent" },
    }),
    prisma.notificationlog.count({
      where: {
        ...baseWhere,
        template: { startsWith: "broadcast:" },
        status: "sent",
      },
    }),
    prisma.notificationlog.count({
      where: {
        ...baseWhere,
        status: { in: ["delivered", "read"] },
      },
    }),
  ]);

  const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 0;
  const openRate =
    sent > 0 ? Math.round((delivered / sent) * 100) : 0;

  return ok({
    period,
    since: since.toISOString(),
    total,
    sent,
    failed,
    pending,
    emailSent,
    waSent,
    broadcastSent,
    deliveryRate,
    openRate,
  });
});
