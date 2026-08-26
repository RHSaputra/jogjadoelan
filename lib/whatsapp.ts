// lib/whatsapp.ts
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { toWhatsappFormat } from "@/lib/phone-utils";
import { resolveFonnteImageUrl } from "@/lib/fonnte-utils";

export { normalizeNoHp, toWhatsappFormat } from "@/lib/phone-utils";

/**
 * Wait for a specific duration in milliseconds
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface FonnteSendResponse {
  status: boolean;
  reason?: string;
  id?: string[];
  text?: string[];
}

/**
 * Send a message via Fonnte API directly
 */
export async function sendWhatsapp(
  noHp: string,
  message: string,
  imageUrl?: string
): Promise<{ success: boolean; reason: string; id?: string }> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    logger.error("[WHATSAPP] FONNTE_TOKEN is not defined in environment variables");
    return { success: false, reason: "FONNTE_TOKEN is missing on server" };
  }

  const target = toWhatsappFormat(noHp);
  if (!target) {
    return { success: false, reason: "Phone number is empty or invalid" };
  }

  try {
    const payload = new URLSearchParams();
    payload.append("target", target);
    payload.append("message", message);

    const safeImageUrl = resolveFonnteImageUrl(imageUrl);
    if (safeImageUrl) {
      payload.append("url", safeImageUrl);
    } else if (imageUrl) {
      logger.warn(
        `[WHATSAPP] Image URL skipped (not public HTTPS): ${imageUrl}`
      );
    }

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        reason: `Fonnte server returned HTTP ${response.status}: ${errorText}`,
      };
    }

    const json = (await response.json()) as FonnteSendResponse;
    if (json.status) {
      const messageId = json.id && json.id.length > 0 ? json.id[0] : undefined;
      return { success: true, reason: json.reason || "Sent successfully", id: messageId };
    } else {
      return { success: false, reason: json.reason || "Fonnte API returned status false" };
    }
  } catch (error) {
    logger.error("[WHATSAPP] Error sending WhatsApp message via Fonnte:", error);
    return { success: false, reason: (error as Error).message || "Network error" };
  }
}

/**
 * Transactional templates configuration
 */
export const TRANSACTIONAL_TEMPLATES = {
  REGISTRASI: "Halo {nama},\nakun Anda berhasil dibuat.",
  OTP: "Kode verifikasi Anda: {otp}",
  ORDER_CREATED: "Pesanan #{invoice} berhasil dibuat.",
  PAYMENT_RECEIVED: "Pembayaran pesanan #{invoice} telah diterima.",
  ORDER_PROCESSED: "Pesanan Anda sedang diproses.",
  ORDER_SHIPPED: "Pesanan telah dikirim.\nNo Resi: {resi}",
  ORDER_COMPLETED: "Terma kasih telah berbelanja.",
} as const;

export type TransactionalType = keyof typeof TRANSACTIONAL_TEMPLATES;

/**
 * Sends and logs a transactional WhatsApp message with 3x automatic retry logic
 */
export async function sendWhatsappTransactional(
  noHp: string,
  nama: string,
  tipe: TransactionalType,
  templateVars: Record<string, string>,
  forceResendId?: string
): Promise<void> {
  const target = toWhatsappFormat(noHp);
  const rawTemplate = TRANSACTIONAL_TEMPLATES[tipe];
  if (!rawTemplate) {
    logger.error(`[WHATSAPP] Invalid transactional type: ${tipe}`);
    return;
  }

  // Replace placeholders: {nama}, {nomor}, {invoice}, {resi}, {otp}
  let message: string = rawTemplate;

  const vars = {
    nama,
    nomor: target,
    ...templateVars,
  };

  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`{${key}}`, "gi");
    message = message.replace(regex, value || "");
  }

  // Create or retrieve DB log
  let logId = forceResendId;
  if (!logId) {
    const createdLog = await prisma.whatsapptransactional.create({
      data: {
        noHp: target,
        nama,
        tipe,
        pesan: message,
        status: "PENDING",
      },
    });
    logId = createdLog.id;
  } else {
    // If resending, reset stats
    await prisma.whatsapptransactional.update({
      where: { id: logId },
      data: {
        pesan: message,
        status: "PENDING",
        error: null,
      },
    });
  }

  // Process sending with 3x retry mechanism
  let success = false;
  let errorReason = "";
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts && !success) {
    attempt++;
    const res = await sendWhatsapp(target, message);
    if (res.success) {
      success = true;
    } else {
      errorReason = res.reason;
      if (attempt < maxAttempts) {
        await sleep(1500); // Wait 1.5s before retry
      }
    }
  }

  // Update DB log status
  await prisma.whatsapptransactional.update({
    where: { id: logId },
    data: {
      status: success ? "SENT" : "FAILED",
      error: success ? null : errorReason,
      retries: attempt - 1,
      sentAt: success ? new Date() : null,
    },
  });
}

async function getBroadcastControlStatus(broadcastId: string): Promise<string> {
  const row = await prisma.whatsappbroadcast.findUnique({
    where: { id: broadcastId },
    select: { status: true },
  });
  return row?.status ?? "FAILED";
}

/**
 * Background Broadcast Queue Runner with pause / resume / cancel support.
 */
export async function runWhatsappBroadcast(broadcastId: string) {
  logger.info(`[BROADCAST] Starting background processing for ID: ${broadcastId}`);

  try {
    const broadcast = await prisma.whatsappbroadcast.findUnique({
      where: { id: broadcastId },
      include: { logs: true },
    });

    if (!broadcast) {
      logger.error(`[BROADCAST] Broadcast ID ${broadcastId} not found in database`);
      return;
    }

    if (broadcast.status === "CANCELLED" || broadcast.status === "COMPLETED") {
      return;
    }

    await prisma.whatsappbroadcast.update({
      where: { id: broadcastId },
      data: { status: "PROCESSING" },
    });

    const { sendBroadcastToRecipient } = await import("./notification/broadcast-sender");
    const pendingLogs = broadcast.logs.filter((l) => l.status === "PENDING");

    for (let i = 0; i < pendingLogs.length; i++) {
      const controlStatus = await getBroadcastControlStatus(broadcastId);
      if (controlStatus === "CANCELLED") {
        logger.info(`[BROADCAST] Broadcast ${broadcastId} cancelled`);
        return;
      }
      if (controlStatus === "PAUSED") {
        logger.info(`[BROADCAST] Broadcast ${broadcastId} paused`);
        return;
      }

      const log = pendingLogs[i];
      const result = await sendBroadcastToRecipient(
        {
          id: broadcast.id,
          channel: broadcast.channel,
          judul: broadcast.judul,
          pesan: broadcast.pesan,
          gambar: broadcast.gambar,
        },
        {
          nama: log.nama,
          noHp: log.noHp,
          email: log.email,
          userId: log.userId,
        }
      );

      const now = new Date();
      await prisma.whatsappbroadcastlog.update({
        where: { id: log.id },
        data: {
          status: result.success ? "SENT" : "FAILED",
          error: result.success ? null : result.error || "Gagal mengirim",
          retries: { increment: 1 },
          sentAt: result.success ? now : null,
        },
      });

      await prisma.whatsappbroadcast.update({
        where: { id: broadcastId },
        data: {
          pending: { decrement: 1 },
          terkirim: result.success ? { increment: 1 } : undefined,
          gagal: !result.success ? { increment: 1 } : undefined,
        },
      });

      if (i < pendingLogs.length - 1 && broadcast.channel !== "notif") {
        await sleep(2500);
      }
    }

    const finalStatus = await getBroadcastControlStatus(broadcastId);
    if (finalStatus !== "CANCELLED" && finalStatus !== "PAUSED") {
      await prisma.whatsappbroadcast.update({
        where: { id: broadcastId },
        data: { status: "COMPLETED" },
      });
    }

    logger.info(`[BROADCAST] Broadcast ID ${broadcastId} processing completed`);
  } catch (error) {
    logger.error(`[BROADCAST] Failed during broadcast execution of ID ${broadcastId}:`, error);
    await prisma.whatsappbroadcast
      .update({
        where: { id: broadcastId },
        data: { status: "FAILED" },
      })
      .catch(() => {});
  }
}
