import type { Prisma } from "@prisma/client";
import { mapProdukToDTO, type ProdukDTO } from "./produk-mapper";

export interface CartItemDTO {
  id: string;
  produkId: string;
  ukuran: string | null;
  warna: string | null;
  qty: number;
  addedAt: string;
  produk: ProdukDTO; // include full produk (harga, stok, gambar) untuk UI
}

export type CartItemWithProduk = Prisma.cartitemGetPayload<{
  include: {
    produk: {
      include: {
        produkimage: true;
      };
    };
  };
}>;

export function mapCartToDTO(c: CartItemWithProduk): CartItemDTO {
  return {
    id: c.id,
    produkId: c.produkId,
    ukuran: c.ukuran,
    warna: c.warna,
    qty: c.qty,
    addedAt: c.createdAt.toISOString(),
    produk: mapProdukToDTO(c.produk),
  };
}
