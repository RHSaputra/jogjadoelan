// POST /api/akun/password — ganti password user
// Body: { pwdLama, pwdBaru }

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";

const schema = z.object({
  pwdLama: z.string().min(1),
  pwdBaru: z.string().min(12, "Password baru minimal 12 karakter"),
});

export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const { pwdLama, pwdBaru } = schema.parse(await req.json());

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) return fail(404, "Akun tidak ditemukan");
  if (!user.passwordHash)
    return fail(
      400,
      "Akun ini menggunakan login sosial, tidak bisa ganti password",
    );

  const valid = await bcrypt.compare(pwdLama, user.passwordHash);
  if (!valid) return fail(400, "Password lama salah", "WRONG_PASSWORD");

  const passwordHash = await bcrypt.hash(pwdBaru, 10);
  await prisma.user.update({ where: { id: me.id }, data: { passwordHash } });
  return ok({ updated: true });
});
