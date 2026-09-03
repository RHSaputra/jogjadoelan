"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, ChevronDown, Clock, Download, ExternalLink, FileCheck,
  Filter, Package, Search, ShoppingBag, Truck, Wrench, X,
} from "lucide-react";
import {
  STATUS_COLOR, STATUS_LABEL, formatTanggalJamID,
  type Order, type OrderStatus,
} from "@/lib/orders-storage";
import {
  listOrdersForAdmin, getAdminOrderStats, type AdminOrderFilter,
} from "@/lib/admin-orders-helpers";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted) return;
    void getAdminOrderStats().then(setStats).catch(() => setStats(null));
  }, [mounted, tick]);

  useEffect(() => {
    if (!mounted) return;
    setLoading(true);
    void listOrdersForAdmin(filter)
      .then((res) => {
        setOrders(res);
        setLoading(false);
      })
      .catch(() => {
        setOrders([]);
        setLoading(false);
      });
  }, [mounted, filter, tick]);

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 w-1/4 rounded-xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-200" />)}
        </div>
        <div className="h-96 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="Daftar Pesanan"
        subtitle="Kelola pesanan pelanggan, pantau status pembayaran & logistik secara real-time"
        breadcrumbs={[{ label: "Sales" }, { label: "Pesanan" }]}
        actions={
          <button
            type="button"
            onClick={() => {
              // Quick export placeholder or logic
              alert("Menyiapkan ekspor data pesanan...");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Export Data
          </button>
        }
      />

      {/* KPI Stats */}
      <section className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        <AdminStatCard
          label="Total Pesanan"
          value={stats?.total ?? 0}
          subtitle="Semua status transaksi"
          icon={ShoppingBag}
          color="orange"
        />
        <AdminStatCard
          label="Perlu Verifikasi"
          value={stats?.byStatus.menunggu_konfirmasi ?? 0}
          subtitle="Bukti bayar butuh konfirmasi"
          icon={FileCheck}
          color="amber"
          alert={(stats?.byStatus.menunggu_konfirmasi ?? 0) > 0}
        />
        <AdminStatCard
          label="Sedang Diproses"
          value={(stats?.byStatus.diproses ?? 0) + (stats?.byStatus.dikirim ?? 0)}
          subtitle="Packing & dalam pengiriman"
          icon={Truck}
          color="blue"
        />
        <AdminStatCard
          label="Total Omzet"
          value={`Rp ${(stats?.omzet ?? 0).toLocaleString("id-ID")}`}
          subtitle="Akumulasi omzet penjualan"
          icon={CheckCircle2}
          color="emerald"
        />
      </section>

      {/* Filter & Status Tabs Toolbar */}
      <AdminCard bodyClassName="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filter.q ?? ""}
              onChange={(e) => setFilter({ ...filter, q: e.target.value })}
              placeholder="Cari ID pesanan, nama pembeli, no HP..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#FF6B1A] focus:bg-white focus:ring-3 focus:ring-orange-500/10"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filter.jenis ?? "all"}
              onChange={(e) => setFilter({ ...filter, jenis: e.target.value as AdminOrderFilter["jenis"] })}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none transition focus:border-[#FF6B1A] focus:bg-white cursor-pointer"
            >
              <option value="all">Semua Jenis</option>
              <option value="reguler">Reguler</option>
              <option value="custom">Custom</option>
            </select>

            <button
              type="button"
              onClick={() => setShowFilter(!showFilter)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span>Tanggal</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showFilter ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Expandable Date Filter */}
        {showFilter && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              Dari:
              <input
                type="date"
                value={filter.from ?? ""}
                onChange={(e) => setFilter({ ...filter, from: e.target.value })}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-[#FF6B1A]"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              Sampai:
              <input
                type="date"
                value={filter.to ?? ""}
                onChange={(e) => setFilter({ ...filter, to: e.target.value })}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-[#FF6B1A]"
              />
            </label>
            {(filter.from || filter.to) && (
              <button
                type="button"
                onClick={() => setFilter({ ...filter, from: undefined, to: undefined })}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="h-3 w-3" /> Reset Tanggal
              </button>
            )}
          </div>
        )}

        {/* Status Pill Tabs (Horizontal touch-scroll on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 pt-2 border-t border-slate-100">
          {STATUS_TABS.map((t) => {
            const active = (filter.status ?? "all") === t.key;
            const count = t.key === "all" ? stats?.total ?? 0 : (stats?.byStatus[t.key as OrderStatus] ?? 0);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter({ ...filter, status: t.key })}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                  active
                    ? "bg-[#FF6B1A] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    active ? "bg-white/20 text-white" : "bg-white text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </AdminCard>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-[#FF6B1A] border-t-transparent" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Memuat pesanan...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8">
            <AdminEmptyState
              icon={ShoppingBag}
              title="Tidak ada pesanan ditemukan"
              description="Tidak ada data transaksi yang cocok dengan kriteria filter saat ini."
              action={
                <button
                  type="button"
                  onClick={() => setFilter({ status: "all", jenis: "all" })}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Reset Semua Filter
                </button>
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">ID Pesanan</th>
                    <th className="px-4 py-3.5">Pelanggan</th>
                    <th className="px-4 py-3.5">Jenis</th>
                    <th className="px-4 py-3.5">Produk</th>
                    <th className="px-4 py-3.5 text-right">Total</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5">Waktu</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const isCustom = o.jenisOrder === "custom" || !!o.customMeta;
                    return (
                      <tr
                        key={o.id}
                        onClick={() => router.push(`/admin/penjualan/${o.id}`)}
                        className="cursor-pointer hover:bg-slate-50/70 transition-colors group"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900 font-mono group-hover:text-[#FF6B1A] transition-colors">
                            #{o.id}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {o.items.length} item
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-800 truncate max-w-[150px]">
                            {o.alamat?.nama ?? "-"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {o.alamat?.noHp ?? "-"}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          {isCustom ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-bold text-[#FF6B1A]">
                              <Wrench className="h-3 w-3" /> Custom
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                              <Package className="h-3 w-3" /> Reguler
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="line-clamp-1 max-w-[200px] font-medium text-slate-700">
                            {o.items[0]?.nama ?? "-"}
                          </p>
                          {o.items.length > 1 && (
                            <p className="text-[10px] text-slate-400">
                              +{o.items.length - 1} produk lainnya
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          Rp {o.total.toLocaleString("id-ID")}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <AdminStatusBadge status={o.status} size="sm" />
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{formatTanggalJamID(o.createdAt)}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF6B1A] group-hover:underline">
                            Detail <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Order Cards View */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {orders.map((o) => {
                const totalItem = o.items.reduce((sum, it) => sum + (it.qty ?? 1), 0);
                const isCustom = o.jenisOrder === "custom" || !!o.customMeta;

                return (
                  <div key={o.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">#{o.id}</span>
                      <AdminStatusBadge status={o.status} size="sm" />
                    </div>

                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">{o.alamat?.nama ?? "Tanpa Nama"}</p>
                        <p className="text-[11px] text-slate-500">{formatTanggalJamID(o.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 text-sm">
                          Rp {o.total.toLocaleString("id-ID")}
                        </span>
                        <p className="text-[11px] text-slate-500">{totalItem} barang {isCustom ? "• Custom" : ""}</p>
                      </div>
                    </div>

                    <Link
                      href={`/admin/penjualan/${o.id}`}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#FF6B1A] hover:text-white hover:border-[#FF6B1A] transition min-h-[44px]"
                    >
                      <span>Lihat Detail Pesanan</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}