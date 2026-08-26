// lib/email/provider.ts — Resend Provider Layer
// Satu-satunya tempat yang langsung berinteraksi dengan Resend SDK.
// Jangan import Resend dari file lain.

import { Resend } from "resend";
import { getEmailSendPolicy, canSendToRecipient } from "./domain-policy";

// Resend hanya mengizinkan pengiriman dari domain terverifikasi atau onboarding@resend.dev.
// Untuk development, gunakan onboarding@resend.dev.
// Untuk production, verify domain di resend.com/domains.
const FROM_EMAIL = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? "Jogjadoelan";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Saat development tanpa API key, return Resend dengan key kosong.
    // Fungsi pengiriman akan log email ke console saja (fallback dev mode).
    return new Resend("re_placeholder_no_key");
  }
  return new Resend(apiKey);
}

/**
 * Kirim email via Resend.
 * - Development tanpa API key: log ke console, return success=true.
 * - Production: kirim via Resend API.
 * - Error handling: log error, return success=false dengan error message.
 */
/**
 * Konfigurasi retry untuk pengiriman email.
 * - maxRetries: jumlah maksimal percobaan ulang (default 3)
 * - baseDelayMs: delay awal dalam milidetik (default 1000ms)
 * - Retry dengan exponential backoff: 1s → 2s → 4s
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
};

/**
 * Menentukan apakah error bersifat transient (bisa di-retry).
 * Rate limit (429), server error (5xx), dan network error termasuk transient.
 * Client error (4xx selain 429) tidak di-retry.
 */
function isTransientError(error: unknown): boolean {
  if (error && typeof error === "object" && "statusCode" in error) {
    const code = (error as Record<string, unknown>).statusCode as number;
    if (typeof code === "number") {
      return code === 429 || code >= 500;
    }
  }
  // Network errors, DNS resolution errors, timeouts — retry
  return true;
}

export async function sendEmail(params: SendParams): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const toList = Array.isArray(params.to) ? params.to : [params.to];

  // DEV MODE — tanpa API key, hanya log
  if (!apiKey) {
    console.log("═══════════════════════════════════════");
    console.log("[EMAIL DEV] Tidak ada RESEND_API_KEY. Log email ke console:");
    console.log(`  To:      ${toList.join(", ")}`);
    console.log(`  Subject: ${params.subject}`);
    console.log(`  Tag:     ${params.tag ?? "-"}`);
    console.log(`  HTML len: ${params.html.length} chars`);
    console.log("═══════════════════════════════════════");
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  const policy = await getEmailSendPolicy();
  for (const recipient of toList) {
    const check = canSendToRecipient(recipient, policy);
    if (!check.allowed) {
      console.warn(`[EMAIL SKIPPED] ${recipient}: ${check.reason}`);
      return {
        success: false,
        error: check.reason ?? "Email dibatasi — domain belum diverifikasi",
        skipped: true,
      };
    }
  }

  let lastError: { message: string; statusCode?: number } | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const to = Array.isArray(params.to) ? params.to : [params.to];
      const { data, error } = await getResend().emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo,
        headers: params.tag ? { "X-Email-Tag": params.tag } : undefined,
      });

      if (error) {
        lastError = { message: error.message ?? String(error), statusCode: (error as Record<string, unknown>).statusCode as number | undefined };

        if (!isTransientError(error)) {
          // Non-transient error (4xx selain 429) — jangan retry
          console.error("[EMAIL ERROR] Resend API non-transient error:", error);
          return { success: false, error: lastError.message };
        }

        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
          console.warn(`[EMAIL RETRY] Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1} gagal. Retry dalam ${delay}ms...`, lastError.message);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        console.error("[EMAIL ERROR] Resend API error setelah semua retry:", error);
        return { success: false, error: lastError.message };
      }

      // Sukses
      console.log(`[EMAIL SUCCESS] Resend API (attempt ${attempt + 1}):`, data);
      const messageId = (data as unknown as Record<string, unknown>)?.id as string | undefined ?? `sent-${Date.now()}`;
      return { success: true, messageId };
    } catch (e: unknown) {
      const err = e as Error & { statusCode?: number };
      lastError = { message: err?.message ?? String(e), statusCode: err?.statusCode };

      if (!isTransientError(e)) {
        console.error("[EMAIL ERROR] Non-transient exception:", e);
        return { success: false, error: lastError.message };
      }

      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
        console.warn(`[EMAIL RETRY] Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1} gagal (exception). Retry dalam ${delay}ms...`, lastError.message);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.error("[EMAIL ERROR] Exception setelah semua retry:", e);
      return { success: false, error: lastError.message };
    }
  }

  // Seharusnya tidak pernah sampai sini, tapi sebagai fallback
  return { success: false, error: lastError?.message ?? "Unknown error after retries" };
}

// Types
interface SendParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tag?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}