import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";

export const POST = handler(async () => {
  const u = await requireCustomer();
  await prisma.notifikasi.updateMany({
    where: { userId: u.id, isRead: false },
    data: { isRead: true },
  });
  return ok({ ok: true });
});