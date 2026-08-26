"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, CheckCircle2, ChevronDown, Clock, Download, FileCheck,
  Filter, Package, Search, ShoppingBag, Truck, Wrench, X,
} from "lucide-react";
import {
  STATUS_COLOR, STATUS_LABEL, formatTanggalJamID,
  type Order, type OrderStatus,
} from "@/lib/orders-storage";
import {
  listOrdersForAdmin, getAdminOrderStats, type AdminOrderFilter,
} from "@/lib/admin-orders-helpers";

const STATUS_TABS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all",                  label: "Semua" },
  { key: "menunggu_pembayaran",  label: "Menunggu Bayar" },
  { key: "menunggu_konfirmasi",  label: "Verifikasi" },
  { key: "diproses",             label: "Diproses" },
  { key: "dikirim",              label: "Dikirim" },
  { key: "selesai",              label: "Selesai" },
  { key: "dibatalkan",           label: "Batal" },
  { key: "kadaluarsa",           label: "Kadaluarsa" },
];

const emptySubscribe = () => () => {};

export default function AdminPenjualanPage() {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [filter, setFilter] = useState<AdminOrderFilter>({ status: "all", jenis: "all" });
  const [showFilter, setShowFilter] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
  }, []);

  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminOrderStats>> | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!mounted) return;
    void getAdminOrderStats().then(setStats).catch(() => setStats(null));
  }, [mounted, tick]);

  useEffect(() => {
    if (!mounted) return;
    void listOrdersForAdmin(filter).then(setOrders).catch(() => setOrders([]));
  }, [mounted, filter, tick]);

  if (!mounted) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;

  return (
    <div className="space-y-5">
      {/* Stat header */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Pesanan"   value={stats?.total ?? 0}                          icon={ShoppingBag} bg="bg-[#fc970a]" />
        <StatCard label="Perlu Verifikasi" value={stats?.byStatus.menunggu_konfirmasi ?? 0}  icon={FileCheck}   bg="bg-amber-500" badge={(stats?.byStatus.menunggu_konfirmasi ?? 0) > 0 ? "URGENT" : undefined} />
        <StatCard label="Sedang Diproses"  value={(stats?.byStatus.diproses ?? 0) + (stats?.byStatus.dikirim ?? 0)} icon={Truck} bg="bg-indigo-500" />
        <StatCard label="Total Omzet"      value={`Rp ${(stats?.omzet ?? 0).toLocaleString("id-ID")}`} icon={CheckCircle2} bg="bg-emerald-500" />
      </section>

      {/* Toolbar */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={filter.q ?? ""}
              onChange={(e) => setFilter({ ...filter, q: e.target.value })}
              placeholder="Cari ID, nama pembeli, no HP..."
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white"
            />
          </div>
          <select
            value={filter.jenis ?? "all"}
            onChange={(e) => setFilter({ ...filter, jenis: e.target.value as AdminOrderFilter["jenis"] })}
            className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-[#FF6B1A]"
          >
            <option value="all">Semua Jenis</option>
            <option value="reguler">Reguler</option>
            <option value="custom">Custom</option>
          </select>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-900 hover:bg-gray-50"
          >
            <Filter className="h-3.5 w-3.5" /> Tanggal
            <ChevronDown className={`h-3.5 w-3.5 transition ${showFilter ? "rotate-180" : ""}`} />
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-[#fc970a] px-4 py-2.5 text-xs font-black text-white hover:bg-[#e08a00]">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>

        {showFilter && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-900">
              Dari
              <input type="date" value={filter.from ?? ""} onChange={(e) => setFilter({ ...filter, from: e.target.value })}
                className="rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-900">
              Sampai
              <input type="date" value={filter.to ?? ""} onChange={(e) => setFilter({ ...filter, to: e.target.value })}
                className="rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
            </label>
            {(filter.from || filter.to) && (
              <button onClick={() => setFilter({ ...filter, from: undefined, to: undefined })}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-200">
                <X className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
        )}

        {/* Status tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
          {STATUS_TABS.map((t) => {
            const active = (filter.status ?? "all") === t.key;
            const count = t.key === "all" ? stats?.total ?? 0 : (stats?.byStatus[t.key as OrderStatus] ?? 0);
            return (
              <button
                key={t.key}
                onClick={() => setFilter({ ...filter, status: t.key })}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  active ? "bg-[#FF6B1A] text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-[9px] ${active ? "bg-white/20 text-white" : "bg-white text-gray-600"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Table */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {orders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-black text-gray-500">Tidak ada pesanan</p>
            <p className="text-xs text-gray-400">Coba ubah filter atau tunggu pesanan masuk</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr className="text-left font-black uppercase text-[10px] tracking-wider text-gray-500">
                  <th className="px-4 py-3">ID Pesanan</th>
                  <th className="px-4 py-3">Pembeli</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <OrderRow key={o.id} o={o} onClick={() => router.push(`/admin/penjualan/${o.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function OrderRow({ o, onClick }: { o: Order; onClick: () => void }) {
  const isCustom = o.jenisOrder === "custom" || !!o.customMeta;
  return (
    <tr className="cursor-pointer border-b border-gray-100 transition hover:bg-orange-50/30" onClick={onClick}>
      <td className="px-4 py-3">
        <p className="font-black text-gray-900">{o.id}</p>
        <p className="text-[10px] text-gray-500">{o.items.length} item</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-bold text-gray-900">{o.alamat?.nama ?? "-"}</p>
        <p className="text-[10px] text-gray-500">{o.alamat?.noHp ?? "-"}</p>
      </td>
      <td className="px-4 py-3">
        {isCustom ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-[#FF6B1A]">
            <Wrench className="h-3 w-3" /> Custom
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">
            <Package className="h-3 w-3" /> Reguler
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="line-clamp-1 max-w-[200px] text-gray-700">{o.items[0]?.nama ?? "-"}</p>
        {o.items.length > 1 && <p className="text-[10px] text-gray-500">+{o.items.length - 1} lainnya</p>}
      </td>
      <td className="px-4 py-3 text-right font-black text-gray-900">Rp {o.total.toLocaleString("id-ID")}</td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_COLOR[o.status]}`}>
          {STATUS_LABEL[o.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-[11px] text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-gray-400" />
          {formatTanggalJamID(o.createdAt)}
        </div>
      </td>
      <td className="px-4 py-3">
        <ArrowRight className="h-4 w-4 text-[#FF6B1A]" />
      </td>
    </tr>
  );
}

function StatCard({ label, value, icon: Icon, bg, badge }: {
  label: string; value: string | number; icon: React.ElementType; bg: string; badge?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {badge && <span className="absolute right-2 top-2 animate-pulse rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-black text-white">{badge}</span>}
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} text-white shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-black text-gray-900">{value}</p>
    </div>
  );
}