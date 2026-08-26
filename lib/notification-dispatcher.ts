import { prisma } from "./db";
import { sendEmail } from "./email/provider";
import { sendWhatsapp } from "./whatsapp";
import { normalizeNoHp } from "./phone-utils";
import { formatRupiah } from "./utils";
import type { Prisma } from "@prisma/client";

export interface ChannelConfig {
  email: boolean;
  whatsapp: boolean;
}

function isJsonObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type OrderWithRelations = Prisma.orderGetPayload<{
  include: {
    user: true;
    orderitem: true;
  };
}>;

interface ResendDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}

interface FonnteDispatchResult {
  success: boolean;
  reason: string;
  id?: string;
}

export interface NotificationSettings {
  registrasi: ChannelConfig;
  otp: ChannelConfig;
  "order-created": ChannelConfig;
  "payment-success": ChannelConfig;
  "order-processing": ChannelConfig;
  "order-shipped": ChannelConfig;
  "order-completed": ChannelConfig;
  "forgot-password": ChannelConfig;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  registrasi: { email: true, whatsapp: true },
  otp: { email: true, whatsapp: true },
  "order-created": { email: true, whatsapp: true },
  "payment-success": { email: true, whatsapp: true },
  "order-processing": { email: true, whatsapp: true },
  "order-shipped": { email: true, whatsapp: true },
  "order-completed": { email: true, whatsapp: true },
  "forgot-password": { email: true, whatsapp: true },
};

/**
 * Fetch notification channel configuration from Sitesetting key 'notification_channels'
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const row = await prisma.sitesetting.findUnique({
      where: { key: "notification_channels" },
    });
    if (row && isJsonObject(row.value)) {
      return { ...DEFAULT_SETTINGS, ...row.value };
    }
  } catch (err) {
    console.error("[NOTIFICATION] Error fetching sitesettings:", err);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Helper to make relative image paths absolute for WhatsApp attachments
 */
function makeAbsoluteUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Main Dispatcher to send transactional alerts via Email, WhatsApp, or both.
 */
export async function dispatchNotification(
  event: keyof NotificationSettings,
  payload: {
    recipientEmail: string;
    recipientName: string;
    recipientPhone?: string;
    userId?: string;
    orderId?: string;
    otp?: string;
    resetUrl?: string;
    total?: number;
    expiredAt?: string;
    reason?: string;
    kurir?: string;
    resi?: string;
    trackingLink?: string;
    estimasiTiba?: string;
  },
  overrideChannel?: ChannelConfig
): Promise<{ email?: { success: boolean; logId?: string; error?: string }; whatsapp?: { success: boolean; logId?: string; error?: string } }> {
  
  const settings = await getNotificationSettings();
  const config = overrideChannel || settings[event] || DEFAULT_SETTINGS[event];

  // Try to lookup user if details are missing
  let userId = payload.userId;
  let recipientPhone = payload.recipientPhone ? normalizeNoHp(payload.recipientPhone) : undefined;
  let recipientEmail = payload.recipientEmail;
  let recipientName = payload.recipientName;

  if (userId && (!recipientPhone || !recipientEmail || !recipientName)) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      recipientPhone = recipientPhone || normalizeNoHp(user.noHp);
      recipientEmail = recipientEmail || user.email;
      recipientName = recipientName || user.username;
    }
  }

  // Fetch Rich Order details from database if orderId is specified
  let orderData: OrderWithRelations | null = null;
  if (payload.orderId) {
    orderData = await prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        user: true,
        orderitem: true,
      },
    });

    if (orderData) {
      if (!userId) userId = orderData.userId;
      if (!recipientPhone && orderData.user) recipientPhone = normalizeNoHp(orderData.user.noHp);
      if (!recipientEmail && orderData.user) recipientEmail = orderData.user.email;
      if (!recipientName && orderData.user) recipientName = orderData.user.username;

      // Parse shipping details if stored as json
      if (!payload.kurir && orderData.ekspedisi) {
        try {
          const eks: unknown = typeof orderData.ekspedisi === "string" ? JSON.parse(orderData.ekspedisi) : orderData.ekspedisi;
          if (isJsonObject(eks)) {
            const kurir = eks.nama ?? eks.courier_name;
            if (typeof kurir === "string" && kurir) payload.kurir = kurir;
          }
        } catch {}
      }
      if (!payload.resi && orderData.resi) {
        payload.resi = orderData.resi;
      }
      if (!payload.estimasiTiba && orderData.estimasiTiba) {
        try {
          const est: unknown = typeof orderData.estimasiTiba === "string" ? JSON.parse(orderData.estimasiTiba) : orderData.estimasiTiba;
          if (isJsonObject(est)) {
            const durasi = est.duration ?? (est.min !== undefined && est.max !== undefined ? `${String(est.min)}-${String(est.max)} hari` : undefined);
            if (typeof durasi === "string" && durasi) payload.estimasiTiba = durasi;
          }
        } catch {}
      }
      if (payload.total === undefined) {
        payload.total = orderData.total;
      }
    }
  }

  const results: { email?: { success: boolean; logId?: string; error?: string }; whatsapp?: { success: boolean; logId?: string; error?: string } } = {};
  const promises: Promise<void>[] = [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // 1. PROCESS EMAIL CHANNEL
  if (config.email && recipientEmail) {
    promises.push((async () => {
      // 1.1 Compile email templates dynamically or import from existing templates
      let subject = "";
      let html = "";

      // Lazy import email templates to prevent dependency loops
      const orderTemplates = await import("./email/templates/order");
      const authTemplates = await import("./email/templates/auth");

      switch (event) {
        case "order-created": {
          const t = orderTemplates.orderCreatedTemplate({
            recipientName,
            orderId: payload.orderId || "",
            total: payload.total ?? 0,
            expiredAt: payload.expiredAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });
          subject = t.subject;
          html = t.html;
          break;
        }
        case "order-shipped": {
          const t = orderTemplates.orderShippedTemplate({
            recipientName,
            orderId: payload.orderId || "",
            kurir: payload.kurir || "Ekspedisi",
            resi: payload.resi || "-",
          });
          subject = t.subject;
          html = t.html;
          break;
        }
        case "payment-success": {
          const t = orderTemplates.paymentVerifiedTemplate({
            recipientName,
            orderId: payload.orderId || "",
          });
          subject = t.subject;
          html = t.html;
          break;
        }
        case "order-completed": {
          const t = orderTemplates.orderCompletedTemplate({
            recipientName,
            orderId: payload.orderId || "",
          });
          subject = t.subject;
          html = t.html;
          break;
        }
        case "order-processing": {
          const t = orderTemplates.orderDiprosesTemplate({
            recipientName,
            orderId: payload.orderId || "",
          });
          subject = t.subject;
          html = t.html;
          break;
        }
        case "forgot-password": {
          const t = authTemplates.forgotPasswordTemplate({
            recipientName,
            resetUrl: payload.resetUrl || "",
          });
          subject = t.subject;
          html = t.html;
          break;
        }
        case "registrasi": {
          const t = authTemplates.welcomeEmailTemplate({
            recipientName,
          });
          subject = t.subject;
          html = t.html;
          break;
        }
        case "otp": {
          const t = authTemplates.verifyEmailTemplate({
            recipientName,
            verifyUrl: `${appUrl}/verify-otp?code=${payload.otp}`,
          });
          subject = `Kode OTP Verifikasi Anda: ${payload.otp}`;
          html = t.html;
          break;
        }
        default: {
          subject = `Notifikasi ${event} — Jogjadoelan`;
          html = `<p>Halo ${recipientName}, ada update mengenai aktivitas Anda di Jogjadoelan.</p>`;
        }
      }

      // 1.2 Create DB log in pending state
      const log = await prisma.notificationlog.create({
        data: {
          channel: "email",
          recipient: recipientEmail,
          template: event,
          subject,
          message: html,
          status: "pending",
          related_order_id: payload.orderId || null,
          related_user_id: userId || null,
        },
      });

      // 1.3 Dispatch via Resend with 3x retry
      let success = false;
      let errorReason = "";
      let attempt = 0;
      const maxAttempts = 3;
      let resendRes: ResendDispatchResult | null = null;

      while (attempt < maxAttempts && !success) {
        attempt++;
        try {
          const result = await sendEmail({ to: recipientEmail, subject, html, tag: event });
          if (result.success) {
            success = true;
            resendRes = result;
          } else {
            errorReason = result.error || "Gagal kirim email";
            if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 1500));
          }
        } catch (e: unknown) {
          errorReason = e instanceof Error && e.message ? e.message : String(e);
          if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 1500));
        }
      }

      // 1.4 Update DB log status
      const now = new Date();
      await prisma.notificationlog.update({
        where: { id: log.id },
        data: {
          status: success ? "sent" : "failed",
          provider: "resend",
          provider_response: resendRes
            ? {
                success: resendRes.success,
                messageId: resendRes.messageId ?? null,
                error: resendRes.error ?? null,
                skipped: resendRes.skipped ?? null,
              }
            : { error: errorReason },
          sent_at: success ? now : null,
          failed_at: !success ? now : null,
        },
      });

      results.email = { success, logId: log.id, error: success ? undefined : errorReason };
    })());
  }

  // 2. PROCESS WHATSAPP CHANNEL
  if (config.whatsapp && recipientPhone) {
    promises.push((async () => {
      let message = "";
      let imageUrl: string | undefined = undefined;

      // Extract product details if applicable
      let productListText = "";
      if (orderData && orderData.orderitem && orderData.orderitem.length > 0) {
        productListText = orderData.orderitem
          .map((item) => `• ${item.snapNama} (Qty: ${item.qty})`)
          .join("\n");

        // Find product image
        const firstItem = orderData.orderitem[0];
        if (firstItem?.snapGambar) {
          imageUrl = makeAbsoluteUrl(firstItem.snapGambar);
        }
      }

      const formattedTotal = formatRupiah(payload.total ?? 0);
      const formattedDate = new Date().toLocaleDateString("id-ID", { dateStyle: "long" });

      switch (event) {
        case "order-created": {
          const formattedStatus = orderData ? orderData.status.replace(/_/g, " ") : "MENUNGGU PEMBAYARAN";
          message = `📦 *PESANAN BARU BERHASIL DIBUAT* 📦\n\nHalo *${recipientName}*, terima kasih telah berbelanja di Jogjadoelan! Pesanan Anda telah berhasil dibuat.\n\n*Detail Pesanan:*\n• *No. Invoice:* #${payload.orderId}\n• *Tanggal:* ${formattedDate}\n• *Daftar Produk:*\n${productListText}\n• *Total Pembayaran:* *${formattedTotal}*\n• *Status Pembayaran:* ${formattedStatus}\n\nSilakan klik link berikut untuk melihat detail pesanan Anda:\n${appUrl}/pesanan/${payload.orderId}\n\n⏰ Segera lakukan pembayaran sebelum batas waktu agar pesanan segera diproses.`;
          break;
        }
        case "order-shipped": {
          message = `🚚 *PESANAN TELAH DIKIRIM* 🚚\n\nHalo *${recipientName}*, pesanan Anda telah dikirim!\n\n*Detail Pengiriman:*\n• *No. Invoice:* #${payload.orderId}\n• *Ekspedisi:* ${payload.kurir || "Ekspedisi"}\n• *No. Resi:* *${payload.resi || "-"}*\n• *Estimasi Tiba:* ${payload.estimasiTiba || "1-3 hari kerja"}\n\nLacak pesanan Anda:\n${payload.trackingLink || `${appUrl}/pesanan/${payload.orderId}`}\n\nTerima kasih telah mempercayai Jogjadoelan!`;
          break;
        }
        case "payment-success": {
          message = `✅ *PEMBAYARAN BERHASIL* ✅\n\nHalo *${recipientName}*, pembayaran untuk pesanan Anda telah berhasil diverifikasi.\n\n*Detail Pembayaran:*\n• *No. Invoice:* #${payload.orderId}\n• *Total:* *${formattedTotal}*\n• *Tanggal:* ${formattedDate}\n• *Status:* Lunas / Berhasil\n\nPesanan Anda sedang diproses oleh tim kami. Terima kasih!`;
          break;
        }
        case "order-completed": {
          message = `🎉 *PESANAN SELESAI* 🎉\n\nHalo *${recipientName}*, pesanan Anda dengan invoice #${payload.orderId} telah dinyatakan selesai.\n\n*Ringkasan Pesanan:*\n${productListText || "• Helm custom Jogjadoelan"}\n• *Total:* *${formattedTotal}*\n\nKami berharap Anda menyukai produk helm custom kami! Bagikan ulasan Anda dan bantu kami terus meningkatkan pelayanan.\n\n*Beri Ulasan Sekarang:*\n${appUrl}/ulasan/${payload.orderId}\n\nTerima kasih telah berbelanja di Jogjadoelan!`;
          break;
        }
        case "order-processing": {
          message = `⚙️ *PESANAN SEDANG DIPROSES* ⚙️\n\nHalo *${recipientName}*, pembayaran pesanan Anda telah dikonfirmasi dan sedang diproses tim produksi kami.\n\n*Detail Pesanan:*\n• *No. Invoice:* #${payload.orderId}\n• *Daftar Produk:*\n${productListText || "• Helm custom Jogjadoelan"}\n• *Total:* *${formattedTotal}*\n• *Status:* Sedang Diproses\n\nPantau progress pesanan Anda di:\n${appUrl}/pesanan/${payload.orderId}\n\nTerima kasih atas kesabaran Anda!`;
          break;
        }
        case "forgot-password": {
          message = `🔒 *RESET PASSWORD AKUN JOGJADOELAN* 🔒\n\nHalo *${recipientName}*,\n\nAnda menerima pesan ini karena adanya permintaan reset password untuk akun Anda. Silakan klik link berikut untuk membuat password baru:\n\n${payload.resetUrl}\n\nLink ini hanya berlaku selama 1 jam. Jika Anda tidak merasa meminta ini, abaikan pesan ini.`;
          break;
        }
        case "registrasi": {
          message = `🎉 *SELAMAT DATANG DI JOGJADOELAN* 🎉\n\nHalo *${recipientName}*, akun Anda telah berhasil dibuat!\n\nMulai sekarang, Anda dapat memesan helm custom impian Anda dengan mudah melalui platform kami.\n\nSelamat berbelanja!`;
          break;
        }
        case "otp": {
          message = `🔑 *KODE VERIFIKASI (OTP)* 🔑\n\nKode verifikasi Anda adalah: *${payload.otp}*\n\nJangan berikan kode ini kepada siapapun, termasuk pihak Jogjadoelan. Kode ini berlaku selama 5 menit.`;
          break;
        }
        default: {
          message = `Halo *${recipientName}*, ada update mengenai aktivitas Anda di Jogjadoelan untuk event *${event}*.`;
        }
      }

      // 2.2 Create DB log in pending state
      const log = await prisma.notificationlog.create({
        data: {
          channel: "whatsapp",
          recipient: recipientPhone || "",
          template: event,
          subject: `Notifikasi ${event}`,
          message,
          status: "pending",
          related_order_id: payload.orderId || null,
          related_user_id: userId || null,
        },
      });

      // 2.3 Dispatch via Fonnte with 3x retry
      let success = false;
      let errorReason = "";
      let attempt = 0;
      const maxAttempts = 3;
      let fonnteRes: FonnteDispatchResult | null = null;

      while (attempt < maxAttempts && !success) {
        attempt++;
        try {
          const result = await sendWhatsapp(recipientPhone || "", message, imageUrl);
          if (result.success) {
            success = true;
            fonnteRes = result;
          } else {
            errorReason = result.reason || "Fonnte API returned false";
            if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 1500));
          }
        } catch (e: unknown) {
          errorReason = e instanceof Error && e.message ? e.message : String(e);
          if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 1500));
        }
      }

      // 2.4 Update DB log status
      const now = new Date();
      await prisma.notificationlog.update({
        where: { id: log.id },
        data: {
          status: success ? "sent" : "failed",
          provider: "fonnte",
          provider_response: fonnteRes
            ? {
                success: fonnteRes.success,
                reason: fonnteRes.reason,
                id: fonnteRes.id ?? null,
              }
            : { error: errorReason },
          sent_at: success ? now : null,
          failed_at: !success ? now : null,
        },
      });

      results.whatsapp = { success, logId: log.id, error: success ? undefined : errorReason };
    })());
  }

  // Wait for all active channels to complete sending independently
  await Promise.allSettled(promises);
  return results;
}
