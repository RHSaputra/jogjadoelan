// POST /api/auth/forgot-password
// Body: { email, channel }
// Generate resetToken (crypto random), simpan ke DB dengan expiry 1 jam.
// Return token ke client (production: kirim via email/WA).
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { dispatchNotification } from "@/lib/notification-dispatcher";

const schema = z.object({
  email: z.string().email(),
  channel: z.enum(["email", "whatsapp"]).default("email"),
});

export const POST = handler(async (req: Request) => {
  const { email, channel } = schema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return fail(404, "Email belum terdaftar", "NOT_FOUND");

  // Generate secure random token (same token for both flows)
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/lupa-password/baru?email=${encodeURIComponent(user.email)}&token=${resetToken}`;

  // Kirim melalui channel pilihan user (non-blocking)
  dispatchNotification(
    "forgot-password",
    {
      recipientEmail: user.email,
      recipientName: user.username,
      recipientPhone: user.noHp,
      userId: user.id,
      resetUrl,
    },
    {
      email: channel === "email",
      whatsapp: channel === "whatsapp",
    }
  ).catch((err) => console.error("[FORGOT PASSWORD] Notification failed:", err));

  return ok({ sent: true, channel });
});
