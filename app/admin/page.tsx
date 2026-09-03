"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle, ArrowRight, CheckCircle2, DollarSign, FileCheck,
  MessageCircle, Package, ShieldAlert, ShoppingBag, TrendingUp,
  Wrench, Clock, RotateCcw, ExternalLink
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin-context";
import { dashboard } from "@/lib/dashboard-helpers";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboard.summary(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["dashboard", "recent", 5],
    queryFn: () => dashboard.recentOrders(5),
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    if (!summary) return null;
    return {
      omzetToday: summary.revenue.today,
      todayOrdersCount: summary.orders.today,
      needVerify: summary.orders.pending.menungguVerifikasi,
      totalNeedVerify: summary.orders.pending.menungguVerifikasi,
      pendingPayment: summary.orders.pending.menungguPembayaran,
      totalSelesai: summary.orders.allTime,
      lowStock: summary.urgent.lowStockCount,
      urgent: summary.urgent,
    };
  }, [summary]);

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 w-1/3 rounded-xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-72 rounded-2xl bg-slate-200 lg:col-span-2" />
          <div className="h-72 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  const hasUrgentItems = stats.totalNeedVerify > 0 || stats.urgent.komplainBaru > 0 || stats.lowStock > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title={`Selamat Datang, ${admin?.nama || "Admin"}`}
        subtitle={`Ringkasan operasional hari ini · ${new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`}
        actions={
          <Link
            href="/admin/audit"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <TrendingUp className="h-4 w-4 text-[#FF6B1A]" />
            Transaction Intelligence
          </Link>
        }
      />

      {/* ATTENTION REQUIRED (Urgent Action Banner) */}
      {hasUrgentItems && (
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-orange-50/50 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Perlu Tindakan Segera (Action Required)
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.totalNeedVerify > 0 && (
              <Link
                href="/admin/validasi-bukti"
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3.5 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {stats.totalNeedVerify} Bukti Bayar Baru
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Menunggu verifikasi admin
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </Link>
            )}

            {stats.urgent.komplainBaru > 0 && (
              <Link
                href="/admin/komplain"
                className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white p-3.5 shadow-xs hover:border-rose-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {stats.urgent.komplainBaru} Komplain Baru
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Refund: {stats.urgent.refundReview} · Tukar: {stats.urgent.tukarReview}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
              </Link>
            )}

            {stats.lowStock > 0 && (
              <Link
                href="/admin/produk"
                className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-white p-3.5 shadow-xs hover:border-orange-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {stats.lowStock} Produk Stok Kritis
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Sisa 2 unit atau kurang
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Core KPI Metrics */}
      <section className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        <AdminStatCard
          label="Omzet Hari Ini"
          value={`Rp ${stats.omzetToday.toLocaleString("id-ID")}`}
          subtitle="Pemasukan kotor hari ini"
          icon={DollarSign}
          color="emerald"
        />
        <AdminStatCard
          label="Pesanan Hari Ini"
          value={stats.todayOrdersCount}
          subtitle="Total pesanan masuk hari ini"
          icon={ShoppingBag}
          color="orange"
        />
        <AdminStatCard
          label="Verifikasi Pembayaran"
          value={stats.totalNeedVerify}
          subtitle={stats.totalNeedVerify > 0 ? "Memerlukan aksi konfirmasi" : "Semua sudah diverifikasi"}
          icon={FileCheck}
          color="amber"
          alert={stats.totalNeedVerify > 0}
        />
        <AdminStatCard
          label="Pesanan Selesai"
          value={stats.totalSelesai}
          subtitle="Total order all-time"
          icon={CheckCircle2}
          color="blue"
        />
      </section>

      {/* Secondary Status Row */}
      <section className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        <AdminStatCard
          label="Menunggu Bayar"
          value={stats.pendingPayment}
          subtitle="Customer belum transfer/konfirm"
          icon={Clock}
          color="slate"
        />
        <AdminStatCard
          label="Komplain Aktif"
          value={stats.urgent.komplainBaru}
          subtitle="Pengajuan komplain belum selesai"
          icon={Wrench}
          color="rose"
        />
        <AdminStatCard
          label="Refund Dalam Tinjauan"
          value={stats.urgent.refundReview}
          subtitle="Menunggu approval admin"
          icon={RotateCcw}
          color="purple"
        />
        <AdminStatCard
          label="Varian Stok Menipis"
          value={stats.lowStock}
          subtitle="Perlu re-stock segera"
          icon={Package}
          color="amber"
        />
      </section>

      {/* Main Workspace (Recent Orders + Quick Navigation) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders Queue */}
        <div className="lg:col-span-2">
          <AdminCard
            title="Pesanan Terbaru"
            subtitle="5 transaksi terakhir yang masuk ke dalam sistem"
            icon={<ShoppingBag className="h-4 w-4" />}
            action={
              <Link
                href="/admin/penjualan"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#FF6B1A] hover:underline"
              >
                Buka Semua Pesanan <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 text-xs font-semibold">Belum ada pesanan terbaru</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/admin/penjualan/${o.id}`}
                    className="flex items-center justify-between gap-3 py-3 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B1A] border border-orange-100 font-bold text-xs">
                        #{o.id.slice(-4)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-[#FF6B1A] transition-colors truncate">
                          Order #{o.id}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(o.createdAt).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 text-right">
                      <div>
                        <p className="text-xs font-black text-slate-900">
                          Rp {o.total.toLocaleString("id-ID")}
                        </p>
                        <AdminStatusBadge status={o.status} size="sm" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </AdminCard>
        </div>

        {/* Quick Operational Navigation */}
        <div>
          <AdminCard
            title="Aksi Cepat Operasional"
            subtitle="Pintasan modul kerja admin"
            icon={<Wrench className="h-4 w-4" />}
          >
            <div className="space-y-2">
              <Link
                href="/admin/validasi-bukti"
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700 hover:border-amber-300 hover:bg-amber-50/40 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <span>Validasi Bukti Bayar</span>
                </div>
                {stats.totalNeedVerify > 0 && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {stats.totalNeedVerify}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/custom"
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700 hover:border-orange-300 hover:bg-orange-50/40 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-[#FF6B1A]">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <span>Kelola Custom Order</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>

              <Link
                href="/admin/chat"
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700 hover:border-sky-300 hover:bg-sky-50/40 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span>Room Chat Customer</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>

              <Link
                href="/admin/komplain"
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700 hover:border-rose-300 hover:bg-rose-50/40 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <span>Kelola Komplain & Refund</span>
                </div>
                {stats.urgent.komplainBaru > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {stats.urgent.komplainBaru}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/produk"
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Package className="h-4 w-4" />
                  </div>
                  <span>Katalog & Stok Produk</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}