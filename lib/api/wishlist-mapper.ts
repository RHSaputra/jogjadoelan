import type { wishlistitem as PrismaWish, produk as Produk, produkimage as ProdukImage } from "@prisma/client";
import { mapProdukToDTO, type ProdukDTO } from "./produk-mapper";

export interface WishlistItemDTO {
  id: string;
  produkId: string;
  addedAt: string;
  produk: ProdukDTO;
}

export function mapWishToDTO(w: PrismaWish & { produk: Produk & { produkimage: ProdukImage[] } }): WishlistItemDTO {
  return {
    id: w.id,
    produkId: w.produkId,
    addedAt: w.createdAt.toISOString(),
    produk: mapProdukToDTO(w.produk),
  };
}