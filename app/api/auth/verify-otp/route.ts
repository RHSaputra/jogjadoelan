// app/api/auth/verify-otp/route.ts
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { normalizeNoHp } from "@/lib/whatsapp";

const verifySchema = z.object({
  noHp: z.string().min(8, "Nomor HP tidak valid"),
  code: z.string().length(6, "Kode verifikasi harus 6 digit"),
});

export const POST = handler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const parsed = verifySchema.safeParse(body);

  if (!parsed.success) {
    return fail(422, parsed.error.issues[0]?.message || "Payload tidak valid");
  }

  const { noHp, code } = parsed.data;
  const normalizedPhone = normalizeNoHp(noHp);

  // Find user by normalized phone number
  const user = await prisma.user.findFirst({
    where: { noHp: normalizedPhone },
  });

  if (!user) {
    return fail(404, "Akun dengan nomor HP tersebut tidak ditemukan");
  }

  // Find the verification token in DB
  const verificationToken = await prisma.verificationtoken.findFirst({
    where: {
      userId: user.id,
      token: code,
    },
  });

  if (!verificationToken) {
    return fail(400, "Kode verifikasi salah atau tidak valid");
  }

  const now = new Date();
  if (verificationToken.expiresAt < now) {
    return fail(400, "Kode verifikasi sudah kadaluarsa");
  }

  if (verificationToken.usedAt) {
    return fail(400, "Kode verifikasi sudah pernah digunakan");
  }

  // Mark token as used and mark user as verified
  await prisma.$transaction([
    prisma.verificationtoken.update({
      where: { id: verificationToken.id },
      data: { usedAt: now },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: now },
    }),
  ]);

  return ok({
    success: true,
    message: "Akun Anda berhasil diverifikasi!",
  });
});
