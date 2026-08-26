// GET /api/ekspedisi — public: daftar ekspedisi aktif untuk customer
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";

export const GET = handler(async () => {
  const list = await prisma.ekspedisi.findMany({
    where: { aktif: true },
    orderBy: { urutan: "asc" },
  });
  return ok(list);
});
