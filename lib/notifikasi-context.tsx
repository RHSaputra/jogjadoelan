"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/fetcher";
import { qk } from "@/lib/api/keys";
import { useAuth } from "@/lib/auth-context";

export type NotifType =
  | "order" | "pembayaran" | "pengiriman" | "komplain" | "refund"
  | "tukar" | "ulasan" | "promo" | "info" | "custom";

export interface Notif {
  id: string;
  title: string;
  body: string;
  type: NotifType;
  read: boolean;
  createdAt: string;
  link?: string;
  orderId?: string;
  komplainId?: string;
  refundId?: string;
  tukarId?: string;
}

type AddInput = Omit<Notif, "id" | "createdAt" | "read">;

interface NotifContextValue {
  items: Notif[];
  unreadCount: number;
  hydrated: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotif: (n: AddInput) => void;
  removeNotif: (id: string) => void;
  clearAll: () => void;
  notifyOrder: (orderId: string, title: string, body: string) => void;
  notifyPembayaran: (orderId: string, title: string, body: string) => void;
  notifyPengiriman: (orderId: string, title: string, body: string) => void;
  notifyKomplain: (komplainId: string, title: string, body: string) => void;
  notifyRefund: (komplainId: string, title: string, body: string, opts?: { sukses?: boolean }) => void;
  notifyTukar: (komplainId: string, title: string, body: string, opts?: { sukses?: boolean }) => void;
  notifyUlasan: (orderId: string, title: string, body: string) => void;
  notifyPromo: (title: string, body: string, link?: string) => void;
  notifyInfo: (title: string, body: string, link?: string) => void;
}

const NotifContext = createContext<NotifContextValue | null>(null);

export function NotifikasiProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const enabled = !!user?.id;

  const { data: items = [], isFetched } = useQuery<Notif[]>({
    queryKey: qk.notif.list(user?.id ?? "guest"),
    queryFn: () => api.get<Notif[]>("/api/notifikasi"),
    enabled,
    staleTime: 30_000,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: qk.notif.list(user?.id ?? "guest") });

  const mMarkRead = useMutation({
    mutationFn: (id: string) => api.post(`/api/notifikasi/${id}/read`),
    onSuccess: invalidate,
  });
  const mMarkAll = useMutation({
    mutationFn: () => api.post("/api/notifikasi/read-all"),
    onSuccess: invalidate,
  });
  const mRemove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/notifikasi/${id}`),
    onSuccess: invalidate,
  });
  const mClear = useMutation({
    mutationFn: () => api.delete("/api/notifikasi"),
    onSuccess: invalidate,
  });

  const userId = user?.id;

  // addNotif lokal: tidak punya endpoint per-user public, jadi diam-diam no-op
  // (notifikasi dibuat oleh server saat aksi terjadi). Kalau diperlukan, bisa
  // dipush ke cache lokal saja agar UI optimis.
  const addNotif = useCallback((n: AddInput) => {
    if (!userId) return;
    const optimistic: Notif = {
      ...n,
      id: `tmp-${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    qc.setQueryData<Notif[]>(qk.notif.list(userId), (prev) => [optimistic, ...(prev ?? [])]);
  }, [qc, userId]);

  const markRead = useCallback((id: string) => mMarkRead.mutate(id), [mMarkRead]);
  const markAllRead = useCallback(() => mMarkAll.mutate(), [mMarkAll]);
  const removeNotif = useCallback((id: string) => mRemove.mutate(id), [mRemove]);
  const clearAll = useCallback(() => mClear.mutate(), [mClear]);

  // Helper-helper notifyXxx tetap ada tapi sekarang TIDAK perlu dipanggil dari
  // UI karena server yang membuat notifikasi. Dibiarkan sebagai no-op (push
  // optimis lokal) untuk kompatibilitas.
  const notifyOrder = (orderId: string, title: string, body: string) =>
    addNotif({ title, body, type: "order", orderId, link: `/pesanan/${orderId}` });
  const notifyPembayaran = (orderId: string, title: string, body: string) =>
    addNotif({ title, body, type: "pembayaran", orderId, link: `/pembayaran/${orderId}` });
  const notifyPengiriman = (orderId: string, title: string, body: string) =>
    addNotif({ title, body, type: "pengiriman", orderId, link: `/pesanan/${orderId}` });
  const notifyKomplain = (komplainId: string, title: string, body: string) =>
    addNotif({ title, body, type: "komplain", komplainId, link: `/komplain/${komplainId}` });
  const notifyRefund = (komplainId: string, title: string, body: string, opts?: { sukses?: boolean }) =>
    addNotif({ title, body, type: "refund", komplainId, link: opts?.sukses ? `/refund/${komplainId}/sukses` : `/refund/${komplainId}` });
  const notifyTukar = (komplainId: string, title: string, body: string, opts?: { sukses?: boolean }) =>
    addNotif({ title, body, type: "tukar", komplainId, link: opts?.sukses ? `/tukar/${komplainId}/sukses` : `/tukar/${komplainId}` });
  const notifyUlasan = (orderId: string, title: string, body: string) =>
    addNotif({ title, body, type: "ulasan", orderId, link: `/ulasan/${orderId}` });
  const notifyPromo = (title: string, body: string, link?: string) =>
    addNotif({ title, body, type: "promo", link });
  const notifyInfo = (title: string, body: string, link?: string) =>
    addNotif({ title, body, type: "info", link });

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const value: NotifContextValue = {
    items, unreadCount, hydrated: isFetched,
    markRead, markAllRead, addNotif, removeNotif, clearAll,
    notifyOrder, notifyPembayaran, notifyPengiriman, notifyKomplain,
    notifyRefund, notifyTukar, notifyUlasan, notifyPromo, notifyInfo,
  };

  return <NotifContext.Provider value={value}>{children}</NotifContext.Provider>;
}

export function useNotifikasi(): NotifContextValue {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useNotifikasi() harus dipanggil di dalam <NotifikasiProvider>");
  return ctx;
}