// app/api/admin/whatsapp-transactional/route.ts
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const tipe = url.searchParams.get("tipe") || "";
  const status = url.searchParams.get("status") || "";

  const where: Prisma.notificationlogWhereInput = {};

  if (search) {
    where.OR = [
      { recipient: { contains: search } },
      { message: { contains: search } },
      { subject: { contains: search } },
    ];
  }
  if (tipe) {
    where.template = tipe;
  }
  if (status) {
    where.status = status.toLowerCase();
  }

  const logs = await prisma.notificationlog.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: 100,
  });

  const formattedLogs = logs.map((log) => {
    let errorMsg: Prisma.JsonValue | null = null;
    if (log.provider_response && typeof log.provider_response === "object" && !Array.isArray(log.provider_response)) {
      errorMsg = log.provider_response.error || null;
    }
    return {
      id: log.id,
      channel: log.channel === "whatsapp" ? ("wa" as const) : ("email" as const),
      recipient: log.recipient,
      nama: log.recipient.split("@")[0] || "User",
      tipe: log.template || "custom",
      pesan: log.message,
      status: log.status.toUpperCase() as "PENDING" | "SENT" | "FAILED",
      error: errorMsg,
      retries: 0,
      sentAt: log.sent_at,
      createdAt: log.created_at,
    };
  });

  return ok({ logs: formattedLogs });
});
