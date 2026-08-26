// POST /api/admin/auth/change-password
// Body: { oldPassword, newPassword }

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const schema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

export const POST = handler(async (req: Request) => {
  const me = await requireAdmin();
  const { oldPassword, newPassword } = schema.parse(await req.json());

  const admin = await prisma.adminuser.findUnique({ where: { id: me.id } });
  if (!admin) return fail(404, "Akun tidak ditemukan");

  const okOld = await bcrypt.compare(oldPassword, admin.passwordHash);
  if (!okOld) return fail(400, "Password lama salah", "WRONG_PASSWORD");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.adminuser.update({ where: { id: me.id }, data: { passwordHash } });
  return ok({ updated: true });
});