// POST /api/admin/auth/reset-password
// Body: { email, token, newPassword }
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { sendAuthEmail } from "@/lib/email/send";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(1, "Token reset diperlukan"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

export const POST = handler(async (req: Request) => {
  const { email, token, newPassword } = schema.parse(await req.json());
  const admin = await prisma.adminuser.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin) return fail(404, "Admin tidak ditemukan", "NOT_FOUND");

  if (!admin.resetToken || !admin.resetTokenExpiry) {
    return fail(400, "Tidak ada permintaan reset password. Silakan minta ulang.", "NO_RESET_REQUEST");
  }
  if (admin.resetToken !== token.trim()) {
    return fail(400, "Token reset tidak valid", "INVALID_TOKEN");
  }
  if (admin.resetTokenExpiry < new Date()) {
    return fail(400, "Token reset sudah kadaluarsa. Silakan minta ulang.", "TOKEN_EXPIRED");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.adminuser.update({
    where: { id: admin.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  sendAuthEmail("password-reset-success", {
    recipientEmail: admin.email!,
    recipientName: admin.nama,
  }).catch(err => console.error("[EMAIL] admin password-reset-success failed:", err));

  return ok({ updated: true });
});
