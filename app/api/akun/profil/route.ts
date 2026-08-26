// PATCH /api/akun/profil — update profil user (nama, email, noHp, avatar)

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";

const schema = z.object({
  nama: z.string().min(1).max(50),
  email: z.string().email("Format email tidak valid"),
  noHp: z
    .string()
    .regex(/^08\d{8,11}$/, "No. HP harus diawali 08, 10–13 digit"),
  avatar: z.string().nullable().optional(),
});

export const PATCH = handler(async (req: Request) => {
  const me = await requireUser();
  const { nama, email, noHp, avatar } = schema.parse(await req.json());

  const emailTaken = await prisma.user.findFirst({
    where: { email, NOT: { id: me.id } },
  });
  if (emailTaken) return fail(400, "Email sudah digunakan akun lain", "EMAIL_TAKEN");

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
      username: nama,
      email,
      noHp,
      ...(avatar !== undefined ? { avatar: avatar ?? null } : {}),
    },
  });

  return ok({
    id: updated.id,
    username: updated.username,
    nama: updated.username,
    email: updated.email,
    noHp: updated.noHp,
    avatar: updated.avatar,
  });
});
