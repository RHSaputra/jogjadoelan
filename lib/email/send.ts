// lib/email/send.ts — Email dispatch service
// Handles sending auth, order, and admin emails via Resend.
// Logs sent emails to the database.

import { sendEmail } from "./provider";
import { prisma } from "@/lib/db";
import * as authTemplates from "./templates/auth";
import * as orderTemplates from "./templates/order";
import * as adminTemplates from "./templates/admin";
import type { NotificationSettings } from "../notification-dispatcher";

type AuthEmailKind =
  | "welcome"
  | "forgot-password"
  | "password-reset-success"
  | "admin-password-changed"
  | "verify-email";

interface AuthEmailVars {
  recipientEmail: string;
  recipientName: string;
  recipientPhone?: string;
  userId?: string;
  resetUrl?: string;
  verifyUrl?: string;
}

type OrderEmailKind =
  | "order-created"
  | "waiting-payment"
  | "payment-received"
  | "payment-rejected"
  | "payment-verified"
  | "order-diproses"
  | "order-siap-dikirim"
  | "order-shipped"
  | "resi-added"
  | "order-completed"
  | "order-cancelled"
  | "order-expired"
  | "order-refunded"
  | "refund-completed"
  | "payment-reminder"
  | "pelunasan-reminder"
  | "pelunasan-success"
  | "pelunasan-failed"
  | "dp-received"
  | "tukar-requested"
  | "tukar-approved"
  | "tukar-rejected"
  | "tukar-shipped";

interface OrderEmailVars {
  recipientEmail: string;
  recipientName: string;
  recipientPhone?: string;
  userId?: string;
  orderId: string;
  total?: number;
  expiredAt?: string;
  reason?: string;
  kurir?: string;
  resi?: string;
  daysLeft?: number;
  sisaAmount?: number;
  nominal?: number;
  komplainId?: string;
  productNama?: string;
  ukuranBaru?: string;
}

type AdminEmailKind =
  | "new-order"
  | "new-payment"
  | "new-bukti-pembayaran"
  | "cancel-request"
  | "refund-request"
  | "low-stock"
  | "out-of-stock"
  | "system-error"
  | "new-komplain"
  | "new-tukar";

interface AdminEmailVars {
  adminEmail: string;
  adminName?: string;
  orderId?: string;
  total?: number;
  customerName?: string;
  reason?: string;
  refundId?: string;
  nominal?: number;
  products?: Array<{ nama: string; stok?: number; sku?: string }>;
  errorMessage?: string;
  context?: string;
  komplainId?: string;
  tukarId?: string;
  jenisLabel?: string;
  productNama?: string;
  ukuranBaru?: string;
}

// Komplain email
type KomplainEmailKind = "komplain-created" | "komplain-replied";

interface KomplainEmailVars {
  recipientEmail: string;
  recipientName: string;
  komplainId: string;
  adminName?: string;
}

/**
 * Window waktu (dalam milidetik) untuk mendeteksi duplikasi email.
 * Jika email dengan type + recipient + relatedOrderId yang sama sudah dikirim
 * dalam window ini, maka dianggap duplikat dan tidak dikirim ulang.
 */
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 menit

async function logEmail(params: {
  recipient: string;
  subject: string;
  type: string;
  status: "SENT" | "FAILED";
  error?: string;
  messageId?: string;
  relatedOrderId?: string;
}): Promise<void> {
  try {
    if (process.env.NODE_ENV === "development") {
      const status = params.status === "SENT" ? "✓" : "✗";
      console.log(`[EMAIL LOG ${status}] ${params.type} → ${params.recipient} | ${params.subject} | ${params.messageId ?? "-"}`);
    }
    try { await prisma.emaillog.create({ data: { recipient: params.recipient, subject: params.subject, type: params.type, status: params.status, error: params.error ?? null, messageId: params.messageId ?? null, relatedOrderId: params.relatedOrderId ?? null } }); } catch { /* silent */ }
    
    // Also write to centralized notificationlog
    try {
      await prisma.notificationlog.create({
        data: {
          channel: "email",
          recipient: params.recipient,
          template: params.type,
          subject: params.subject,
          message: `Legacy email dispatch (Type: ${params.type})`,
          status: params.status === "SENT" ? "sent" : "failed",
          provider: "resend",
          provider_response: { error: params.error || null, messageId: params.messageId || null },
          created_at: new Date(),
          sent_at: params.status === "SENT" ? new Date() : null,
          failed_at: params.status === "FAILED" ? new Date() : null,
          related_order_id: params.relatedOrderId ?? null,
        }
      });
    } catch {}
  } catch { /* silent */ }
}

/**
 * Cek apakah email dengan kombinasi type + recipient + relatedOrderId yang sama
 * sudah berhasil dikirim dalam DEDUP_WINDOW_MS terakhir.
 * 
 * Mengembalikan true jika ditemukan duplikat (harus di-skip).
 */
async function isDuplicateEmail(params: {
  type: string;
  recipient: string;
  relatedOrderId?: string;
}): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - DEDUP_WINDOW_MS);
    const existing = await prisma.notificationlog.findFirst({
      where: {
        channel: "email",
        template: params.type,
        recipient: params.recipient,
        status: "sent",
        created_at: { gte: windowStart },
        ...(params.relatedOrderId ? { related_order_id: params.relatedOrderId } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      console.warn(`[EMAIL DEDUP] Duplicate detected for type=${params.type} recipient=${params.recipient} relatedOrderId=${params.relatedOrderId ?? "N/A"} — skipping`);
      return true;
    }
    return false;
  } catch {
    // Gagal cek duplikasi (misal DB error) → izinkan kirim (fail open)
    return false;
  }
}

export async function sendAuthEmail(kind: AuthEmailKind, vars: AuthEmailVars): Promise<void> {
  try {
    let event: keyof NotificationSettings | null = null;
    if (kind === "forgot-password") event = "forgot-password";
    else if (kind === "welcome") event = "registrasi";
    else if (kind === "verify-email") event = "otp";

    if (event) {
      const { dispatchNotification } = await import("../notification-dispatcher");
      let otpCode: string | undefined = undefined;
      if (vars.verifyUrl) {
        try {
          const urlObj = new URL(vars.verifyUrl);
          otpCode = urlObj.searchParams.get("code") || undefined;
        } catch {}
      }
      await dispatchNotification(event, {
        recipientEmail: vars.recipientEmail,
        recipientName: vars.recipientName,
        recipientPhone: vars.recipientPhone,
        userId: vars.userId,
        resetUrl: vars.resetUrl,
        otp: otpCode
      });
      return;
    }

    let subject = "";
    let html = "";

    switch (kind) {
      case "welcome": {
        const t = authTemplates.welcomeEmailTemplate({ recipientName: vars.recipientName });
        subject = t.subject; html = t.html;
        break;
      }
      case "forgot-password": {
        if (!vars.resetUrl) return;
        const t = authTemplates.forgotPasswordTemplate({ recipientName: vars.recipientName, resetUrl: vars.resetUrl });
        subject = t.subject; html = t.html;
        break;
      }
      case "password-reset-success": {
        const t = authTemplates.passwordResetSuccessTemplate({ recipientName: vars.recipientName });
        subject = t.subject; html = t.html;
        break;
      }
      case "admin-password-changed": {
        const t = authTemplates.adminPasswordChangedTemplate({ recipientName: vars.recipientName });
        subject = t.subject; html = t.html;
        break;
      }
      case "verify-email": {
        if (!vars.verifyUrl) return;
        const t = authTemplates.verifyEmailTemplate({ recipientName: vars.recipientName, verifyUrl: vars.verifyUrl });
        subject = t.subject; html = t.html;
        break;
      }
    }

    if (!subject || !html) return;

    // Dedup: cek apakah email auth dengan jenis yang sama sudah dikirim ke recipient ini
    const emailType = `AUTH_${kind.toUpperCase().replace(/-/g, "_")}`;
    if (await isDuplicateEmail({ type: emailType, recipient: vars.recipientEmail })) return;

    const result = await sendEmail({ to: vars.recipientEmail, subject, html, tag: kind });
    await logEmail({ recipient: vars.recipientEmail, subject, type: emailType, status: result.success ? "SENT" : "FAILED", error: result.error, messageId: result.messageId });
  } catch (e: unknown) { console.error("[email/send] sendAuthEmail failed:", e); }
}

export async function sendOrderEmail(kind: OrderEmailKind, vars: OrderEmailVars): Promise<void> {
  try {
    let event: keyof NotificationSettings | null = null;
    if (kind === "order-created") event = "order-created";
    else if (kind === "order-shipped" || kind === "resi-added") event = "order-shipped";
    else if (kind === "payment-received" || kind === "payment-verified" || kind === "pelunasan-success" || kind === "dp-received") event = "payment-success";
    else if (kind === "order-completed") event = "order-completed";
    else if (kind === "order-diproses" || kind === "order-siap-dikirim") event = "order-processing";

    if (event) {
      const { dispatchNotification } = await import("../notification-dispatcher");
      await dispatchNotification(event, {
        recipientEmail: vars.recipientEmail,
        recipientName: vars.recipientName,
        recipientPhone: vars.recipientPhone,
        userId: vars.userId,
        orderId: vars.orderId,
        total: vars.total,
        expiredAt: vars.expiredAt,
        reason: vars.reason,
        kurir: vars.kurir,
        resi: vars.resi,
      });
      return;
    }

    let subject = "";
    let html = "";

    switch (kind) {
      case "order-created": {
        if (vars.total === undefined || !vars.expiredAt) return;
        const t = orderTemplates.orderCreatedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, total: vars.total, expiredAt: vars.expiredAt });
        subject = t.subject; html = t.html;
        break;
      }
      case "waiting-payment": {
        if (vars.total === undefined || !vars.expiredAt) return;
        const t = orderTemplates.waitingPaymentTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, total: vars.total, expiredAt: vars.expiredAt });
        subject = t.subject; html = t.html;
        break;
      }
      case "payment-received": {
        if (vars.total === undefined) return;
        const t = orderTemplates.paymentReceivedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, total: vars.total });
        subject = t.subject; html = t.html;
        break;
      }
      case "payment-rejected": {
        const t = orderTemplates.paymentRejectedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, reason: vars.reason ?? "Tidak valid" });
        subject = t.subject; html = t.html;
        break;
      }
      case "payment-verified": {
        const t = orderTemplates.paymentVerifiedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId });
        subject = t.subject; html = t.html;
        break;
      }
      case "order-diproses": {
        const t = orderTemplates.orderDiprosesTemplate({ recipientName: vars.recipientName, orderId: vars.orderId });
        subject = t.subject; html = t.html;
        break;
      }
      case "order-siap-dikirim": {
        const t = orderTemplates.orderSiapDikirimTemplate({ recipientName: vars.recipientName, orderId: vars.orderId });
        subject = t.subject; html = t.html;
        break;
      }
      case "order-shipped": {
        if (!vars.kurir || !vars.resi) return;
        const t = orderTemplates.orderShippedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, kurir: vars.kurir, resi: vars.resi });
        subject = t.subject; html = t.html;
        break;
      }
      case "resi-added": {
        if (!vars.kurir || !vars.resi) return;
        const t = orderTemplates.resiAddedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, kurir: vars.kurir, resi: vars.resi });
        subject = t.subject; html = t.html;
        break;
      }
      case "order-completed": {
        const t = orderTemplates.orderCompletedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId });
        subject = t.subject; html = t.html;
        break;
      }
      case "order-cancelled": {
        const t = orderTemplates.orderCancelledTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, reason: vars.reason });
        subject = t.subject; html = t.html;
        break;
      }
      case "order-expired": {
        const t = orderTemplates.orderExpiredTemplate({ recipientName: vars.recipientName, orderId: vars.orderId });
        subject = t.subject; html = t.html;
        break;
      }
      case "order-refunded": {
        const t = orderTemplates.orderRefundedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId });
        subject = t.subject; html = t.html;
        break;
      }
      case "refund-completed": {
        const t = orderTemplates.refundCompletedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, nominal: vars.nominal ?? 0 });
        subject = t.subject; html = t.html;
        break;
      }
      case "payment-reminder": {
        if (vars.total === undefined || vars.daysLeft === undefined || !vars.expiredAt) return;
        const t = orderTemplates.paymentReminderTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, total: vars.total, daysLeft: vars.daysLeft, expiredAt: vars.expiredAt });
        subject = t.subject; html = t.html;
        break;
      }
      case "pelunasan-reminder": {
        if (vars.total === undefined || vars.sisaAmount === undefined || vars.daysLeft === undefined) return;
        const t = orderTemplates.pelunasanReminderTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, total: vars.total, sisaAmount: vars.sisaAmount, daysLeft: vars.daysLeft });
        subject = t.subject; html = t.html;
        break;
      }
      case "pelunasan-success": {
        if (vars.total === undefined) return;
        const t = orderTemplates.pelunasanSuccessTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, total: vars.total });
        subject = t.subject; html = t.html;
        break;
      }
      case "pelunasan-failed": {
        const t = orderTemplates.paymentRejectedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, reason: vars.reason ?? "Pembayaran tidak valid" });
        subject = t.subject; html = t.html;
        break;
      }
      case "dp-received": {
        if (vars.total === undefined) return;
        const t = orderTemplates.dpReceivedTemplate({ recipientName: vars.recipientName, orderId: vars.orderId, total: vars.total });
        subject = t.subject; html = t.html;
        break;
      }
      case "tukar-requested": {
        if (!vars.komplainId || !vars.productNama || !vars.ukuranBaru) return;
        const t = orderTemplates.tukarRequestedTemplate({ recipientName: vars.recipientName, komplainId: vars.komplainId, orderId: vars.orderId, productNama: vars.productNama, ukuranBaru: vars.ukuranBaru });
        subject = t.subject; html = t.html;
        break;
      }
      case "tukar-approved": {
        if (!vars.komplainId) return;
        const t = orderTemplates.tukarApprovedTemplate({ recipientName: vars.recipientName, komplainId: vars.komplainId, orderId: vars.orderId, kurir: vars.kurir ?? "Anteraja" });
        subject = t.subject; html = t.html;
        break;
      }
      case "tukar-rejected": {
        if (!vars.komplainId) return;
        const t = orderTemplates.tukarRejectedTemplate({ recipientName: vars.recipientName, komplainId: vars.komplainId, orderId: vars.orderId, reason: vars.reason ?? "Tidak disetujui" });
        subject = t.subject; html = t.html;
        break;
      }
      case "tukar-shipped": {
        if (!vars.komplainId || !vars.kurir || !vars.resi) return;
        const t = orderTemplates.tukarShippedTemplate({ recipientName: vars.recipientName, komplainId: vars.komplainId, orderId: vars.orderId, kurir: vars.kurir, resi: vars.resi });
        subject = t.subject; html = t.html;
        break;
      }
      default: return;
    }

    if (!subject || !html) return;

    // Dedup: cek apakah email order dengan jenis+orderId yang sama sudah dikirim
    const emailType = `ORDER_${kind.toUpperCase().replace(/-/g, "_")}`;
    if (await isDuplicateEmail({ type: emailType, recipient: vars.recipientEmail, relatedOrderId: vars.orderId })) return;

    const result = await sendEmail({ to: vars.recipientEmail, subject, html, tag: kind });
    await logEmail({ recipient: vars.recipientEmail, subject, type: emailType, status: result.success ? "SENT" : "FAILED", error: result.error, messageId: result.messageId, relatedOrderId: vars.orderId });
  } catch (e: unknown) { console.error("[email/send] sendOrderEmail failed:", e); }
}

export async function sendAdminEmail(kind: AdminEmailKind, vars: AdminEmailVars): Promise<void> {
  try {
    let subject = "";
    let html = "";

    switch (kind) {
      case "new-order": {
        if (!vars.orderId || vars.total === undefined || !vars.customerName) return;
        const t = adminTemplates.adminNewOrderTemplate({ adminName: vars.adminName ?? "Admin", orderId: vars.orderId, total: vars.total, customerName: vars.customerName });
        subject = t.subject; html = t.html;
        break;
      }
      case "new-payment": {
        if (!vars.orderId || vars.total === undefined || !vars.customerName) return;
        const t = adminTemplates.adminNewPaymentTemplate({ adminName: vars.adminName ?? "Admin", orderId: vars.orderId, total: vars.total, customerName: vars.customerName });
        subject = t.subject; html = t.html;
        break;
      }
      case "new-bukti-pembayaran": {
        if (!vars.orderId || vars.total === undefined) return;
        const t = adminTemplates.adminBuktiPembayaranTemplate({ adminName: vars.adminName ?? "Admin", orderId: vars.orderId, total: vars.total });
        subject = t.subject; html = t.html;
        break;
      }
      case "cancel-request": {
        const t = adminTemplates.adminCancelRequestTemplate({ adminName: vars.adminName ?? "Admin", orderId: vars.orderId ?? "-", reason: vars.reason ?? "-" });
        subject = t.subject; html = t.html;
        break;
      }
      case "refund-request": {
        const t = adminTemplates.adminRefundRequestTemplate({ adminName: vars.adminName ?? "Admin", refundId: vars.refundId ?? "-", orderId: vars.orderId ?? "-", nominal: vars.nominal ?? 0 });
        subject = t.subject; html = t.html;
        break;
      }
      case "low-stock": {
        const t = adminTemplates.adminLowStockTemplate({ adminName: vars.adminName ?? "Admin", products: (vars.products ?? []).map(p => ({ nama: p.nama, stok: p.stok ?? 0, sku: p.sku })) });
        subject = t.subject; html = t.html;
        break;
      }
      case "out-of-stock": {
        const t = adminTemplates.adminOutOfStockTemplate({ adminName: vars.adminName ?? "Admin", products: vars.products ?? [] });
        subject = t.subject; html = t.html;
        break;
      }
      case "system-error": {
        const t = adminTemplates.adminSystemErrorTemplate({ adminName: vars.adminName ?? "Admin", errorMessage: vars.errorMessage ?? "Unknown", context: vars.context });
        subject = t.subject; html = t.html;
        break;
      }
      case "new-komplain": {
        if (!vars.komplainId || !vars.customerName || !vars.jenisLabel) return;
        const t = adminTemplates.adminNewKomplainTemplate({ adminName: vars.adminName ?? "Admin", komplainId: vars.komplainId, customerName: vars.customerName, jenisLabel: vars.jenisLabel });
        subject = t.subject; html = t.html;
        break;
      }
      case "new-tukar": {
        if (!vars.tukarId || !vars.customerName || !vars.orderId || !vars.productNama || !vars.ukuranBaru) return;
        const t = adminTemplates.adminNewTukarTemplate({ adminName: vars.adminName ?? "Admin", tukarId: vars.tukarId, customerName: vars.customerName, orderId: vars.orderId, productNama: vars.productNama, ukuranBaru: vars.ukuranBaru });
        subject = t.subject; html = t.html;
        break;
      }
      default: return;
    }

    if (!subject || !html) return;

    // Dedup: cek apakah email admin dengan jenis+orderId yang sama sudah dikirim
    const emailType = `ADMIN_${kind.toUpperCase().replace(/-/g, "_")}`;
    if (await isDuplicateEmail({ type: emailType, recipient: vars.adminEmail, relatedOrderId: vars.orderId })) return;

    const result = await sendEmail({ to: vars.adminEmail, subject, html, tag: `admin-${kind}` });
    await logEmail({ recipient: vars.adminEmail, subject, type: emailType, status: result.success ? "SENT" : "FAILED", error: result.error, messageId: result.messageId, relatedOrderId: vars.orderId });
  } catch (e: unknown) { console.error("[email/send] sendAdminEmail failed:", e); }
}

export async function sendKomplainEmail(kind: KomplainEmailKind, vars: KomplainEmailVars): Promise<void> {
  try {
    let subject = "";
    let html = "";

    switch (kind) {
      case "komplain-created": {
        if (!vars.komplainId) return;
        const t = orderTemplates.komplainCreatedTemplate({ recipientName: vars.recipientName, komplainId: vars.komplainId });
        subject = t.subject; html = t.html;
        break;
      }
      case "komplain-replied": {
        if (!vars.komplainId) return;
        const t = orderTemplates.komplainRepliedTemplate({ recipientName: vars.recipientName, komplainId: vars.komplainId, adminName: vars.adminName });
        subject = t.subject; html = t.html;
        break;
      }
      default: return;
    }

    if (!subject || !html) return;
    const result = await sendEmail({ to: vars.recipientEmail, subject, html, tag: kind });
    await logEmail({ recipient: vars.recipientEmail, subject, type: `KOMPLAIN_${kind.toUpperCase().replace(/-/g, "_")}`, status: result.success ? "SENT" : "FAILED", error: result.error, messageId: result.messageId });
  } catch (e: unknown) { console.error("[email/send] sendKomplainEmail failed:", e); }
}