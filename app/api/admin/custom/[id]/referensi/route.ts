// POST   /api/admin/custom/[id]/referensi  body: { paths: string[] } → tambah referensi
// DELETE /api/admin/custom/[id]/referensi  body: { path: string }    → hapus 1 referensi
//
// Akses: admin ATAU owner order.

import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";
import { AddReferensiSchema, RemoveReferensiSchema } from "@/lib/api/custom-schemas";
import { mapCustomOrderToDTO } from "@/lib/api/custom-mapper";

const INCLUDE = {
  user: { select: { id: true, username: true, email: true } },
  customprogress: { orderBy: { createdAt: "asc" as const } },
  payment: { orderBy: { createdAt: "asc" as const } },
};

async function assertAccess(userId: string, role: string, id: string) {
  const o = await prisma.customorder.findUnique({ where: { id }, select: { userId: true } });
  if (!o) return { err: fail(404, "Custom order tidak ditemukan") as Response };
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  if (!isAdmin && o.userId !== userId) return { err: fail(403, "Akses ditolak") as Response };
  return {};
}

export const POST = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const u = await requireUser();
    const { id } = await ctx.params;
    const acc = await assertAccess(u.id, u.role, id);
    if (acc.err) return acc.err;

    const parsed = AddReferensiSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(422, "Paths tidak valid");

    const current = await prisma.customorder.findUnique({
      where: { id }, select: { referensiPaths: true },
    });
    const arr = Array.isArray(current?.referensiPaths) ? (current!.referensiPaths as string[]) : [];
    const merged = Array.from(new Set([...arr, ...parsed.data.paths])).slice(0, 20);

    const updated = await prisma.customorder.update({
      where: { id }, data: { referensiPaths: merged }, include: INCLUDE,
    });
    return ok(mapCustomOrderToDTO(updated));
  },
);

export const DELETE = handler(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const u = await requireUser();
    const { id } = await ctx.params;
    const acc = await assertAccess(u.id, u.role, id);
    if (acc.err) return acc.err;

    const parsed = RemoveReferensiSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(422, "Path tidak valid");

    const current = await prisma.customorder.findUnique({
      where: { id }, select: { referensiPaths: true },
    });
    const arr = Array.isArray(current?.referensiPaths) ? (current!.referensiPaths as string[]) : [];
    const next = arr.filter((p) => p !== parsed.data.path);

    const updated = await prisma.customorder.update({
      where: { id }, data: { referensiPaths: next }, include: INCLUDE,
    });
    return ok(mapCustomOrderToDTO(updated));
  },
);