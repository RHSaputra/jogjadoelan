import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { mapUlasanToDTO } from "@/lib/api/ulasan-mapper";

export const GET = handler(async () => {
  const u = await requireCustomer();
  const rows = await prisma.ulasan.findMany({
    where: { userId: u.id },
    include: {
      user: { select: { id: true, username: true, email: true } },
      produk: { select: { id: true, nama: true, gambarUtama: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(rows.map(mapUlasanToDTO));
});