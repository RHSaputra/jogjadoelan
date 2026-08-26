// app/api/admin/whatsapp-transactional/delete-bulk/route.ts
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { NextRequest } from "next/server";

export const POST = handler(async (req: NextRequest) => {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const ids: string[] = body.ids || [];

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return fail(400, "Daftar ID tidak valid atau kosong");
  }

  try {
    const result = await prisma.notificationlog.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    return ok({ message: `Berhasil menghapus ${result.count} log transaksional` });
  } catch {
    return fail(500, "Gagal menghapus log transaksional");
  }
});
