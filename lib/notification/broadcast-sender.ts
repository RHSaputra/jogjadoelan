import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/provider";
import { getEmailSendPolicy, canSendToRecipient } from "@/lib/email/domain-policy";
import { sendWhatsapp } from "@/lib/whatsapp";
import { normalizeNoHp } from "@/lib/phone-utils";
import { resolveFonnteImageUrl } from "@/lib/fonnte-utils";
import { compileMessage, type BroadcastRecipient } from "@/lib/notification/message-compiler";

export type { BroadcastRecipient };
export { compileMessage };

export interface BroadcastConfig {
  id: string;
  channel: string;
  judul: string;
  pesan: string;
  gambar?: string | null;
}

type BroadcastRecipientWithUser = BroadcastRecipient & { userId?: string | null };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function writeNotificationLog(params: {
  channel: "email" | "whatsapp" | "in-app";
  recipient: string;
  template: string;
  subject: string;
  message: string;
  status: "sent" | "failed" | "skipped";
  provider: "resend" | "fonnte" | "internal";
  provider_response: unknown;
  userId?: string | null;
}): Promise<void> {
  try {
    await prisma.notificationlog.create({
      data: {
        channel: params.channel,
        recipient: params.recipient,
        template: params.template,
        subject: params.subject,
        message: params.message,
        status: params.status,
        provider: params.provider,
        provider_response: params.provider_response as object,
        related_user_id: params.userId || null,
        sent_at: params.status === "sent" ? new Date() : null,
        failed_at: params.status === "failed" ? new Date() : null,
      },
    });
  } catch {
    /* non-blocking audit log */
  }
}

async function sendWithRetry(
  sendFn: () => Promise<{ success: boolean; error?: string; reason?: string; id?: string; messageId?: string }>,
  maxAttempts = 3
): Promise<{ success: boolean; error: string; response: unknown }> {
  let error = "";
  let response: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await sendFn();
    response = result;
    if (result.success) {
      return { success: true, error: "", response };
    }
    error = result.error || result.reason || "Gagal mengirim";
    if (attempt < maxAttempts) await sleep(1500);
  }

  return { success: false, error, response };
}

async function sendWaChannel(
  broadcast: BroadcastConfig,
  recipient: BroadcastRecipient,
  compiledMessage: string
): Promise<{ success: boolean; error?: string }> {
  const target = normalizeNoHp(recipient.noHp || "");
  if (!target) {
    return { success: false, error: "Nomor WhatsApp tidak tersedia" };
  }

  const imageUrl = resolveFonnteImageUrl(broadcast.gambar);
  const imageSkipped = broadcast.gambar && !imageUrl;

  const { success, error, response } = await sendWithRetry(() =>
    sendWhatsapp(target, compiledMessage, imageUrl)
  );

  await writeNotificationLog({
    channel: "whatsapp",
    recipient: target,
    template: `broadcast:${broadcast.id}`,
    subject: broadcast.judul,
    message: compiledMessage,
    status: success ? "sent" : "failed",
    provider: "fonnte",
    provider_response: success
      ? { ...(response as object), imageSkipped: imageSkipped ? broadcast.gambar : undefined }
      : { error, imageSkipped: imageSkipped ? broadcast.gambar : undefined },
    userId: recipient.userId,
  });

  if (!success) {
    return { success: false, error: error || "Gagal mengirim WhatsApp" };
  }
  return { success: true };
}

async function sendEmailChannel(
  broadcast: BroadcastConfig,
  recipient: BroadcastRecipient,
  compiledMessage: string
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const target = recipient.email || "";
  if (!target) {
    return { success: false, error: "Email tidak tersedia" };
  }

  const policy = await getEmailSendPolicy();
  const check = canSendToRecipient(target, policy);

  if (!check.allowed) {
    await writeNotificationLog({
      channel: "email",
      recipient: target,
      template: `broadcast:${broadcast.id}`,
      subject: broadcast.judul,
      message: compiledMessage,
      status: "skipped",
      provider: "resend",
      provider_response: { reason: check.reason, mode: check.mode, policy },
      userId: recipient.userId,
    });
    return { success: false, error: check.reason, skipped: true };
  }

  const html = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
  <h2 style="color: #FF6B1A; border-bottom: 2px solid #FF6B1A; padding-bottom: 10px; margin-top: 0;">${broadcast.judul}</h2>
  <div style="white-space: pre-wrap; font-size: 14px;">${compiledMessage}</div>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 11px; color: #999; text-align: center;">Email ini dikirim otomatis oleh Jogjadoelan. Terima kasih.</p>
</div>`;

  const { success, error, response } = await sendWithRetry(() =>
    sendEmail({ to: target, subject: broadcast.judul, html, tag: "broadcast" })
  );

  await writeNotificationLog({
    channel: "email",
    recipient: target,
    template: `broadcast:${broadcast.id}`,
    subject: broadcast.judul,
    message: compiledMessage,
    status: success ? "sent" : "failed",
    provider: "resend",
    provider_response: success ? { ...(response as object), mode: check.mode } : { error, mode: check.mode },
    userId: recipient.userId,
  });

  if (!success) {
    return { success: false, error: error || "Gagal mengirim email" };
  }
  return { success: true };
}

async function sendNotifChannel(
  broadcast: BroadcastConfig,
  recipient: BroadcastRecipient,
  compiledMessage: string
): Promise<{ success: boolean; error?: string }> {
  if (!recipient.userId) {
    return { success: false, error: "User ID tidak ditemukan — in-app hanya untuk customer terdaftar" };
  }

  try {
    await prisma.notifikasi.create({
      data: {
        userId: recipient.userId,
        type: "PROMO",
        title: broadcast.judul,
        body: compiledMessage,
        link: "/promo",
      },
    });

    await writeNotificationLog({
      channel: "in-app",
      recipient: recipient.userId,
      template: `broadcast:${broadcast.id}`,
      subject: broadcast.judul,
      message: compiledMessage,
      status: "sent",
      provider: "internal",
      provider_response: { userId: recipient.userId },
      userId: recipient.userId,
    });

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Gagal membuat notifikasi in-app";
    await writeNotificationLog({
      channel: "in-app",
      recipient: recipient.userId,
      template: `broadcast:${broadcast.id}`,
      subject: broadcast.judul,
      message: compiledMessage,
      status: "failed",
      provider: "internal",
      provider_response: { error: errorMsg },
      userId: recipient.userId,
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Send broadcast message to a single recipient.
 * Hybrid mode sends WA and Email independently — one failure does not block the other.
 */
export async function sendBroadcastToRecipient(
  broadcast: BroadcastConfig,
  recipient: BroadcastRecipientWithUser
): Promise<{ success: boolean; error?: string }> {
  const compiledMessage = compileMessage(broadcast.pesan, recipient);
  const channel = broadcast.channel;

  if (channel === "hybrid") {
    const errors: string[] = [];
    let anySuccess = false;

    if (recipient.noHp) {
      const wa = await sendWaChannel(broadcast, recipient, compiledMessage);
      if (wa.success) anySuccess = true;
      else if (wa.error) errors.push(`WA: ${wa.error}`);
    }
    if (recipient.email) {
      const em = await sendEmailChannel(broadcast, recipient, compiledMessage);
      if (em.success) anySuccess = true;
      else if (em.error && !em.skipped) errors.push(`Email: ${em.error}`);
      else if (em.skipped) errors.push(`Email: ${em.error}`);
    }

    if (!recipient.noHp && !recipient.email) {
      return { success: false, error: "Tidak ada channel yang tersedia untuk penerima ini" };
    }

    return {
      success: anySuccess,
      error: anySuccess ? undefined : errors.join("; ") || "Semua channel gagal dikirim",
    };
  }

  if (channel === "wa") {
    const wa = await sendWaChannel(broadcast, recipient, compiledMessage);
    return { success: wa.success, error: wa.error };
  }

  if (channel === "email") {
    const em = await sendEmailChannel(broadcast, recipient, compiledMessage);
    return { success: em.success, error: em.error };
  }

  if (channel === "notif") {
    const notif = await sendNotifChannel(broadcast, recipient, compiledMessage);
    return { success: notif.success, error: notif.error };
  }

  return { success: false, error: `Channel tidak dikenal: ${channel}` };
}
