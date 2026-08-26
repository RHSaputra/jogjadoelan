import { logger } from "@/lib/logger";
// POST /api/auth/register
// Body: { username, email, noHp, password, alamat: { ... } }
// Membuat User + 1 Alamat utama dalam 1 transaction.

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { sendAuthEmail } from "@/lib/email/send";
import crypto from "crypto";


const alamatSchema = z.object({
  label: z.string().min(1),
  penerima: z.string().min(1),
  noHp: z.string().min(8),
  provinsi: z.string().min(1),
  kota: z.string().min(1),
  kecamatan: z.string().min(1),
  kodePos: z.string().min(3),
  detail: z.string().min(1),
});

const bodySchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username hanya huruf, angka, _ atau ."),
  email: z.string().email(),
  noHp: z.string().min(8),
  password: z
    .string()
    .min(12, "Password minimal 12 karakter")
    .regex(/[a-z]/, "Harus ada huruf kecil")
    .regex(/[A-Z]/, "Harus ada huruf besar")
    .regex(/[0-9]/, "Harus ada angka"),
  alamat: alamatSchema,
});

function normalizeNoHp(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("62")) return d;
  if (d.startsWith("0")) return "62" + d.slice(1);
  if (d.startsWith("8")) return "62" + d;
  return d;
}

export const POST = handler(async (req: Request) => {
  const json = await req.json();
  const data = bodySchema.parse(json);
  const usernameLower = data.username.toLowerCase();
  const emailLower = data.email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: emailLower }, { username: usernameLower }] },
  });
  if (existing) {
    if (existing.email === emailLower) return fail(409, "Email sudah terdaftar", "EMAIL_TAKEN");
    return fail(409, "Username sudah dipakai", "USERNAME_TAKEN");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      username: usernameLower,
      email: emailLower,
      noHp: normalizeNoHp(data.noHp),
      passwordHash,
      provider: "MANUAL",
      alamat: {
        create: {
          label: data.alamat.label,
          penerima: data.alamat.penerima,
          noHp: normalizeNoHp(data.alamat.noHp),
          provinsi: data.alamat.provinsi,
          kota: data.alamat.kota,
          kecamatan: data.alamat.kecamatan,
          kodePos: data.alamat.kodePos,
          detail: data.alamat.detail,
          isUtama: true,
        },
      },
    },
    include: { alamat: true },
  });

  // Kirim welcome email & welcome WhatsApp (non-blocking)
  sendAuthEmail("welcome", {
    recipientEmail: user.email,
    recipientName: user.username,
    recipientPhone: user.noHp,
    userId: user.id,
  }).catch((err) => logger.error("[EMAIL] welcome email send failed:", err));

  // Generate verification token and send verification email + OTP WhatsApp (non-blocking)
  (async () => {
    try {
      const emailToken = crypto.randomBytes(32).toString("hex");
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Save email link token (valid 24h)
      await prisma.verificationtoken.create({
        data: {
          userId: user.id,
          email: user.email,
          token: emailToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Save WhatsApp OTP code (valid 15 mins)
      await prisma.verificationtoken.create({
        data: {
          userId: user.id,
          email: user.email,
          token: otpCode,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${emailToken}`;
      sendAuthEmail("verify-email", {
        recipientEmail: user.email,
        recipientName: user.username,
        recipientPhone: user.noHp,
        userId: user.id,
        verifyUrl,
      }).catch((err) => logger.error("[EMAIL] verify-email send failed:", err));
    } catch (err) {
      logger.error("Failed to send verification email/OTP:", err);
    }
  })();

  return ok({
    id: user.id,
    username: user.username,
    email: user.email,
  });
});
