"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { subscribeSyncMany } from "@/lib/sync-events";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ImageIcon,
  Package,
  Search,
  ShoppingBag,
  Clock,
  Palette,
  Wallet,
  ShieldAlert,
  Star,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getOrders,
  STATUS_LABEL,
  STATUS_COLOR,
  type Order,
  type OrderStatus,
} from "@/lib/orders-storage";
import {
  useCustomOrder,
  CUSTOM_STATUS_LABEL,
  CUSTOM_STATUS_COLOR,
  type CustomOrder,
  type CustomStatus,
} from "@/lib/custom-order-context";
import { useKomplain } from "@/lib/komplain-context";
import { getMyUlasan } from "@/lib/ulasan-helpers";

/* ============== UNIFIED ORDER VIEW ============== */

type UnifiedKind = "reguler" | "custom";

interface PrimaryAction {
  label: string;
  href: string;
  /** Untuk custom order yang butuh setCurrentOrderId dulu sebelum navigasi */
  needsContextSync?: boolean;
}

interface UnifiedOrder {
  id: string;
  kind: UnifiedKind;
  createdAt: number;
  total: number;
  statusLabel: string;
  statusColor: string;
  bucket: string;
  primaryAction: PrimaryAction | null;
  judul: string;
  subjudul: string;
  thumbnail: string | null;
  warnaList?: { hex: string }[];
  expiredAt?: string | null;
  shippedAt?: string | null; 
  deliveredAt?: string | null;
  konfirmasiDiterimaAt?: string | null; 
  rawCustomStatus?: CustomStatus;
  rawStatus?: OrderStatus;
  searchKey: string;
}

const TABS = [
  { key: "all", label: "Semua" },
  { key: "perlu_bayar", label: "Perlu Bayar" },
  { key: "validasi", label: "Validasi" },
  { key: "diproses", label: "Diproses" },
  { key: "dikirim", label: "Dikirim" },
  { key: "selesai", label: "Selesai" },
  { key: "batal", label: "Dibatalkan" },
] as const;

/* ============== HELPER BUCKETS & ACTIONS ============== */

function regulerBucket(s: OrderStatus): string {
  switch (s) {
    case "menunggu_pembayaran":
      return "perlu_bayar";
    case "menunggu_konfirmasi":
      return "validasi";
    case "diproses":
      return "diproses";
    case "dikirim":
      return "dikirim";
    case "selesai":
      return "selesai";
    case "kadaluarsa":
    case "dibatalkan":
      return "batal";
    default:
      return "all";
  }
}

function customBucket(s: CustomStatus): string {
  switch (s) {
    case "menunggu_estimasi":
    case "menunggu_persetujuan":
      return "diproses";
    case "menunggu_pembayaran":
    case "siap_dilunasi":
      return "perlu_bayar";
    case "menunggu_verifikasi_dp":
    case "menunggu_verifikasi_lunas":
    case "menunggu_verifikasi_pelunasan":
      return "validasi";
    case "diproses":
      return "diproses";
    case "dikirim":
      return "dikirim";
    case "selesai":
      return "selesai";
    case "ditolak":
      return "batal";
    default:
      return "all";
  }
}

function regulerPrimary(o: Order): { label: string; href: string } | null {
  switch (o.status) {
    case "menunggu_pembayaran":
      return { label: "Bayar Sekarang", href: `/pembayaran/${o.id}` };
    case "menunggu_konfirmasi":
      return { label: "Lihat Bukti", href: `/pembayaran/${o.id}` };
    case "dikirim":
      return { label: "Lacak Pengiriman", href: `/pesanan/${o.id}` };
    case "selesai":
      return { label: "Beli Lagi", href: "/belanja" };
    case "kadaluarsa":
    case "dibatalkan":
      return { label: "Pesan Ulang", href: "/belanja" };
    default:
      return null;
  }
}

function customPrimary(o: CustomOrder): { label: string; href: string } | null {
  switch (o.status) {
    case "menunggu_persetujuan":
      return { label: "Lihat Estimasi", href: `/custom/estimasi?id=${o.id}` };
    case "menunggu_pembayaran":
      return { label: "Bayar DP/Lunas", href: `/custom/dp?id=${o.id}` };
    case "siap_dilunasi":
      return { label: "Lunasi", href: `/pelunasan/${o.id}` };
    case "ditolak":
      return { label: "Negosiasi Chat", href: "/chat" };
    case "selesai":
      return { label: "Buat Custom Lagi", href: "/custom" };
    default:
      return null;
  }
}

function toUnifiedReguler(o: Order): UnifiedOrder {
  const item0 = o.items[0];
  const totalQty = o.items.reduce((s, it) => s + it.qty, 0);
  return {
    id: o.id,
    kind: "reguler",
    createdAt: new Date(o.createdAt).getTime(),
    total: o.total,
    statusLabel: STATUS_LABEL[o.status],
    statusColor: STATUS_COLOR[o.status],
    bucket: regulerBucket(o.status),
    primaryAction: regulerPrimary(o),
    judul: item0?.nama ?? "",
    subjudul: `${item0?.ukuran ?? ""} · ${totalQty} barang`,
    thumbnail: item0?.gambar ?? null,
    expiredAt: o.expiredAt,
    shippedAt: o.ekspedisi?.shippedAt ?? null, 
    deliveredAt: o.deliveredAt ?? null,
    konfirmasiDiterimaAt: o.konfirmasiDiterimaAt ?? null, 
    rawStatus: o.status,
    searchKey: `${o.id} ${o.items.map((it) => it.nama).join(" ")}`.toLowerCase(),
  };
}

function toUnifiedCustom(o: CustomOrder): UnifiedOrder {
  const total = o.estimasi?.total ?? 0;
  return {
    id: o.id,
    kind: "custom",
    createdAt: o.createdAt,
    total,
    statusLabel: CUSTOM_STATUS_LABEL[o.status],
    statusColor: CUSTOM_STATUS_COLOR[o.status],
    bucket: customBucket(o.status),
    primaryAction: customPrimary(o),
    judul: `Custom Helm ${o.jenis}`,
    subjudul: `Ukuran ${o.ukuran} · ${o.warnaList.length} warna`,
    thumbnail: null,
    warnaList: o.warnaList.map((w) => ({ hex: w.hex })),
    rawCustomStatus: o.status,
    searchKey: `${o.id} custom ${o.jenis} ${o.ukuran}`.toLowerCase(),
  };
}

/* ============== HELPERS ============== */

function formatRp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function formatTanggal(ts: number) {
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSisa(ms: number): string {
  if (ms <= 0) return "Habis";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 1) return `${h} jam ${m} mnt lagi`;
  return `${m} menit lagi`;
}

function StatusIcon({ kind }: { kind: UnifiedKind }) {
  return kind === "custom" ? (
    <Palette className="h-3.5 w-3.5" />
  ) : (
    <ShoppingBag className="h-3.5 w-3.5" />
  );
}

/* ============== PAGE ============== */

function PesananInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { orders: customOrders } = useCustomOrder();
  const { byOrderId } = useKomplain();

  const [regulerOrders, setRegulerOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<string>(params.get("tab") || "all");
  const [q, setQ] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?next=" + encodeURIComponent("/pesanan"));
    }
  }, [authLoading, isAuthenticated, router]);

  const [ulasanOrderIds, setUlasanOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    void getOrders(user.id).then((orders) => {
      setRegulerOrders(orders);
      setLoaded(true);
    }).catch(() => setLoaded(true));
    void getMyUlasan().then((ulasans) => {
      setUlasanOrderIds(new Set(ulasans.map((u) => u.orderId)));
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

   useEffect(() => {
    if (!user) return;
    const reload = () => { void getOrders(user.id).then(setRegulerOrders).catch(() => {}); };
    return subscribeSyncMany(
      ["order", "notif", "komplain", "refund", "tukar", "custom"],
      reload,
    );
  }, [user]);

  const unified = useMemo<UnifiedOrder[]>(() => {
    // 1. Kumpulkan semua ID pesanan reguler
    const regIds = new Set(regulerOrders.map((o) => o.id));
    const reg = regulerOrders.map(toUnifiedReguler);
    
    // 2. Filter pesanan custom. Sembunyikan jika versi JD-CO-xxx nya sudah ada di reguler!
    const filteredCustom = customOrders.filter((cus) => {
      // Ubah 'co-123' menjadi 'JD-CO-123'
      const duplicateId = `JD-${cus.id.toUpperCase()}`;
      // Jika duplicateId (JD-CO-xxx) sudah ada di reguler, buang yang custom ini.
      return !regIds.has(duplicateId) && !regIds.has(cus.id);
    });

    const cus = filteredCustom.map(toUnifiedCustom);
    return [...reg, ...cus].sort((a, b) => b.createdAt - a.createdAt);
  }, [regulerOrders, customOrders]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: unified.length };
    TABS.forEach((t) => {
      if (t.key === "all") return;
      c[t.key] = unified.filter((o) => o.bucket === t.key).length;
    });
    return c;
  }, [unified]);

  const filtered = useMemo(() => {
    let list =
      tab === "all" ? unified : unified.filter((o) => o.bucket === tab);
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      list = list.filter((o) => o.searchKey.includes(k));
    }
    return list;
  }, [unified, tab, q]);

  if (authLoading || !isAuthenticated)
    return <div className="min-h-screen bg-brand-cream-light" />;

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push("/")}
            className="rounded-md p-1.5 text-brand-black hover:bg-brand-cream"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Package className="h-5 w-5 text-brand-black" />
          <h1 className="text-lg font-black text-brand-black">Pesanan Saya</h1>
        </div>

        {/* Search */}
        <div className="container mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-black/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari ID pesanan / nama produk..."
              className="w-full rounded-md border-2 border-brand-cream bg-brand-cream-light py-2 pl-9 pr-3 text-sm focus:border-brand-orange focus:outline-none"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-brand-cream">
          <div className="scrollbar-hide container mx-auto flex overflow-x-auto px-2">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative whitespace-nowrap px-3 py-2.5 text-xs font-bold transition ${
                    active
                      ? "text-brand-orange"
                      : "text-brand-black/60 hover:text-brand-black"
                  }`}
                >
                  {t.label}
                  {counts[t.key] > 0 && (
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                        active
                          ? "bg-brand-orange text-white"
                          : "bg-brand-cream text-brand-black/70"
                      }`}
                    >
                      {counts[t.key]}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-brand-orange" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-2xl px-4 py-4">
        {!loaded ? (
          <p className="py-16 text-center text-sm text-brand-black/60">
            Memuat pesanan
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} hasOrders={unified.length > 0} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((o) => (
              <UnifiedCard
                key={`${o.kind}-${o.id}`}
                order={o}
                now={now}
                userId={user?.id ?? ""}
                hasKomplain={
                  o.kind === "reguler" ? byOrderId(o.id).length > 0 : false
                }
                sudahUlas={ulasanOrderIds.has(o.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  tab,
  hasOrders,
}: {
  tab: string;
  hasOrders: boolean;
}) {
  const isAll = tab === "all";
  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-cream bg-white py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-cream">
        <ShoppingBag className="h-8 w-8 text-brand-black/40" />
      </div>
      <h3 className="mt-3 text-base font-black text-brand-black">
        {isAll && !hasOrders
          ? "Belum ada pesanan"
          : "Tidak ada pesanan di tab ini"}
      </h3>
      <p className="mt-1 text-xs text-brand-black/60">
        {isAll && !hasOrders
          ? "Yuk, mulai belanja helm vintage atau buat pesanan custom!"
          : "Coba pilih tab lain atau buat pesanan baru."}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link
          href="/belanja"
          className="rounded-md bg-brand-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-orange-dark"
        >
          Mulai Belanja
        </Link>
        <Link
          href="/custom"
          className="rounded-md border-2 border-brand-orange bg-white px-5 py-2.5 text-sm font-bold text-brand-orange hover:bg-orange-50"
        >
          Custom Helm
        </Link>
      </div>
    </div>
  );
}

function UnifiedCard({
  order,
  now,
  userId,
  hasKomplain,
  sudahUlas: sudahUlasProp = false,
}: {
  order: UnifiedOrder;
  now: number;
  userId: string;
  hasKomplain: boolean;
  sudahUlas?: boolean;
}) {
  const router = useRouter();
  const { setCurrentOrderId } = useCustomOrder();

  const isWaitingReg =
    order.kind === "reguler" &&
    order.bucket === "perlu_bayar" &&
    order.expiredAt;
  const sisaMs = isWaitingReg
    ? new Date(order.expiredAt!).getTime() - now
    : 0;

  const detailHref =
    order.kind === "reguler" ? `/pesanan/${order.id}` : `/custom/${order.id}`;

  /** Handler tombol aksi utama — sync context untuk custom order sebelum navigasi */
  const handlePrimaryAction = (e: React.MouseEvent) => {
    if (!order.primaryAction) return;
    if (order.kind === "custom") {
      e.preventDefault();
      setCurrentOrderId(order.id);
      router.push(order.primaryAction.href);
    }
    // Reguler orders: default <Link> behavior (tidak perlu di-intercept)
  };

  const isSiapDilunasi =
    order.kind === "custom" && order.rawCustomStatus === "siap_dilunasi";

  /* ====== QUICK ACTIONS (Logika Opsi 2) ====== */
  const status = order.rawStatus;
  
  // Hitung apakah garansi 3x24 jam (72 jam) masih aktif
  const timeStartGaransi = order.deliveredAt || order.shippedAt;
  const windowOpen = timeStartGaransi 
    ? (now - new Date(timeStartGaransi).getTime()) / (1000 * 60 * 60) < 72 
    : false;

  const showKomplain =
    order.kind === "reguler" &&
    !hasKomplain &&
    ((status === "dikirim") || (status === "selesai" && windowOpen)); 

  // Tombol Terima hanya muncul jika sudah ada deliveredAt (Barang sampai)
  const showTerima = order.kind === "reguler" && status === "dikirim" && order.deliveredAt;

  const sudahUlas =
    order.kind === "reguler" && !!userId && sudahUlasProp;
  const showUlas =
    order.kind === "reguler" && status === "selesai" && !sudahUlas;

  const hasQuickActions = showKomplain || showTerima || showUlas;

  return (
    <li className="overflow-hidden rounded-xl border border-brand-cream bg-white shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brand-cream bg-brand-cream/30 px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          {order.kind === "custom" ? (
            <span className="flex items-center gap-1 rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-black text-brand-orange">
              <Palette className="h-3 w-3" /> CUSTOM
            </span>
          ) : (
            <Package className="h-3.5 w-3.5 text-brand-black/60" />
          )}
          <code className="font-mono font-bold text-brand-black/70">
            {order.id}
          </code>
          {hasKomplain && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700">
              <ShieldAlert className="h-2.5 w-2.5" /> Komplain
            </span>
          )}
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${order.statusColor}`}
        >
          <StatusIcon kind={order.kind} />
          {order.statusLabel}
        </span>
      </div>

      {/* Body */}
      <Link
        href={detailHref}
        className="block px-4 py-3 hover:bg-brand-cream/20"
      >
        <div className="flex items-start gap-3">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-brand-cream/40">
            {order.thumbnail ? (
              <Image
                src={order.thumbnail}
                alt={order.judul}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : order.kind === "custom" ? (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
                <Palette className="h-7 w-7 text-brand-orange" />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-brand-black/30">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold text-brand-black">
              {order.judul}
            </p>
            <p className="mt-0.5 text-[11px] text-brand-black/60">
              {order.subjudul}
            </p>
            {order.warnaList && order.warnaList.length > 0 && (
              <div className="mt-1 flex -space-x-1">
                {order.warnaList.slice(0, 5).map((w, i) => (
                  <div
                    key={i}
                    className="h-4 w-4 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: w.hex }}
                  />
                ))}
              </div>
            )}
            <p className="mt-1 text-[11px] text-brand-black/50">
              {formatTanggal(order.createdAt)}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wide text-brand-black/50">
              {order.kind === "custom" ? "Estimasi" : "Total"}
            </p>
            <p className="text-sm font-black text-brand-orange">
              {order.total > 0 ? formatRp(order.total) : ""}
            </p>
          </div>
        </div>

        {/* Countdown perlu bayar (reguler) */}
        {isWaitingReg && sisaMs > 0 && (
          <div className="mt-3 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span className="font-bold text-amber-700">
              Bayar dalam {formatSisa(sisaMs)}
            </span>
          </div>
        )}

        {/* Highlight siap_dilunasi (custom) */}
        {isSiapDilunasi && (
          <div className="mt-3 flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5 text-brand-orange" />
            <span className="font-bold text-brand-orange">
              Produk selesai diproduksi — siap dilunasi
            </span>
          </div>
        )}
      </Link>

      {/* Quick actions row (jika ada) */}
      {hasQuickActions && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-brand-cream bg-amber-50/40 px-4 py-2">
          {showKomplain && (
            <Link
              href={`/komplain/baru?orderId=${encodeURIComponent(order.id)}`}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
            >
              <ShieldAlert className="h-3 w-3" /> 
              {status === "selesai" ? "Klaim Garansi" : "Komplain"}
            </Link>
          )}
          {showTerima && (
            <Link
              href={`/pesanan/${order.id}`}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <CheckCircle2 className="h-3 w-3" /> Pesanan Diterima
            </Link>
          )}
          {showUlas && (
            <Link
              href={`/ulasan/${order.id}`}
              className="inline-flex items-center gap-1 rounded-full border border-yellow-300 bg-white px-2.5 py-1 text-[11px] font-bold text-yellow-700 hover:bg-yellow-100"
            >
              <Star className="h-3 w-3" /> Beri Ulasan
            </Link>
          )}
        </div>
      )}

      {/* Footer action */}
      <div className="flex items-center justify-end gap-2 border-t border-brand-cream bg-brand-cream/20 px-4 py-2.5">
        <Link
          href={detailHref}
          className="rounded-md border border-brand-cream bg-white px-3 py-1.5 text-xs font-bold text-brand-black hover:border-brand-orange"
        >
          Lihat Detail
        </Link>
        {order.primaryAction && (
          order.kind === "custom" ? (
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="rounded-md bg-brand-orange px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-brand-orange-dark"
            >
              {order.primaryAction.label}
            </button>
          ) : (
            <Link
              href={order.primaryAction.href}
              className="rounded-md bg-brand-orange px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-brand-orange-dark"
            >
              {order.primaryAction.label}
            </Link>
          )
        )}
      </div>
    </li>
  );
}

export default function PesananPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream-light" />}>
      <PesananInner />
    </Suspense>
  );
}