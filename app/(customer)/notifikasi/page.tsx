"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  CreditCard,
  Megaphone,
  MessageSquareWarning,
  Package,
  Paintbrush,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNotifikasi, type Notif, type NotifType } from "@/lib/notifikasi-context";

type FilterType = "semua" | "unread" | NotifType;

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "unread", label: "Belum Dibaca" },
  { id: "order", label: "Pesanan" },
  { id: "pembayaran", label: "Pembayaran" },
  { id: "pengiriman", label: "Pengiriman" },
  { id: "promo", label: "Promo" },
  { id: "info", label: "Info" },
];

const ICON_BY_TYPE: Record<NotifType, { icon: typeof Bell; bg: string; fg: string }> = {
  order: { icon: ShoppingBag, bg: "bg-blue-100", fg: "text-blue-600" },
  pembayaran: { icon: CreditCard, bg: "bg-green-100", fg: "text-green-600" },
  pengiriman: { icon: Truck, bg: "bg-orange-100", fg: "text-orange-600" },
  promo: { icon: Megaphone, bg: "bg-pink-100", fg: "text-pink-600" },
  info: { icon: Package, bg: "bg-gray-100", fg: "text-gray-600" },
  custom: { icon: Paintbrush, bg: "bg-purple-100", fg: "text-purple-600" },
  refund: { icon: RotateCcw, bg: "bg-amber-100", fg: "text-amber-600" },
  tukar: { icon: RefreshCw, bg: "bg-cyan-100", fg: "text-cyan-600" },
  komplain: { icon: MessageSquareWarning, bg: "bg-red-100", fg: "text-red-600" },
  ulasan: { icon: Star, bg: "bg-yellow-100", fg: "text-yellow-600" },
};

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NotifikasiPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, unreadCount, markRead, markAllRead, removeNotif, clearAll } =
    useNotifikasi();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [filter, setFilter] = useState<FilterType>("semua");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/notifikasi")}`);
    }
  }, [mounted, authLoading, isAuthenticated, router]);

  const filtered = useMemo<Notif[]>(() => {
    let list = items;
    if (filter === "unread") list = list.filter((n) => !n.read);
    else if (filter !== "semua") list = list.filter((n) => n.type === filter);
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [items, filter]);

  function handleClick(n: Notif) {
    if (!n.read) markRead(n.id);
    if (n.link) router.push(n.link);
  }

  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream-light">
        <div className="text-sm text-brand-black/50">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-brand-krem bg-white shadow-sm">

        {/* Baris atas: back + judul + tandai dibaca */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black tracking-tight text-brand-black">
              Notifikasi
            </h1>
            <p className="text-xs text-brand-black/50">
              {unreadCount > 0
                ? `${unreadCount} belum dibaca`
                : "Semua sudah dibaca"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 rounded-md px-3 py-2 text-xs font-bold text-brand-orange hover:bg-orange-50"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Tandai dibaca</span>
            </button>
          )}
        </div>

        {/* Filter chips — scroll horizontal tanpa plugin */}
        <div
          className="overflow-x-auto px-4 pb-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <div className="hide-scrollbar flex w-max gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              const count =
                f.id === "semua"
                  ? items.length
                  : f.id === "unread"
                    ? unreadCount
                    : items.filter((n) => n.type === f.id).length;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                 className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
  active
    ? "bg-brand-orange text-white shadow"
    : "bg-white text-brand-black/70 border border-brand-krem hover:bg-gray-50"
}`}
                >
                  {f.label}
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        active ? "bg-white/20" : "bg-gray-100"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="container mx-auto px-4 py-4">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-cream">
              <Bell className="h-12 w-12 text-brand-black/30" />
            </div>
            <h2 className="mt-6 text-lg font-bold text-brand-black">
              {filter === "unread"
                ? "Semua sudah dibaca"
                : items.length === 0
                  ? "Belum ada notifikasi"
                  : "Tidak ada notifikasi di kategori ini"}
            </h2>
            <p className="mt-2 text-sm text-brand-black/60">
              Pemberitahuan dan info terbaru akan tampil di sini
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-md bg-brand-orange px-6 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-brand-orange-dark"
            >
              Kembali ke Beranda
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => {
              const cfg = ICON_BY_TYPE[n.type];
              const Icon = cfg.icon;
              return (
                <li
                  key={n.id}
                  className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow ${
                    n.read ? "border-brand-krem" : "border-brand-orange/30 bg-orange-50/30"
                  }`}
                >
                  <button
                    onClick={() => handleClick(n)}
                    className="flex w-full items-start gap-3 p-4 text-left"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${cfg.fg}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm leading-snug ${
                            n.read
                              ? "text-brand-black/80"
                              : "font-bold text-brand-black"
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-brand-black/60">
                        {n.body}
                      </p>
                      <p className="mt-1.5 text-[11px] text-brand-black/40">
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => removeNotif(n.id)}
                    className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full text-brand-black/40 hover:bg-red-50 hover:text-red-600 group-hover:flex"
                    aria-label="Hapus notifikasi"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer actions */}
        {items.length > 0 && (
          <div className="mt-8 flex justify-center">
            {confirmClear ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 shadow-sm">
                <span className="text-xs font-semibold text-red-700">
                  Hapus semua notifikasi?
                </span>
                <button
                  onClick={() => {
                    clearAll();
                    setConfirmClear(false);
                  }}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                >
                  Ya, Hapus
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Hapus Semua Notifikasi
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}