// app/api/admin/whatsapp-transactional/[id]/route.ts
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { NextRequest } from "next/server";

export const DELETE = handler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireAdmin();

  const { id } = await params;
  if (!id) {
    return fail(400, "ID tidak valid");
  }

  // Attempt to delete notificationlog by id
  try {
    await prisma.notificationlog.delete({
      where: { id },
    });
    return ok({ message: "Log berhasil dihapus" });
  } catch {
    // If not found, prisma throws an error
    return fail(404, "Log tidak ditemukan");
  }
});
