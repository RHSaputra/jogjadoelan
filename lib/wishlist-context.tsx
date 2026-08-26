"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/fetcher";
import { qk } from "@/lib/api/keys";
import { useAuth } from "@/lib/auth-context";
import type { WishlistItemDTO } from "@/lib/api/wishlist-mapper";
import type { ProdukDTO } from "@/lib/api/produk-mapper";

const GUEST_KEY = "jogjadoelan_wishlist_guest";

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

const GUEST_TTL = 7 * 24 * 60 * 60 * 1000; // 7 hari

interface GuestStorage { ids: string[]; ts: number; }

function readGuest(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.ts && Date.now() - parsed.ts > GUEST_TTL) {
      localStorage.removeItem(GUEST_KEY);
      return [];
    }
    return parsed.ids ?? [];
  } catch { return []; }
}
function writeGuest(ids: string[]) {
  if (typeof window === "undefined") return;
  const payload: GuestStorage = { ids, ts: Date.now() };
  localStorage.setItem(GUEST_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event("wishlist-guest-changed"));
}

interface WishlistContextValue {
  items: WishlistItemDTO[];
  guestIds: string[];
  isGuest: boolean;
  hydrated: boolean;
  count: number;
  isWishlisted: (produkId: string) => boolean;
  toggle: (produkId: string) => Promise<void>;
  add: (produkId: string) => Promise<void>;
  remove: (produkId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const WishCtx = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isGuest = !user?.id;

  const [guestIds, setGuestIds] = useState<string[]>([]);
  const [guestHydrated, setGuestHydrated] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setGuestIds(readGuest());
      setGuestHydrated(true);
    }, 0);
    const h = () => setGuestIds(readGuest());
    window.addEventListener("wishlist-guest-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("wishlist-guest-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const { data: authedItems = [], isFetched } = useQuery<WishlistItemDTO[]>({
    queryKey: qk.wishlist.list(user?.id ?? "guest"),
    queryFn: () => api.get<WishlistItemDTO[]>("/api/wishlist"),
    enabled: !isGuest,
    staleTime: 30_000,
  });

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: qk.wishlist.list(user?.id ?? "guest") }),
    [qc, user?.id],
  );

  /* Merge saat login */
  const mergedRef = useRef(false);
  useEffect(() => {
    if (isGuest || mergedRef.current) return;
    const local = readGuest();
    mergedRef.current = true;
    if (local.length === 0) return;
    api.post("/api/wishlist/merge", { produkIds: local })
      .then(() => { writeGuest([]); invalidate(); })
      .catch(() => { mergedRef.current = false; });
  }, [isGuest, user?.id, invalidate]);

  const mAdd = useMutation({
    mutationFn: (produkId: string) => api.post("/api/wishlist", { produkId }),
    onSuccess: invalidate,
  });
  const mRemove = useMutation({
    mutationFn: (produkId: string) => api.delete(`/api/wishlist/${produkId}`),
    onSuccess: invalidate,
  });
  const mClear = useMutation({
    mutationFn: () => api.delete("/api/wishlist"),
    onSuccess: invalidate,
  });

  const idsSet = useMemo(() => new Set(isGuest ? guestIds : authedItems.map((x) => x.produkId)), [isGuest, guestIds, authedItems]);
  const isWishlisted = useCallback((produkId: string) => idsSet.has(produkId), [idsSet]);

  const add = useCallback<WishlistContextValue["add"]>(async (produkId) => {
    if (isGuest) {
      const cur = readGuest();
      if (!cur.includes(produkId)) writeGuest([produkId, ...cur]);
    } else {
      await mAdd.mutateAsync(produkId);
    }
  }, [isGuest, mAdd]);

  const remove = useCallback<WishlistContextValue["remove"]>(async (produkId) => {
    if (isGuest) writeGuest(readGuest().filter((x) => x !== produkId));
    else await mRemove.mutateAsync(produkId);
  }, [isGuest, mRemove]);

  const toggle = useCallback<WishlistContextValue["toggle"]>(async (produkId) => {
    if (idsSet.has(produkId)) await remove(produkId);
    else await add(produkId);
  }, [idsSet, add, remove]);

  const clear = useCallback<WishlistContextValue["clear"]>(async () => {
    if (isGuest) writeGuest([]);
    else await mClear.mutateAsync();
  }, [isGuest, mClear]);

  const value = useMemo<WishlistContextValue>(() => {
    const items = isGuest
      ? guestIds.map<WishlistItemDTO>((pid) => ({
          id: `guest::${pid}`,
          produkId: pid,
          addedAt: new Date().toISOString(),
          produk: EMPTY_PRODUK_DTO,
        }))
      : authedItems;
    return {
      items, guestIds, isGuest,
      hydrated: isGuest ? guestHydrated : isFetched,
      count: items.length,
      isWishlisted, toggle, add, remove, clear,
    };
  }, [isGuest, guestIds, authedItems, guestHydrated, isFetched, isWishlisted, toggle, add, remove, clear]);

  return <WishCtx.Provider value={value}>{children}</WishCtx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishCtx);
  if (!ctx) throw new Error("useWishlist() must be in <WishlistProvider>");
  return ctx;
}