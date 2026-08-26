// GET /api/produk/[id]   — id boleh berupa cuid ATAU slug
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { mapProdukToDTO } from "@/lib/api/produk-mapper";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const p = await prisma.produk.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { produkimage: { orderBy: { urutan: "asc" } } },
  });
  if (!p) return fail(404, "Produk tidak ditemukan");

  return ok(mapProdukToDTO(p));
});