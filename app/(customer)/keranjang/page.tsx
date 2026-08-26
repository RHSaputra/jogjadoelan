"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Minus,
  ShoppingBag,
  ImageIcon,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { getProdukList } from "@/lib/produk-helpers";
import { toast } from "sonner";
import { useCartItemsHydrated } from "@/lib/cart-helpers";

const findStok = (id: string | number): number => {
  const list = getProdukList() as Array<{ id: string | number; stok?: number }>;
  const p = list.find((x) => String(x.id) === String(id));
  return typeof p?.stok === "number" ? p.stok : 99;
};

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const itemKey = (it: { id: string | number; ukuran?: string | null }) =>
  `${it.id}__${it.ukuran ?? ""}`;

export default function KeranjangPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { items, updateQty, remove } = useCart();
  const hydratedItems = useCartItemsHydrated(items);  // dari lib/cart-helpers

  // Prevent hydration mismatch for client-only cart content.
  // Avoid extra setState-in-effect that triggers lint warnings.
  const mounted = true;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/keranjang")}`);
    }
  }, [authLoading, isAuthenticated, router]);

  /* Selection state */
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const hydratedKeys = useMemo(
    () => hydratedItems.map(itemKey),
    [hydratedItems],
  );

  // If user hasn't selected anything yet, default to selecting all hydrated items.
  const effectiveSelected = useMemo(() => {
    if (selected.size !== 0) return selected;
    return new Set<string>(hydratedKeys);
  }, [selected, hydratedKeys]);

  const allSelected =
    hydratedItems.length > 0 && effectiveSelected.size === hydratedItems.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(hydratedKeys));
  };

  const toggleOne = (it: { id: string | number; ukuran?: string | null }) => {
    const k = itemKey(it);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

   const selectedItems = useMemo(
    () => hydratedItems.filter((it) => effectiveSelected.has(itemKey(it))),
    [hydratedItems, effectiveSelected],
  );
    const selectedTotal = selectedItems.reduce(
    (s, it) => s + (hydratedItems.find(h => h.id === it.id)?.produk?.harga ?? 0) * it.qty,
    0,
  );
  const selectedQty = selectedItems.reduce((s, it) => s + it.qty, 0);

    const handleDecrease = (it: (typeof items)[number]) => {
    if (it.qty <= 1) remove(it.id);
    else updateQty(it.id, it.qty - 1);
  };

  const handleIncrease = (it: (typeof items)[number]) => {
    const stok = findStok(it.produkId);
    if (it.qty >= stok) return;
    updateQty(it.id, it.qty + 1);
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;

    selectedItems.forEach((it) => {
      remove(it.id);
    });

    setSelected(new Set());

    toast.success("Produk berhasil dihapus", {
      description: `${selectedItems.length} barang telah dihapus dari keranjang.`,
    });
  };

const handlePesan = () => {
  if (selectedItems.length === 0) {
    toast.error("Pilih minimal 1 produk dulu", {
      description: "Centang produk yang ingin diproses ke checkout.",
    });
    return;
  }

    const payload = selectedItems
    .map(
      (it) =>
        `${it.produkId}:${encodeURIComponent(it.ukuran ?? "")}:${it.qty}`,
    )
    .join(",");

  router.push(`/checkout?mode=cart&items=${payload}`);
};

   if (!mounted || authLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-brand-cream-light" />;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-cream-light">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="mx-auto flex h-20 w-20 items-center w-fit rounded-full bg-brand-cream">
            <ShoppingBag className="h-10 w-10 text-brand-orange" />
          </div>
          <h1 className="mt-6 text-xl sm:text-2xl font-black text-brand-black">
            Keranjang masih kosong
          </h1>
          <p className="mt-2 text-sm text-brand-black/60">
            Yuk pilih helm jadul kesukaan kamu dulu
          </p>
          <Link
            href="/belanja"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-orange px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-brand-orange-dark"
          >
            Mulai Belanja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-32">
      {/* Header */}
      <div className="border-b border-brand-cream bg-white">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md p-1.5 text-brand-black hover:bg-brand-cream"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-black text-brand-black">
            Keranjang Saya
          </h1>
        </div>
      </div>

      {/* Toolbar pilih semua */}
      <div className="border-b border-brand-cream bg-brand-cream/50">
        <div className="container mx-auto flex items-center justify-between px-4 py-2.5">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-bold text-brand-black hover:text-brand-orange"
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                allSelected
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-brand-black/30 bg-white"
              }`}
            >
              {allSelected && <span className="text-xs leading-none">✓</span>}
            </span>
            Pilih Semua
          </button>
          <span className="text-xs text-brand-black/60">
            {effectiveSelected.size} / {hydratedItems.length} dipilih
          </span>
        </div>
      </div>

      {/* List */}
      <div className="container mx-auto space-y-3 px-4 py-4">
              {hydratedItems.map((it) => {
          const k = itemKey(it);
          const checked = effectiveSelected.has(k);
          const stok = findStok(it.produkId);
          const stokHabis = it.qty >= stok;
          return (
            <div
              key={k}
              className="flex items-center gap-3 rounded-xl border border-brand-cream bg-white p-3 shadow-sm transition hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => toggleOne(it)}
                aria-label={checked ? "Batal pilih" : "Pilih"}
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 transition ${
                  checked
                    ? "border-brand-orange bg-brand-orange text-white"
                    : "border-brand-black/30 bg-white hover:border-brand-orange"
                }`}
              >
                {checked && <span className="text-xs leading-none">✓</span>}
              </button>

                                          <Link
                href={`/produk/${it.produkId}`}
                className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-brand-cream/40 transition hover:opacity-90"
                aria-label={`Lihat detail ${it.produk?.nama ?? ""}`}
              >
               {isNonEmptyString(it.produk?.gambar) ? (
  <Image
    src={it.produk!.gambar}
    alt={it.produk?.nama ?? ""}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-brand-black/30">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                )}
              </Link>

              <Link
                href={`/produk/${it.produkId}`}
                className="group min-w-0 flex-1"
                aria-label={`Lihat detail ${it.produk?.nama ?? ""}`}
              >
                <h3 className="line-clamp-2 text-sm font-bold text-brand-black group-hover:text-brand-orange">
                  {it.produk?.nama ?? "(produk tidak ditemukan)"}
                </h3>
                {it.ukuran && (
                  <p className="mt-0.5 text-xs text-brand-black/60">
                    Ukuran:{" "}
                    <span className="font-semibold text-brand-black">
                      {it.ukuran}
                    </span>
                  </p>
                )}
                <p className="mt-1 text-sm font-black text-brand-orange">
                  Rp {(it.produk?.harga ?? 0).toLocaleString("id-ID")}
                </p>
              </Link>

              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                <div className="flex items-center rounded-md border-2 border-brand-cream bg-white">
                  <button
                    type="button"
                    onClick={() => handleDecrease(it)}
                    className="px-2 py-1.5 text-brand-black hover:bg-brand-cream"
                    aria-label="Kurangi"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-brand-black">
                    {it.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleIncrease(it)}
                    disabled={stokHabis}
                    className="px-2 py-1.5 text-brand-black hover:bg-brand-cream disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Tambah"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {stokHabis && (
                  <span className="text-[10px] font-bold text-red-600">
                    Stok max
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

     {/* Checkout Summary */}
<div className="mt-6 pb-6">
  <div className="container mx-auto px-4">
    <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-cream bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">

      {/* LEFT */}
      <button
        type="button"
        onClick={handleDeleteSelected}
        disabled={selectedItems.length === 0}
        className="flex w-fit items-center gap-1.5 rounded-xl border-2 border-brand-cream bg-white px-2.5 py-2 text-xs font-bold text-brand-black transition hover:border-red-400 hover:text-red-600 disabled:opacity-40 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Hapus</span>
      </button>

      {/* RIGHT */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-brand-black/50">
            Total ({selectedQty} barang)
          </p>

          <p className="text-lg font-black text-brand-orange sm:text-2xl">
            Rp {selectedTotal.toLocaleString("id-ID")}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePesan}
          disabled={selectedItems.length === 0}
          className="rounded-xl bg-brand-orange px-4 py-2 text-sm font-black text-white shadow-md transition hover:bg-brand-orange-dark disabled:opacity-40 sm:px-8 sm:py-3 sm:text-base"
        >
          Pesan
        </button>
      </div>
    </div>
  </div>
</div>
    </div>
  );
}
