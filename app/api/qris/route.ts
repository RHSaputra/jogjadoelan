// GET /api/qris — public: config QRIS untuk customer
// Selalu return config (bukan 404) agar customer tahu QRIS ada/tidak
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";

export const GET = handler(async () => {
  const qris = await prisma.qrisconfig.findUnique({ where: { id: 1 } });
  // Selalu return config - customer cek .aktif untuk tahuQRIS aktif
  return ok(qris ?? { id: 1, merchantName: "Jogjadoelan QRIS", qrPath: null, aktif: false });
});
