"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Banknote, Calendar, CheckCircle2, Inbox, Layers,
  Palette, Search, ShoppingBag, Wrench, Zap,
} from "lucide-react";
import {
  CUSTOM_STATUS_COLOR, CUSTOM_STATUS_LABEL, type CustomOrder,
} from "@/lib/custom-order-context";
import {
  formatRp, getCustomStats, getCustomTotalPaid, listCustomOrdersForAdmin,
  type CustomTabKey,
} from "@/lib/admin-custom-helpers";

const TABS: { key: CustomTabKey; label: string; urgent?: boolean }[] = [
  { key: "all",            label: "Semua" },
  { key: "perlu_estimasi", label: "Perlu Estimasi", urgent: true },
  { key: "verifikasi",     label: "Verifikasi Bayar", urgent: true },
  { key: "diproses",       label: "Diproduksi" },
  { key: "siap_dilunasi",  label: "Siap Dilunasi" },
  { key: "dikirim",        label: "Dikirim" },
  { key: "selesai",        label: "Selesai" },
  { key: "ditolak",        label: "Ditolak/Batal" },
];

const emptySubscribe = () => () => {};

export default function AdminCustomPage() {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [tab, setTab] = useState<CustomTabKey>("all");
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("storage", onChange);
    window.addEventListener("jogjadoelan_custom_changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("jogjadoelan_custom_changed", onChange);
    };
  }, []);

  const [stats, setStats] = useState<Awaited<ReturnType<typeof getCustomStats>> | null>(null);
  const [list, setList] = useState<Awaited<ReturnType<typeof listCustomOrdersForAdmin>>>([]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const [s, l] = await Promise.all([
        getCustomStats(),
        listCustomOrdersForAdmin({ tab, q }),
      ]);
      if (!cancelled) { setStats(s); setList(l); }
    })();
    return () => { cancelled = true; };
  }, [mounted, tab, q, tick]);

  if (!mounted) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-orange-500 p-5 text-gray-900 shadow-lg ring-1 ring-orange-500/30 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-900">
              <Wrench className="h-3.5 w-3.5" /> Manajemen Custom Order
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Helm Custom Pesanan</h1>
            <p className="mt-1 text-xs text-gray-800">Set estimasi, verifikasi DP/Lunas, kelola produksi sampai pengiriman.</p>
          </div>
          <div className="rounded-2xl bg-white/50 px-5 py-3 text-center backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-900">Total Order Custom</p>
            <p className="text-3xl font-black text-gray-900">{stats?.counts.all ?? 0}</p>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Perlu Estimasi" value={stats?.counts.perlu_estimasi ?? 0} icon={Zap}        bg="bg-amber-500" alert={(stats?.counts.perlu_estimasi ?? 0) > 0} />
        <StatCard label="Verifikasi Bayar" value={stats?.counts.verifikasi ?? 0}    icon={Banknote}   bg="bg-blue-500"  alert={(stats?.counts.verifikasi ?? 0) > 0} />
        <StatCard label="Sedang Produksi"  value={stats?.counts.diproses ?? 0}      icon={Layers}     bg="bg-violet-500" />
        <StatCard label="Omzet Custom"     value={formatRp(stats?.omzet ?? 0)}      icon={CheckCircle2} bg="bg-emerald-500" />
      </section>

      {/* Toolbar */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari ID, jenis helm, catatan..."
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white"
          />
        </div>

        {/* Tabs */}
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = stats?.counts[t.key] ?? 0;
            const showAlert = t.urgent && count > 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  active ? "bg-[#FF6B1A] text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-[9px] ${
                  active ? "bg-white/20 text-white"
                  : showAlert ? "bg-red-500 text-white animate-pulse"
                  : "bg-white text-gray-600"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid */}
      {list.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
          <Inbox className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm font-black text-gray-500">Tidak ada custom order</p>
          <p className="text-xs text-gray-400">Coba ubah filter atau tunggu order baru</p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((o) => (
            <CustomCard key={o.id} order={o} onClick={() => router.push(`/admin/custom/${o.id}`)} />
          ))}
        </section>
      )}
    </div>
  );
}

/* ====================  CARD  ==================== */

function CustomCard({ order, onClick }: { order: CustomOrder; onClick: () => void }) {
  const total = order.estimasi?.total ?? 0;
  const paid = getCustomTotalPaid(order);
  const ref = order.referensiFiles?.[0];
  const tglMs = order.createdAt;
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border-2 border-gray-200 bg-white text-left shadow-sm transition hover:border-[#FF6B1A] hover:shadow-md"
    >
      {/* Top strip */}
      <div className="relative h-32 w-full bg-gradient-to-br from-orange-100 to-amber-100">
        {ref?.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ref.dataUrl} alt={ref.name} className="h-full w-full object-contain p-2" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Wrench className="h-10 w-10 text-orange-300" />
          </div>
        )}
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${CUSTOM_STATUS_COLOR[order.status]}`}>
          {CUSTOM_STATUS_LABEL[order.status]}
        </span>
        {order.isLate && (
          <span className="absolute right-2 top-2 animate-pulse rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow">
            Telat
          </span>
        )}
        {order.paymentType && (
          <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[9px] font-black uppercase text-white">
            {order.paymentType === "dp" ? "DP" : "Lunas"}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4 text-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold text-gray-500">{order.id}</p>
            <p className="mt-0.5 truncate font-black text-gray-900">{order.jenis}</p>
          </div>
          {total > 0 && (
            <p className="shrink-0 text-right">
              <span className="text-[9px] uppercase tracking-wider text-gray-400">Total</span><br />
              <span className="text-sm font-black text-[#FF6B1A]">{formatRp(total)}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-600">
          <Pill icon={Palette} label={`${order.warnaList?.length ?? 0} warna`} />
          <Pill label={order.ukuran} />
          <Pill label={order.finishing} />
          {order.referensiFiles?.length > 0 && <Pill icon={ShoppingBag} label={`${order.referensiFiles.length} ref`} />}
        </div>

        {/* Warna preview */}
        {order.warnaList?.length > 0 && (
          <div className="flex gap-1">
            {order.warnaList.slice(0, 6).map((w, i) => (
              <span key={i} className="h-4 w-4 rounded-full border border-gray-200 shadow-sm" style={{ background: w.hex }} title={w.nama ?? w.hex} />
            ))}
          </div>
        )}

        {/* Bayar progress */}
        {total > 0 && (
          <div className="mt-1 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>Dibayar: <span className="font-black text-emerald-600">{formatRp(paid)}</span></span>
              <span>{Math.min(100, Math.round((paid / total) * 100))}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#FF6B1A]" style={{ width: `${Math.min(100, (paid / total) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-dashed border-gray-100 pt-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(tglMs).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1 font-black text-[#FF6B1A] group-hover:underline">
            Kelola <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </button>
  );
}

function Pill({ icon: Icon, label }: { icon?: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-bold">
      {Icon && <Icon className="h-2.5 w-2.5" />} {label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, bg, alert }: {
  label: string; value: string | number; icon: React.ElementType; bg: string; alert?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {alert && <span className="absolute right-2 top-2 h-2 w-2 animate-ping rounded-full bg-red-500" />}
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} text-white shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-black text-gray-900">{value}</p>
    </div>
  );
}