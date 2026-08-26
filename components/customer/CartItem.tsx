"use client";

import { QuantityCounter } from "./QuantityCounter";
import type { CartItemDTO } from "@/lib/api/cart-mapper";

const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID").format(n);

interface CartItemProps {
  item: CartItemDTO;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onQtyChange: (qty: number) => void;
}

export function CartItem({ item, selected, onSelect, onQtyChange }: CartItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-200 p-3">
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-orange-500"
      />

      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-400">
        {item.produk.gambar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.produk.gambar}
            alt={item.produk.nama}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {item.produk.nama}
        </p>
        <p className="text-xs text-gray-600">
          {item.produk.jenisLabel} • Ukuran {item.ukuran}
        </p>
        <p className="mt-1 text-sm font-bold text-gray-900">
          Rp {formatRupiah(item.produk.harga)},-
        </p>
      </div>

      <div className="shrink-0">
        <QuantityCounter value={item.qty} onChange={onQtyChange} />
      </div>
    </div>
  );
}
