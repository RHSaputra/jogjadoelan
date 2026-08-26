// GET /api/auth/me
// Return full profil user (termasuk alamat) dari DB.

import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth-server";

export const GET = handler(async () => {
  const sess = await getSessionUser();
  if (!sess) return fail(401, "Belum login", "UNAUTHENTICATED");

  // Admin tidak punya entry di tabel User
  if (sess.role !== "USER") {
    const admin = await prisma.adminuser.findUnique({ where: { id: sess.id } });
    if (!admin) return fail(404, "Admin tidak ditemukan");
    return ok({
      kind: "admin" as const,
      id: admin.id,
      username: admin.username,
      nama: admin.nama,
      email: admin.email,
      noHp: admin.noHp,
      foto: admin.foto,
      role: admin.role,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: sess.id },
    include: { alamat: { orderBy: { isUtama: "desc" } } },
  });
  if (!user) return fail(404, "User tidak ditemukan");

  return ok({
    kind: "user" as const,
    id: user.id,
    username: user.username,
    nama: user.username,
    email: user.email,
    noHp: user.noHp,
    avatar: user.avatar,
    provider: user.provider.toLowerCase(),
    alamat: user.alamat.map((a) => ({
      id: a.id,
      label: a.label,
      penerima: a.penerima,
      noHp: a.noHp,
      provinsi: a.provinsi,
      kota: a.kota,
      kecamatan: a.kecamatan,
      kodePos: a.kodePos,
      detail: a.detail,
      isUtama: a.isUtama,
      isToko: a.isToko,
      isPengembalian: a.isPengembalian,
    })),
  });
});