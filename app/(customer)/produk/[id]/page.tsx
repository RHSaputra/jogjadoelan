"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useProdukById } from "@/lib/use-produk-list";
import { ProductDetailClient } from "@/components/customer/produk/ProductDetailClient";

export default function DetailProdukPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const produk = useProdukById(String(id));

  /* undefined = masih loading (cek localStorage untuk custom product) */
  if (produk === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-bold text-gray-500">Memuat produk...</p>
      </div>
    );
  }

  /* null = produk benar-benar tidak ditemukan */
  if (produk === null) {
    notFound();
  }

  return <ProductDetailClient produk={produk} />;
}