import type { Prisma } from "@prisma/client";

/**
 * Mutate stok produk/varian dalam scope transaksi Prisma.
 *
 * Pattern matching:
 * - Cari ProdukVarian by (produkId, ukuran, warna).
 * - Bila ditemukan & stok != null → mutate varian.
 * - Bila tidak ada matching varian (atau stok null) → mutate Produk.stok.
 *
 * @param tx       Prisma transaction client.
 * @param produkId ID produk; bila null → no-op (silent).
 * @param ukuran   ukuran varian (boleh null).
 * @param warna    warna varian (boleh null).
 * @param delta    +1 untuk restock, -1 untuk deduksi.
 * @param opts.guardNegative  bila true & hasil < 0 → throw "Stok varian habis".
 */
export async function mutateProductStock(
  tx: Prisma.TransactionClient,
  produkId: string | null | undefined,
  ukuran: string | null | undefined,
  warna: string | null | undefined,
  delta: number,
  opts: { guardNegative?: boolean } = {}
): Promise<void> {
  if (!produkId || delta === 0) return;

  // Try variant match first (case-sensitive exact)
  const variantWhere: Prisma.produkvarianWhereInput = {
    produkId,
    ...(ukuran ? { ukuran } : { ukuran: null }),
    ...(warna ? { warna } : {}),
  };
  const variant = await tx.produkvarian.findFirst({ where: variantWhere });

  if (variant && variant.stok !== null) {
    if (opts.guardNegative && delta < 0) {
      // Atomic decrement with constraint
      const count = await tx.$executeRaw`
        UPDATE produkvarian 
        SET stok = stok - ${Math.abs(delta)} 
        WHERE id = ${variant.id} AND stok >= ${Math.abs(delta)}
      `;
      if (count === 0) {
        throw new Error(`Stok varian ${ukuran ?? ""} ${warna ?? ""}`.trim() + " tidak mencukupi");
      }
    } else {
      // Atomic add (increment/decrement without floor if not guarded)
      // Since delta can be negative or positive
      await tx.$executeRaw`
        UPDATE produkvarian 
        SET stok = GREATEST(0, CAST(stok AS SIGNED) + ${delta})
        WHERE id = ${variant.id}
      `;
    }
    return;
  }

  // Fallback: mutate produk-level stock
  if (opts.guardNegative && delta < 0) {
    // Atomic decrement with constraint
    const count = await tx.$executeRaw`
      UPDATE produk 
      SET stok = stok - ${Math.abs(delta)} 
      WHERE id = ${produkId} AND stok >= ${Math.abs(delta)}
    `;
    if (count === 0) {
      throw new Error("Stok produk tidak mencukupi");
    }
  } else {
    // Atomic add
    await tx.$executeRaw`
      UPDATE produk 
      SET stok = GREATEST(0, CAST(stok AS SIGNED) + ${delta})
      WHERE id = ${produkId}
    `;
  }
}