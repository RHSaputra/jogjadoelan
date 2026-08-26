"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/fetcher";
import { qk } from "@/lib/api/keys";
import { useAuth } from "@/lib/auth-context";
import type { CartItemDTO } from "@/lib/api/cart-mapper";
import type { ProdukDTO } from "@/lib/api/produk-mapper";

const GUEST_KEY = "jogjadoelan_cart_guest";

const EMPTY_PRODUK_DTO: ProdukDTO = {
  id: "",
  slug: null,
  nama: "",
  jenis: "",
  jenisLabel: "",
  kondisi: "",
  spesifikasi: "",
  deskripsiSingkat: "",
  deskripsi: [],
  ukuran: [],
  harga: 0,
  stok: 0,
  terjual: 0,
  rating: 0,
  jumlahUlasan: 0,
  isPromo: false,
  isPreOrder: false,
  isRekomendasi: false,
  isActive: false,
  gambar: "",
  gambars: [],
  createdAt: "",
  updatedAt: "",
};

interface GuestItem { produkId: string; ukuran: string | null; warna: string | null; qty: number; addedAt: string; }

const GUEST_TTL = 7 * 24 * 60 * 60 * 1000; // 7 hari

interface GuestStorage { items: GuestItem[]; ts: number; }

function readGuest(): GuestItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Backward compat: array lama (tanpa timestamp)
    if (Array.isArray(parsed)) return parsed;
    if (parsed.ts && Date.now() - parsed.ts > GUEST_TTL) {
      localStorage.removeItem(GUEST_KEY);
      return [];
    }
    return parsed.items ?? [];
  } catch { return []; }
}
function writeGuest(items: GuestItem[]) {
  if (typeof window === "undefined") return;
  const payload: GuestStorage = { items, ts: Date.now() };
  localStorage.setItem(GUEST_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event("cart-guest-changed"));
}

interface CartContextValue {
  items: CartItemDTO[];
  guestItems: GuestItem[];   // hanya untuk UI guest
  isGuest: boolean;
  hydrated: boolean;
  itemCount: number;
  add: (produkId: string, ukuran?: string | null, warna?: string | null, qty?: number) => Promise<void>;
  updateQty: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartCtx = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isGuest = !user?.id;

  /* ===== Guest state (localStorage) ===== */
  const [guestItems, setGuestItems] = useState<GuestItem[]>([]);
  const [guestHydrated, setGuestHydrated] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setGuestItems(readGuest());
      setGuestHydrated(true);
    }, 0);
    const h = () => setGuestItems(readGuest());
    window.addEventListener("cart-guest-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("cart-guest-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  /* ===== Authed state (DB) ===== */
  const { data: authedItems = [], isFetched: authedFetched } = useQuery<CartItemDTO[]>({
    queryKey: qk.cart.list(user?.id ?? "guest"),
    queryFn: () => api.get<CartItemDTO[]>("/api/cart"),
    enabled: !isGuest,
    staleTime: 15_000,
  });

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: qk.cart.list(user?.id ?? "guest") }),
    [qc, user?.id],
  );

   /* ===== Merge guest → DB saat login ===== */
   const mergedRef = useRef(false);
   useEffect(() => {
     if (isGuest || mergedRef.current) return;
     const local = readGuest();
     mergedRef.current = true;
     if (local.length === 0) return;
     const apiItems = local.map(item => ({
       ...item,
       ukuran: item.ukuran ?? undefined,
       warna: item.warna ?? undefined
     }));
     api.post("/api/cart/merge", { items: apiItems })
       .then(() => {
         writeGuest([]);
         invalidate();
       })
       .catch(() => { mergedRef.current = false; });
   }, [isGuest, user?.id, invalidate]);

  /* ===== Mutations ===== */
   const mAdd = useMutation({
     mutationFn: (v: { produkId: string; ukuran: string | null; warna: string | null; qty: number }) =>
       api.post("/api/cart", { 
         produkId: v.produkId,
         ukuran: v.ukuran ?? undefined,
         warna: v.warna ?? undefined,
         qty: v.qty
       }),
     onSuccess: invalidate,
   });
  const mUpdate = useMutation({
    mutationFn: (v: { id: string; qty: number }) =>
      api.patch(`/api/cart/${v.id}`, { qty: v.qty }),
    onSuccess: invalidate,
  });
  const mRemove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/cart/${id}`),
    onSuccess: invalidate,
  });
  const mClear = useMutation({
    mutationFn: () => api.delete("/api/cart"),
    onSuccess: invalidate,
  });

  /* ===== Unified API ===== */
  const add = useCallback<CartContextValue["add"]>(async (produkId, ukuran = null, warna = null, qty = 1) => {
    if (isGuest) {
      const list = readGuest();
      const idx = list.findIndex(
        (x) => x.produkId === produkId && (x.ukuran ?? null) === (ukuran ?? null) && (x.warna ?? null) === (warna ?? null),
      );
      if (idx >= 0) list[idx].qty += qty;
      else list.push({ produkId, ukuran: ukuran ?? null, warna: warna ?? null, qty, addedAt: new Date().toISOString() });
      writeGuest(list);
    } else {
      await mAdd.mutateAsync({ produkId, ukuran: ukuran ?? null, warna: warna ?? null, qty });
    }
  }, [isGuest, mAdd]);

  const updateQty = useCallback<CartContextValue["updateQty"]>(async (id, qty) => {
    if (isGuest) {
      // id untuk guest = `${produkId}::${ukuran ?? ""}::${warna ?? ""}`
      const [pid, uks, wrn] = id.split("::");
      const list = readGuest();
      const idx = list.findIndex(
        (x) => x.produkId === pid && (x.ukuran ?? "") === (uks ?? "") && (x.warna ?? "") === (wrn ?? ""),
      );
      if (idx >= 0) {
        if (qty <= 0) list.splice(idx, 1);
        else list[idx].qty = qty;
        writeGuest(list);
      }
    } else {
      await mUpdate.mutateAsync({ id, qty });
    }
  }, [isGuest, mUpdate]);

  const remove = useCallback<CartContextValue["remove"]>(async (id) => {
    if (isGuest) {
      const [pid, uks, wrn] = id.split("::");
      writeGuest(
        readGuest().filter(
          (x) => !(x.produkId === pid && (x.ukuran ?? "") === (uks ?? "") && (x.warna ?? "") === (wrn ?? "")),
        ),
      );
    } else {
      await mRemove.mutateAsync(id);
    }
  }, [isGuest, mRemove]);

  const clear = useCallback<CartContextValue["clear"]>(async () => {
    if (isGuest) writeGuest([]);
    else await mClear.mutateAsync();
  }, [isGuest, mClear]);

  /* ===== Untuk UI guest, expose items dengan id sintetis ===== */
  const value = useMemo<CartContextValue>(() => {
    const items = isGuest
      ? guestItems.map<CartItemDTO>((g) => ({
          id: `${g.produkId}::${g.ukuran ?? ""}::${g.warna ?? ""}`,
          produkId: g.produkId,
          ukuran: g.ukuran,
          warna: g.warna,
          qty: g.qty,
          addedAt: g.addedAt,
          produk: EMPTY_PRODUK_DTO,
        }))
      : authedItems;
    const count = items.reduce((s, i) => s + i.qty, 0);
    return {
      items,
      guestItems,
      isGuest,
      hydrated: isGuest ? guestHydrated : authedFetched,
      itemCount: count,
      add, updateQty, remove, clear,
    };
  }, [isGuest, guestItems, authedItems, guestHydrated, authedFetched, add, updateQty, remove, clear]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart() must be in <CartProvider>");
  return ctx;
}