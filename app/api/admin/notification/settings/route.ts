// app/api/admin/notification/settings/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { getEmailSendPolicy } from "@/lib/email/domain-policy";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireAdmin();

  // 1. Fetch channel configs
  const row = await prisma.sitesetting.findUnique({
    where: { key: "notification_channels" },
  });
  const channels = row?.value || null;
  const resendStatus = await getEmailSendPolicy();

  return ok({
    channels,
    resendStatus: {
      configured: resendStatus.configured,
      fromEmail: resendStatus.fromEmail,
      isSandbox: resendStatus.isSandbox,
      verified: resendStatus.domainVerified,
      details: resendStatus.message,
      externalSendingAllowed: resendStatus.externalSendingAllowed,
      allowedTestEmails: resendStatus.allowedTestEmails,
    },
  });
});

export const PUT = handler(async (req: NextRequest) => {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  
  const row = await prisma.sitesetting.upsert({
    where: { key: "notification_channels" },
    update: { value: body },
    create: { key: "notification_channels", value: body },
  });

  return ok({ channels: row.value });
});
