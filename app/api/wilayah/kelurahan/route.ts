import { logger } from "@/lib/logger";
// GET /api/wilayah/kelurahan?id_kecamatan=347101
import { ok, fail, handler } from "@/lib/api/response";
import { getKelurahan } from "@/lib/wilayah-id";

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const idKecamatan = searchParams.get("id_kecamatan");
  if (!idKecamatan) return fail(400, "id_kecamatan wajib");

  try {
    const data = await getKelurahan(idKecamatan);
    return ok(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Gagal mengambil data kelurahan";
    logger.error("[wilayah/kelurahan]", msg);
    return fail(502, msg);
  }
});