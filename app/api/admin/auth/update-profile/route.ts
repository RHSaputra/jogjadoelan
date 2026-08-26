// PATCH /api/admin/auth/update-profile

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const schema = z.object({
  nama: z.string().min(1).optional(),
  email: z.string().email().optional(),
  noHp: z.string().min(8).optional(),
  foto: z.string().optional(),
});

export const PATCH = handler(async (req: Request) => {
  const me = await requireAdmin();
  const data = schema.parse(await req.json());
  const updated = await prisma.adminuser.update({
    where: { id: me.id },
    data,
  });
  return ok({
    id: updated.id,
    username: updated.username,
    nama: updated.nama,
    email: updated.email,
    noHp: updated.noHp,
    foto: updated.foto,
  });
});