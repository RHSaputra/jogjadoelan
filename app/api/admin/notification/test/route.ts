// app/api/admin/notification/test/route.ts
import { NextRequest } from "next/server";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email/provider";
import { sendWhatsapp, normalizeNoHp } from "@/lib/whatsapp";
import { prisma } from "@/lib/db";

export const POST = handler(async (req: NextRequest) => {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const { type, recipientEmail, recipientPhone, subject, message } = body;

  if (!type) return fail(400, "Tipe tes wajib diisi");

  const startTime = Date.now();
  let status: "sent" | "failed" | "skipped" = "failed";
  let response: unknown = null;
  let requestPayload: Record<string, unknown> = {};
  let channel: "email" | "whatsapp" = "email";
  let recipient = "";
  let logSubject = "";
  let logMessage = "";

  try {
    if (type === "email" || type === "broadcast-email") {
      if (!recipientEmail) return fail(400, "Email tujuan wajib diisi");
      channel = "email";
      recipient = recipientEmail;
      logSubject = subject || "Jogjadoelan Test Email";
      logMessage =
        message ||
        "<p>Ini adalah email uji coba dari Notification Testing Center Jogjadoelan.</p>";

      requestPayload = { to: recipientEmail, subject: logSubject, html: logMessage };
      const result = await sendEmail({
        to: recipientEmail,
        subject: logSubject,
        html: logMessage,
        tag: type,
      });
      status = result.success ? "sent" : result.skipped ? "skipped" : "failed";
      response = result;
    } else if (type === "whatsapp" || type === "broadcast-whatsapp") {
      if (!recipientPhone) return fail(400, "Nomor WhatsApp tujuan wajib diisi");
      channel = "whatsapp";
      recipient = normalizeNoHp(recipientPhone);
      logSubject = "Test WhatsApp";
      logMessage =
        message ||
        "Ini adalah pesan WhatsApp uji coba dari Notification Testing Center Jogjadoelan.";

      requestPayload = { phone: recipientPhone, message: logMessage };
      const result = await sendWhatsapp(recipientPhone, logMessage);
      status = result.success ? "sent" : "failed";
      response = result;
    } else {
      return fail(400, `Tipe tes ${type} tidak valid`);
    }
  } catch (err: unknown) {
    status = "failed";
    response = { error: err instanceof Error ? err.message : String(err) };
  }

  const durationMs = Date.now() - startTime;
  const now = new Date();

  const log = await prisma.notificationlog.create({
    data: {
      channel,
      recipient,
      template: `test:${type}`,
      subject: logSubject,
      message: logMessage,
      status,
      provider: channel === "email" ? "resend" : "fonnte",
      provider_response: response as object,
      sent_at: status === "sent" ? now : null,
      failed_at: status === "failed" ? now : null,
    },
  });

  return ok({
    request: requestPayload,
    response,
    status: status === "sent" ? "success" : status === "skipped" ? "skipped" : "failed",
    responseTime: `${durationMs}ms`,
    logId: log.id,
    hint:
      status === "skipped"
        ? "Domain belum diverifikasi. Tambahkan email ke EMAIL_ALLOWED_TEST_RECIPIENTS di .env"
        : undefined,
  });
});
