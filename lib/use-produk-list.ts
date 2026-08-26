"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/fetcher";
import { qk } from "@/lib/api/keys";
import type { Produk } from "@/lib/produk-helpers";
export type { Produk } from "@/lib/produk-helpers";

export interface ProdukListResponse {
  items: Produk[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor?: number;
}

async function fetchList(params?: Record<string, unknown>, pageParam: number = 1): Promise<ProdukListResponse> {
  const qs = new URLSearchParams({ page: String(pageParam), limit: "12" });
  const jenis = params?.jenis;
  if (typeof jenis === "string" && jenis !== "semua") qs.set("jenis", jenis);
  if (typeof params?.sort === "string") qs.set("sort", params.sort);
  if (typeof params?.q === "string") qs.set("q", params.q);
  if (params?.promo) qs.set("promo", "true");
  if (params?.rekomendasi) qs.set("rekomendasi", "true");

  // The API returns { data: { items, page, ... } }
  // fetcher.ts returns the unpacked data.
  const r = await api.get<ProdukListResponse>(`/api/produk?${qs.toString()}`);
  return r;
}

export function useProdukInfiniteQuery(params?: Record<string, unknown>) {
  return useInfiniteQuery({
    queryKey: [...qk.produk.list(), "infinite", params],
    queryFn: ({ pageParam = 1 }) => fetchList(params, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 1,
    staleTime: 60_000,
  });
}

export function useProdukListQuery() {
  return useQuery({
    queryKey: qk.produk.list(),
    queryFn: () => fetchList({ limit: 60 }, 1).then(r => r.items),
    staleTime: 60_000,
  });
}

export function useProdukList(): Produk[] {
  const { data } = useQuery({
    queryKey: qk.produk.list(),
    queryFn: () => fetchList({ limit: 60 }, 1).then(r => r.items),
    staleTime: 60_000,
  });
  return data ?? [];
}

export function useProdukById(id: string): Produk | null | undefined {
  const list = useProdukList();
  if (list.length === 0) return undefined;
  return list.find((p) => p.id === id || p.slug === id) ?? null;
}

export function useProdukRekomendasi(): Produk[] {
  return useProdukList().filter((p) => p.isRekomendasi === true);
}

export function useProdukReadyStok(): Produk[] {
  return useProdukList();
}

/* Re-export helper non-hook untuk kompatibilitas import lama */
export { getProdukRekomendasi, getProdukReadyStok } from "@/lib/produk-helpers";