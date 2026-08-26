import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { mapProdukToDTO } from "@/lib/api/produk-mapper";

const schema = z.object({ ids: z.array(z.string()).default([]) });

export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());
  if (body.ids.length === 0) return ok([]);
  const rows = await prisma.produk.findMany({
    where: { id: { in: body.ids } },
    include: { produkimage: true },
  });
  return ok(rows.map(mapProdukToDTO));
});