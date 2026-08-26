"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWishlist, WishlistProvider } from "@/lib/wishlist-context";
import { useCart } from "@/lib/cart-context";
import { useProdukList, type Produk } from "@/lib/use-produk-list";

const formatRupiah = (n: number) =>
  "Rp " + n.toLocaleString("id-ID", { maximumFractionDigits: 0 });

function WishlistContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, remove, clear } = useWishlist();
  const cart = useCart();
  const produkList = useProdukList();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/akun/wishlist")}`);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

     async function handleAddCart(produkId: string) {
    const p = produkList.find((x) => x.id === produkId);
    if (!p) return;
    try {
      await cart.add(p.id, null, null, 1);
      showToast(`${p.nama} ditambahkan ke keranjang`);
    } catch {
      showToast("Gagal menambah ke keranjang");
    }
  }

  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light">
        <div className="text-sm text-brand-black/50">Memuat...</div>
      </div>
    );
  }

    const wishlistProduk = items
    .map((it) => produkList.find((p) => p.id === it.produkId))
    .filter((p): p is Produk => p !== undefined);

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-brand-krem bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            href="/akun"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black text-brand-black">Wishlist</h1>
                        <p className="text-xs text-brand-black/50">{wishlistProduk.length} produk</p>
          </div>
                    {wishlistProduk.length > 0 && !confirmClear && (
            <button
              onClick={() => setConfirmClear(true)}
              className="rounded-md px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
            >
              Hapus Semua
            </button>
          )}
        </div>
        {confirmClear && (
          <div className="container mx-auto flex items-center justify-end gap-2 border-t border-brand-cream bg-red-50 px-4 py-2.5">
            <span className="mr-auto text-xs font-semibold text-red-700">
              Hapus semua wishlist?
            </span>
            <button
              onClick={() => {
                clear();
                setConfirmClear(false);
              }}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
            >
              Ya, Hapus
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300"
            >
              Batal
            </button>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-5">
          {wishlistProduk.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-cream">
              <Heart className="h-12 w-12 text-brand-black/30" />
            </div>
            <h2 className="mt-6 text-lg font-bold text-brand-black">
              Wishlist masih kosong
            </h2>
            <p className="mt-2 text-sm text-brand-black/60">
              Tap ikon hati di produk favorit untuk menyimpannya di sini
            </p>
            <Link
              href="/belanja"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-orange px-6 py-2.5 text-sm font-black text-white shadow hover:bg-brand-orange-dark"
            >
              <ShoppingBag className="h-4 w-4" />
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {wishlistProduk.map((p) => (
              <li
                key={p.id}
                className="group relative overflow-hidden rounded-xl border border-brand-cream bg-white shadow-sm transition hover:shadow-md"
              >
                <Link href={`/produk/${p.id}`} className="block">
                  <div className="relative aspect-square overflow-hidden bg-brand-cream">
                    {p.gambar?.[0] && (
                      <Image
                        src={p.gambar[0]}
                        alt={p.nama}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs font-bold text-brand-black">
                      {p.nama}
                    </p>
                    <p className="mt-1 text-sm font-black text-brand-orange">
                      {formatRupiah(p.harga)}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-1 border-t border-brand-cream p-2">
                  <button
                    onClick={() => handleAddCart(p.id)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-brand-orange py-2 text-[11px] font-black text-white hover:bg-brand-orange-dark"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Keranjang
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                    aria-label="Hapus dari wishlist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-brand-black px-5 py-2.5 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function WishlistPage() {
  return (
    <WishlistProvider>
      <WishlistContent />
    </WishlistProvider>
  );
}