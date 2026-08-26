"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/fetcher";
import { qk } from "@/lib/api/keys";
import type { WishlistItemDTO } from "@/lib/api/wishlist-mapper";
import type { ProdukDTO } from "@/lib/api/produk-mapper";

export function useWishlistItemsHydrated(items: WishlistItemDTO[]): WishlistItemDTO[] {
  const needIds = items.filter((i) => !i.produk).map((i) => i.produkId);
  const { data: produks = [] } = useQuery<ProdukDTO[]>({
    queryKey: qk.produk.byIds(needIds),
    queryFn: () => api.post<ProdukDTO[]>("/api/produk/by-ids", { ids: needIds }),
    enabled: needIds.length > 0,
    staleTime: 60_000,
  });
  return useMemo(() => {
    if (needIds.length === 0) return items;
    const map = new Map(produks.map((p) => [p.id, p]));
    return items.map((i) => (i.produk ? i : { ...i, produk: map.get(i.produkId)! })).filter((i) => i.produk);
  }, [items, produks, needIds]);
}