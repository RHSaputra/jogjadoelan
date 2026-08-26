// GET /api/auth/verify-email?token=xxx
// Verify email token and mark user as verified
import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return Response.json({ success: false, error: "Token tidak ditemukan" }, { status: 400 });
  }

  const verificationToken = await prisma.verificationtoken.findUnique({
    where: { token },
  });

  if (!verificationToken) {
    return Response.json({ success: false, error: "Token tidak valid" }, { status: 400 });
  }

  const now = new Date();
  if (verificationToken.expiresAt < now) {
    return Response.json({ success: false, error: "Token sudah kadaluarsa" }, { status: 400 });
  }

  if (verificationToken.usedAt) {
    return Response.json({ success: false, error: "Token sudah digunakan" }, { status: 400 });
  }

  // Mark token as used AND update user emailVerified timestamp
  await prisma.$transaction([
    prisma.verificationtoken.update({
      where: { id: verificationToken.id },
      data: { usedAt: now },
    }),
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerifiedAt: now },
    }),
  ]);

  // Redirect to success page or return JSON
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return Response.redirect(`${appUrl}/auth/verify-email/success`);
}