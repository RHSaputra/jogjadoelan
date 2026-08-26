// POST /api/auth/reset-password
// Body: { email, token, newPassword }
// Validasi resetToken + expiry sebelum ganti password.
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { sendAuthEmail } from "@/lib/email/send";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(1, "Token reset diperlukan"),
  newPassword: z
    .string()
    .min(12)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

export const POST = handler(async (req: Request) => {
  const { email, token, newPassword } = schema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return fail(404, "Email tidak ditemukan", "NOT_FOUND");

  // Validasi token
  if (!user.resetToken || !user.resetTokenExpiry) {
    return fail(400, "Tidak ada permintaan reset password. Silakan minta ulang.", "NO_RESET_REQUEST");
  }
  if (user.resetToken !== token.trim()) {
    return fail(400, "Token reset tidak valid", "INVALID_TOKEN");
  }
  if (user.resetTokenExpiry < new Date()) {
    return fail(400, "Token reset sudah kadaluarsa. Silakan minta ulang.", "TOKEN_EXPIRED");
  }

  // Hash password baru dan hapus token
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  // Kirim email password berhasil diubah (non-blocking)
  sendAuthEmail("password-reset-success", {
    recipientEmail: user.email,
    recipientName: user.username,
  }).catch(err => console.error("[EMAIL] password-reset-success failed:", err));

  return ok({ updated: true });
});
