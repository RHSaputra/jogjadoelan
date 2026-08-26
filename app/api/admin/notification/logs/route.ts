// app/api/admin/notification/logs/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { Prisma } from "@prisma/client";
import type { NotificationSettings } from "@/lib/notification-dispatcher";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const channel = searchParams.get("channel") || "";
  const status = searchParams.get("status") || "";
  const template = searchParams.get("template") || "";
  
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.max(1, Number(searchParams.get("limit")) || 50);
  const skip = (page - 1) * limit;

  const where: Prisma.notificationlogWhereInput = {};

  if (search) {
    where.OR = [
      { recipient: { contains: search } },
      { subject: { contains: search } },
      { message: { contains: search } },
    ];
  }
  if (channel) {
    where.channel = channel;
  }
  if (status) {
    where.status = status;
  }
  if (template) {
    where.template = template;
  }

  const [total, logs] = await Promise.all([
    prisma.notificationlog.count({ where }),
    prisma.notificationlog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return ok({
    logs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

export const POST = handler(async (req: NextRequest) => {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const { logId } = body;

  if (!logId) return fail(400, "Log ID wajib diisi");

  const log = await prisma.notificationlog.findUnique({
    where: { id: logId },
  });

  if (!log) return fail(404, "Log tidak ditemukan");

  // Re-dispatch using the dispatcher
  const { dispatchNotification } = await import("@/lib/notification-dispatcher");
  
  const overrideChannel = {
    email: log.channel === "email",
    whatsapp: log.channel === "whatsapp",
  };

  // Extract reset URL if present in log message text
  let resetUrl: string | undefined = undefined;
  if (log.message) {
    const match = log.message.match(/https?:\/\/[^\s]+/);
    if (match) resetUrl = match[0];
  }

  const results = await dispatchNotification(
    (log.template || "otp") as keyof NotificationSettings,
    {
      recipientEmail: log.channel === "email" ? log.recipient : "",
      recipientPhone: log.channel === "whatsapp" ? log.recipient : "",
      recipientName: "Customer",
      orderId: log.related_order_id || undefined,
      userId: log.related_user_id || undefined,
      resetUrl,
      otp: log.template === "otp" && log.message.match(/\b\d{4,6}\b/)?.[0] || undefined,
    },
    overrideChannel
  );

  const res = log.channel === "email" ? results.email : results.whatsapp;

  if (res?.success) {
    // Mark previous log as retried / status sent
    await prisma.notificationlog.update({
      where: { id: logId },
      data: { status: "sent", failed_at: null, sent_at: new Date() }
    }).catch(() => {});

    return ok({ message: "Kirim ulang berhasil", res });
  } else {
    return fail(500, res?.error || "Gagal mengirim ulang");
  }
});
