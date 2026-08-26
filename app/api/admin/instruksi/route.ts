// GET /api/admin/instruksi — ambil 3 instruksi pembayaran
// PUT /api/admin/instruksi — update instruksi pembayaran
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const DEFAULTS = {
  READY_STOK: "Lakukan pembayaran sesuai total tagihan ke salah satu rekening di atas.",
  CUSTOM_DP: "Bayar DP minimal 50% agar pesanan custom Anda segera mulai diproduksi.",
  PELUNASAN: "Lakukan pelunasan sisa tagihan. Barang akan dikirim setelah pelunasan dikonfirmasi.",
};

async function getAll() {
  const rows = await prisma.instruksipembayaran.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.isi;
  return {
    readyStok: map["READY_STOK"] ?? DEFAULTS.READY_STOK,
    customDp: map["CUSTOM_DP"] ?? DEFAULTS.CUSTOM_DP,
    pelunasan: map["PELUNASAN"] ?? DEFAULTS.PELUNASAN,
  };
}

export const GET = handler(async () => {
  await requireAdmin();
  return ok(await getAll());
});

const putSchema = z.object({
  readyStok: z.string().optional(),
  customDp: z.string().optional(),
  pelunasan: z.string().optional(),
});

export const PUT = handler(async (req: Request) => {
  await requireAdmin();
  const body = putSchema.parse(await req.json());
  const upserts = [];
  if (body.readyStok !== undefined)
    upserts.push(prisma.instruksipembayaran.upsert({ where: { key: "READY_STOK" }, update: { isi: body.readyStok }, create: { key: "READY_STOK", isi: body.readyStok } }));
  if (body.customDp !== undefined)
    upserts.push(prisma.instruksipembayaran.upsert({ where: { key: "CUSTOM_DP" }, update: { isi: body.customDp }, create: { key: "CUSTOM_DP", isi: body.customDp } }));
  if (body.pelunasan !== undefined)
    upserts.push(prisma.instruksipembayaran.upsert({ where: { key: "PELUNASAN" }, update: { isi: body.pelunasan }, create: { key: "PELUNASAN", isi: body.pelunasan } }));
  await Promise.all(upserts);
  return ok(await getAll());
});
