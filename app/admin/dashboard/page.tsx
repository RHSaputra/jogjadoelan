"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  dashboard,
  type DashboardSummary, type SalesTrendPoint,
  type TopProduct, type LowStockItem, type RecentOrder,
} from "@/lib/dashboard-helpers";

const fmtRp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<SalesTrendPoint[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [low, setLow] = useState<LowStockItem[]>([]);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      dashboard.summary(),
      dashboard.salesTrend(30),
      dashboard.topProducts(30, 5),
      dashboard.lowStock(5, 10),
      dashboard.recentOrders(8),
    ]).then(([s, t, tp, ls, ro]) => {
      if (!active) return;
      setSummary(s); setTrend(t.series); setTop(tp); setLow(ls); setRecent(ro);
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading || !summary) {
    return <div className="p-6">Memuat dashboard...</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard title="Revenue Hari Ini" value={fmtRp(summary.revenue.today)} />
        <KpiCard title="Revenue 7 Hari" value={fmtRp(summary.revenue.last7)} />
        <KpiCard title="Revenue 30 Hari" value={fmtRp(summary.revenue.last30)} />
        <KpiCard title="Revenue All Time" value={fmtRp(summary.revenue.allTime)} highlight />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard title="Order Hari Ini" value={String(summary.orders.today)} />
        <KpiCard title="Customer Baru (7h)" value={String(summary.customers.new7)} />
        <KpiCard title="Total Customer" value={String(summary.customers.total)} />
        <KpiCard title="Aksi Perlu Ditindak" value={String(summary.urgent.totalAction)} alert={summary.urgent.totalAction > 0} />
      </section>

      {/* Urgent box */}
      <section className="bg-white border rounded-lg p-2.5 sm:p-4 flex flex-wrap justify-center gap-2 sm:grid sm:grid-cols-5 md:gap-4">
        <UrgentItem label="Verif Pembayaran" value={summary.orders.pending.menungguVerifikasi} href="/admin/order?tab=menunggu_verifikasi" />
        <UrgentItem label="Komplain Baru" value={summary.urgent.komplainBaru} href="/admin/komplain?tab=baru" />
        <UrgentItem label="Refund Review" value={summary.urgent.refundReview} href="/admin/refund" />
        <UrgentItem label="Tukar Review" value={summary.urgent.tukarReview} href="/admin/tukar" />
        <UrgentItem label="Stok Menipis" value={summary.urgent.lowStockCount} href="/admin/produk?lowStock=1" />
      </section>

      {/* Sales chart */}
      <section className="bg-white border rounded-lg p-3 sm:p-4">
        <h2 className="font-semibold text-sm sm:text-base mb-3">Tren Penjualan 30 Hari</h2>
        <SimpleBarChart data={trend} />
      </section>

      {/* Top products & Low stock */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-3 sm:p-4">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Top 5 Produk (30 hari)</h2>
          <ul className="space-y-2">
            {top.length === 0 && <li className="text-xs sm:text-sm text-zinc-500">Belum ada penjualan</li>}
            {top.map((p) => (
              <li key={p.produkId} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                <span className="truncate">{p.nama}</span>
                <span className="shrink-0 text-xs sm:text-sm tabular-nums text-zinc-600">{p.totalTerjual} terjual · {fmtRp(p.totalRevenue)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border rounded-lg p-3 sm:p-4">
          <h2 className="font-semibold text-sm sm:text-base mb-3">Stok Menipis (≤5)</h2>
          <ul className="space-y-2">
            {low.length === 0 && <li className="text-xs sm:text-sm text-zinc-500">Semua stok aman</li>}
            {low.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                <Link href={`/admin/produk/${p.id}`} className="hover:underline truncate">{p.nama}</Link>
                <span className={`shrink-0 text-xs sm:text-sm tabular-nums ${p.stok === 0 ? "text-red-600 font-semibold" : "text-amber-600"}`}>
                  Stok: {p.stok}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recent orders */}
      <section className="bg-white border rounded-lg p-3 sm:p-4">
        <h2 className="font-semibold text-sm sm:text-base mb-3">Pesanan Terbaru</h2>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs sm:text-sm min-w-[650px] md:min-w-0">
            <thead className="text-left text-zinc-500">
              <tr><th className="py-2">ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Tanggal</th></tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="py-2"><Link href={`/admin/order/${o.id}`} className="hover:underline">{o.id}</Link></td>
                  <td>{o.userName}</td>
                  <td>{fmtRp(o.total)}</td>
                  <td><span className="px-2 py-0.5 rounded bg-zinc-100 text-xs">{o.status}</span></td>
                  <td className="text-zinc-500 text-xs">{new Date(o.createdAt).toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ title, value, highlight, alert }: { title: string; value: string; highlight?: boolean; alert?: boolean }) {
  return (
    <div className={`rounded-lg p-3 md:p-4 border ${
      highlight ? "bg-emerald-50 border-emerald-200" :
      alert ? "bg-amber-50 border-amber-200" : "bg-white"
    }`}>
      <div className="text-[10px] sm:text-xs text-zinc-500 truncate">{title}</div>
      <div className="text-lg sm:text-xl md:text-2xl font-black mt-0.5 sm:mt-1">{value}</div>
    </div>
  );
}

function UrgentItem({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="flex-1 min-w-[75px] sm:w-auto sm:min-w-0 block text-center hover:bg-zinc-50 rounded-md p-1 sm:p-2 transition-colors">
      <div className={`text-base sm:text-xl md:text-2xl font-black ${value > 0 ? "text-amber-600" : "text-zinc-400"}`}>{value}</div>
      <div className="text-[9px] sm:text-xs text-zinc-500 font-medium leading-tight break-words">{label}</div>
    </Link>
  );
}

function SimpleBarChart({ data }: { data: SalesTrendPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center group">
          <div
            className="w-full bg-emerald-400 hover:bg-emerald-600 rounded-t transition-colors"
            style={{ height: `${(d.revenue / max) * 100}%`, minHeight: 2 }}
            title={`${d.date}: Rp${d.revenue.toLocaleString("id-ID")} (${d.orders} order)`}
          />
        </div>
      ))}
    </div>
  );
}