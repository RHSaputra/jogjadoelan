/**
 * Email domain policy — handles unverified Resend domain gracefully.
 * When domain is not verified, only admin/test emails are allowed.
 * Full external sending activates automatically once domain is verified.
 */
import { Resend } from "resend";

export interface EmailSendPolicy {
  configured: boolean;
  fromEmail: string;
  isSandbox: boolean;
  domainVerified: boolean;
  externalSendingAllowed: boolean;
  allowedTestEmails: string[];
  message: string;
}

let cachedPolicy: { policy: EmailSendPolicy; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function parseFromEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function getAllowedTestEmails(): string[] {
  const list: string[] = [];
  const envList = process.env.EMAIL_ALLOWED_TEST_RECIPIENTS;
  if (envList) {
    list.push(...envList.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
  }
  const adminEmail = process.env.ADMIN_TEST_EMAIL;
  if (adminEmail) list.push(adminEmail.trim().toLowerCase());
  return [...new Set(list)];
}

export async function getEmailSendPolicy(): Promise<EmailSendPolicy> {
  if (cachedPolicy && Date.now() < cachedPolicy.expiresAt) {
    return cachedPolicy.policy;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromRaw = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const fromEmail = parseFromEmail(fromRaw);
  const isSandbox = fromEmail.includes("onboarding@resend.dev");
  const allowedTestEmails = getAllowedTestEmails();

  let domainVerified = isSandbox;
  let details = "";

  if (apiKey && apiKey !== "re_placeholder_no_key" && !isSandbox) {
    try {
      const resend = new Resend(apiKey);
      const list = await resend.domains.list();
      if (list.error) {
        details = list.error.message;
      } else if (list.data?.data) {
        const domain = fromEmail.split("@")[1];
        domainVerified = list.data.data.some(
          (d) => d.name === domain && d.status === "verified"
        );
      }
    } catch (err) {
      details = err instanceof Error ? err.message : String(err);
    }
  }

  const configured = !!apiKey && apiKey !== "re_placeholder_no_key";

  // Sandbox (onboarding@resend.dev): hanya email test/admin yang diizinkan
  // Production tanpa domain verified: dibatasi sama
  const externalSendingAllowed = !configured
    ? true
    : isSandbox
      ? false
      : domainVerified;

  const policy: EmailSendPolicy = {
    configured,
    fromEmail,
    isSandbox,
    domainVerified: isSandbox ? false : domainVerified,
    externalSendingAllowed,
    allowedTestEmails,
    message: externalSendingAllowed
      ? domainVerified
        ? "Domain terverifikasi. Pengiriman email eksternal aktif."
        : "Mode development — email dicatat ke console."
      : isSandbox
        ? "Domain email belum diverifikasi. Pengiriman email eksternal dibatasi oleh Resend (sandbox). Hanya email admin/test yang diizinkan."
        : "Domain email belum diverifikasi. Pengiriman email eksternal dibatasi oleh Resend. Hanya email admin/test yang diizinkan.",
  };

  if (details && !domainVerified) {
    policy.message += ` (${details})`;
  }

  cachedPolicy = { policy, expiresAt: Date.now() + CACHE_TTL_MS };
  return policy;
}

export function canSendToRecipient(
  recipient: string,
  policy: EmailSendPolicy
): { allowed: boolean; reason?: string; mode: "production" | "test-only" | "skipped" } {
  const email = recipient.trim().toLowerCase();

  if (!policy.configured) {
    return { allowed: true, mode: "test-only" };
  }

  if (policy.externalSendingAllowed) {
    return { allowed: true, mode: "production" };
  }

  if (policy.allowedTestEmails.includes(email)) {
    return { allowed: true, mode: "test-only" };
  }

  return {
    allowed: false,
    mode: "skipped",
    reason:
      "Domain belum diverifikasi. Email eksternal dibatasi. Tambahkan recipient ke EMAIL_ALLOWED_TEST_RECIPIENTS atau verifikasi domain di Resend.",
  };
}

export function clearEmailPolicyCache(): void {
  cachedPolicy = null;
}
