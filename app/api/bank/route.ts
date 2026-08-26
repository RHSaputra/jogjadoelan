// GET /api/bank — public: daftar bank aktif untuk customer (halaman pembayaran)
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";

export const GET = handler(async () => {
  const banks = await prisma.bank.findMany({
    where: { aktif: true },
    orderBy: { urutan: "asc" },
  });
  return ok(banks);
});
