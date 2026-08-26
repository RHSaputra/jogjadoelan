import { logger } from "@/lib/logger";
// GET /api/ongkir/kota — Biteship area search
// Query: ?q=yogya (keyword search, min 2 chars)
import { ok, fail, handler } from "@/lib/api/response";
import { searchAreas } from "@/lib/biteship";

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return ok([]);
  }

  try {
    const results = await searchAreas(q.trim());
    // Map Biteship area ke format yg cocok untuk UI
    const mapped = results.map((a) => ({
      id: a.id,
      name: a.name,
      postal_code: a.postal_code,
      province: a.administrative_division_level_1_name,
      city: a.administrative_division_level_2_name ?? "",
      type: a.type,
    }));
    return ok(mapped);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Gagal mencari area";
    logger.error("[ongkir/kota]", msg);
    return fail(502, msg);
  }
});