// lib/email/templates/auth.ts — Professional Auth Email Templates
import { wrapBaseTemplate } from "./base";

function appUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "https://jogjadoelan.com"}${path}`;
}

/**
 * Welcome Email — Selamat datang di Jogjadoelan
 * Professional, warm, encouraging
 */
export function welcomeEmailTemplate(vars: { recipientName: string }): { subject: string; html: string } {
  const subject = "Selamat Datang di Jogjadoelan! 🎉";
  const html = wrapBaseTemplate({
    title: "Selamat Bergabung!",
    recipientName: vars.recipientName,
    preheader: "Akun Jogjadoelan Anda berhasil dibuat. Mulai jelajahi koleksi helm jadul terbaik!",
    content: `
      <p style="margin: 0 0 16px;">Terima kasih telah mendaftar di <strong>Jogjadoelan</strong> — tempat terbaik untuk helm jadul berkualitas original.</p>
      <p style="margin: 0 0 8px;">Sekarang Anda bisa:</p>
      <table style="width: 100%; margin: 12px 0;">
        <tr><td style="padding: 6px 0; color: #374151; font-size: 14px;">🛒 <strong>Belanja</strong> — Jelajahi koleksi helm jadul terbaik</td></tr>
        <tr><td style="padding: 6px 0; color: #374151; font-size: 14px;">🎨 <strong>Custom</strong> — Buat helm impian sesuai selera</td></tr>
        <tr><td style="padding: 6px 0; color: #374151; font-size: 14px;">📦 <strong>Lacak</strong> — Pantau pesanan secara real-time</td></tr>
        <tr><td style="padding: 6px 0; color: #374151; font-size: 14px;">🎁 <strong>Promo</strong> — Dapatkan penawaran eksklusif member</td></tr>
      </table>
      <p style="margin: 16px 0 0; color: #6B7280; font-size: 14px;">Ada pertanyaan? Tim support kami siap membantu via WhatsApp atau email.</p>`,
    ctaUrl: appUrl("/belanja"),
    ctaLabel: "Mulai Belanja",
  });
  return { subject, html };
}

/**
 * Forgot Password — Reset password dengan aman
 */
export function forgotPasswordTemplate(vars: { recipientName: string; resetUrl: string }): { subject: string; html: string } {
  const subject = "Reset Password — Jogjadoelan";
  const html = wrapBaseTemplate({
    title: "Reset Password",
    recipientName: vars.recipientName,
    preheader: "Klik tombol di bawah untuk mereset password akun Jogjadoelan Anda.",
    content: `
      <p style="margin: 0 0 12px;">Kami menerima permintaan reset password untuk akun Anda.</p>
      <p style="margin: 0 0 12px;">Klik tombol di bawah untuk membuat password baru:</p>
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 14px; margin: 12px 0;">
        <p style="margin: 0; color: #991B1B; font-size: 13px;">
          ⚠️ Tautan ini hanya berlaku selama <strong>1 jam</strong>. Jangan bagikan tautan ini kepada siapa pun.
        </p>
      </div>
      <p style="margin: 12px 0 0; color: #6B7280; font-size: 13px;">Jika Anda tidak meminta reset password, abaikan email ini. Akun Anda tetap aman.</p>`,
    ctaUrl: vars.resetUrl,
    ctaLabel: "Reset Password",
  });
  return { subject, html };
}

/**
 * Password Reset Success — Konfirmasi password berubah
 */
export function passwordResetSuccessTemplate(vars: { recipientName: string }): { subject: string; html: string } {
  const subject = "Password Berhasil Diubah — Jogjadoelan";
  const html = wrapBaseTemplate({
    title: "Password Berhasil Diubah",
    recipientName: vars.recipientName,
    preheader: "Password akun Jogjadoelan Anda telah berhasil diperbarui.",
    statusBadge: "Berhasil",
    content: `
      <p style="margin: 0 0 12px;">Password akun Anda telah berhasil diubah.</p>
      <p style="margin: 0 0 8px;">Jika Anda yang melakukan perubahan ini, Anda bisa mengabaikan email ini.</p>
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 14px; margin: 12px 0;">
        <p style="margin: 0; color: #991B1B; font-size: 13px;">
          🔴 Jika Anda <strong>TIDAK</strong> merasa melakukan perubahan ini, segera hubungi kami.
        </p>
      </div>`,
    ctaUrl: appUrl("/akun"),
    ctaLabel: "Ke Akun Saya",
  });
  return { subject, html };
}

/**
 * Admin Password Changed — Notifikasi untuk admin
 */
export function adminPasswordChangedTemplate(vars: { recipientName: string }): { subject: string; html: string } {
  const subject = "Password Admin Berhasil Diubah — Jogjadoelan";
  const html = wrapBaseTemplate({
    title: "Password Admin Diubah",
    recipientName: vars.recipientName,
    preheader: "Password akun admin Jogjadoelan telah diperbarui.",
    statusBadge: "Berhasil",
    content: `
      <p style="margin: 0 0 12px;">Password akun admin <strong>${vars.recipientName}</strong> telah berhasil diubah.</p>
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 14px; margin: 12px 0;">
        <p style="margin: 0; color: #991B1B; font-size: 13px;">
          🔴 Jika Anda <strong>TIDAK</strong> melakukan perubahan ini, segera hubungi super admin.
        </p>
      </div>`,
    ctaUrl: appUrl("/admin"),
    ctaLabel: "Ke Dashboard Admin",
  });
  return { subject, html };
}

/**
 * Verify Email — (ready untuk implementasi)
 */
export function verifyEmailTemplate(vars: { recipientName: string; verifyUrl: string }): { subject: string; html: string } {
  const subject = "Verifikasi Email — Jogjadoelan";
  const html = wrapBaseTemplate({
    title: "Verifikasi Alamat Email",
    recipientName: vars.recipientName,
    preheader: "Klik tombol di bawah untuk verifikasi email Anda.",
    content: `
      <p style="margin: 0 0 16px;">Terima kasih telah mendaftar di Jogjadoelan!</p>
      <p style="margin: 0 0 8px;">Silakan klik tombol di bawah untuk memverifikasi alamat email Anda dan mengaktifkan akun sepenuhnya.</p>
      <div style="background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; padding: 12px 14px; margin: 12px 0;">
        <p style="margin: 0; color: #9A3412; font-size: 13px;">⏰ Tautan ini berlaku selama <strong>1 jam</strong>.</p>
      </div>`,
    ctaUrl: vars.verifyUrl,
    ctaLabel: "Verifikasi Email",
  });
  return { subject, html };
}