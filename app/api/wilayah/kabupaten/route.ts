// GET /api/wilayah/kabupaten?id_provinsi=34 (DI Yogyakarta = 34)
import { ok, fail, handler } from "@/lib/api/response";
import { getKabupaten } from "@/lib/wilayah-id";

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const idProvinsi = searchParams.get("id_provinsi");
  if (!idProvinsi) return fail(400, "id_provinsi wajib");
  const data = await getKabupaten(idProvinsi);
  return ok(data);
});