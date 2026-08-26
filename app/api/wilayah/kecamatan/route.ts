// GET /api/wilayah/kecamatan?id_kabupaten=3471 (Kota Yogyakarta = 3471)
import { ok, fail, handler } from "@/lib/api/response";
import { getKecamatan } from "@/lib/wilayah-id";

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const idKabupaten = searchParams.get("id_kabupaten");
  if (!idKabupaten) return fail(400, "id_kabupaten wajib");
  const data = await getKecamatan(idKabupaten);
  return ok(data);
});