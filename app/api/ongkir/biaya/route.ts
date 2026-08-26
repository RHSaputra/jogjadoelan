import { logger } from "@/lib/logger";
// POST /api/ongkir/biaya
// Body: { destinationPostalCode: string; items: Array<{weight:number,quantity:number,value:number}> }
// atau: { destinationPostalCode: string; weight: number } (convenience)
import { z } from "zod";
import { ok, fail, handler } from "@/lib/api/response";
import { getRates, BITESHIP_COURIERS } from "@/lib/biteship";

const postSchema = z.object({
  destinationPostalCode: z.string().min(1),
  weight: z.number().int().min(1).optional(),
  quantity: z.number().int().min(1).optional(),
  items: z.array(z.object({
    weight: z.number().min(1),
    quantity: z.number().int().min(1),
    value: z.number().min(0),
  })).optional(),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
});

export const POST = handler(async (req: Request) => {
  const body = postSchema.parse(await req.json());

  // Convenience: kalau weight diberikan tapi items tidak, buat items otomatis.
  // Catatan: sebelumnya ada fallback hardcoded 500g; ini bisa menyebabkan ongkir meleset.
  // Jika client hanya kirim `weight`, gunakan itu. Jika tidak ada sama sekali, tetap fail agar akurat.
  if (!body.items && body.weight === undefined) {
    return fail(400, "Missing weight/items for ongkir calculation");
  }

  const items =
    body.items ??
    (body.weight
      ? [{
          weight: body.weight,
          quantity: body.quantity ?? 1,
          value: 100000,
        }]
      : []);

  try {
    const couriers = Object.keys(BITESHIP_COURIERS); // semua: jne, jnt, pos, anteraja, gosend, grabexpress

    const rates = await getRates({
      destinationPostalCode: body.destinationPostalCode,
      couriers,
      items,
      destinationLat: body.destinationLat,
      destinationLng: body.destinationLng,
    });

    // Group by courier
    const grouped: Record<string, { courier_name: string; courier_code: string; services: typeof rates }> = {};
    for (const r of rates) {
      if (!grouped[r.courier_code]) {
        grouped[r.courier_code] = { courier_name: r.courier_name, courier_code: r.courier_code, services: [] };
      }
      grouped[r.courier_code].services.push(r);
    }

    return ok(Object.values(grouped));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Gagal menghitung ongkos kirim";
    logger.error("[ongkir/biaya]", msg);
    return fail(502, msg);
  }
});
