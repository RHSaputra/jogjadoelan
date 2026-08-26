// POST /api/admin/auth/forgot-password
// Body: { email }
// Generate resetToken, simpan ke AdminUser, kirim email.
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { sendAuthEmail } from "@/lib/email/send";

const schema = z.object({ email: z.string().email() });

export const POST = handler(async (req: Request) => {
  const { email } = schema.parse(await req.json());
  const admin = await prisma.adminuser.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin) return fail(404, "Email belum terdaftar sebagai admin", "NOT_FOUND");

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.adminuser.update({
    where: { id: admin.id },
    data: { resetToken, resetTokenExpiry },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  sendAuthEmail("forgot-password", {
    recipientEmail: admin.email!,
    recipientName: admin.nama,
    resetUrl: `${appUrl}/admin/lupa-password/baru?email=${encodeURIComponent(admin.email!)}&token=${resetToken}`,
  }).catch(err => console.error("[EMAIL] admin forgot-password failed:", err));

  return ok({ sent: true });
});
