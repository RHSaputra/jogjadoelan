"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle, ArrowRight, Calendar, CheckCircle2, DollarSign, FileCheck,
  MessageCircle, Package, ShieldAlert, ShoppingBag, TrendingUp,
  Wrench,
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin-context";
import { dashboard } from "@/lib/dashboard-helpers";

// CRITICAL FIX: Dashboard admin sekarang menggunakan /api/admin/dashboard/summary
// yang sudah teroptimasi dengan Promise.all — bukan getAllOrdersGlobal() yang
// membaca seluruh tabel order + filter di client.
// getChatStats() yang deprecated (selalu return 0) juga sudah digantikan dengan
// data dari endpoint summary yang benar.

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboard.summary(),
    staleTime: 30_000,     // data dianggap fresh 30 detik
    refetchInterval: 60_000, // auto-refresh tiap 1 menit
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
      custom: {
        counts: {
          all: 0,
          perlu_estimasi: 0,
          verifikasi: 0,
          diproses: 0,
          siap_dilunasi: 0,
          dikirim: 0,
          selesai: 0,
          ditolak: 0,
        },
        omzet: 0,
      },
      chat: { total: 0, pending: 0 },
      urgent: summary.urgent,
    };
  }, [summary]);

  if (isLoading || !stats) return (
    <div className="space-y-6">
      <div className="h-28 w-full animate-pulse rounded-3xl bg-gray-200"></div>
      <div className="grid gap-3 sm:grid-cols-2">
         <div className="h-16 w-full animate-pulse rounded-2xl bg-gray-200"></div>
         <div className="h-16 w-full animate-pulse rounded-2xl bg-gray-200"></div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200 shadow-sm"></div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-400 to-orange-500 p-6 text-gray-900 shadow-lg ring-1 ring-orange-500/30 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-900">Selamat Datang</p>
            <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">Halo, {admin?.nama ?? "Admin"}</h2>
            <p className="mt-2 flex items-center gap-2 text-xs text-gray-800">
              <Calendar className="h-3.5 w-3.5" />
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      {/* URGENT ALERT BAR */}
      {(stats.totalNeedVerify > 0 || stats.urgent.komplainBaru > 0) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {stats.totalNeedVerify > 0 && (
            <AlertBar href="/admin/validasi-bukti" icon={ShieldAlert} bg="bg-amber-50 border-amber-300 text-amber-900"
              title={`${stats.totalNeedVerify} bukti pembayaran menunggu verifikasi`}
              subtitle={`Perlu dikonfirmasi segera`} />
          )}
          {stats.urgent.komplainBaru > 0 && (
            <AlertBar href="/admin/komplain" icon={ShieldAlert} bg="bg-red-50 border-red-300 text-red-900"
              title={`${stats.urgent.komplainBaru} komplain baru menunggu`}
              subtitle={`Refund: ${stats.urgent.refundReview} · Tukar: ${stats.urgent.tukarReview}`} />
          )}
        </section>
      )}

      {/* Metric cards utama */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Omzet Hari Ini" value={`Rp ${stats.omzetToday.toLocaleString("id-ID")}`} icon={DollarSign} bg="bg-emerald-500" href="/admin/penjualan" />
        <MetricCard label="Pesanan Hari Ini" value={stats.todayOrdersCount} icon={ShoppingBag} bg="bg-[#FF6B1A]" href="/admin/penjualan" />
        <MetricCard label="Perlu Verifikasi" value={stats.totalNeedVerify} icon={FileCheck} bg="bg-amber-500" href="/admin/validasi-bukti" badge={stats.totalNeedVerify > 0 ? "URGENT" : undefined} />
        <MetricCard label="Stok Kritis" value={stats.lowStock} icon={AlertCircle} bg="bg-red-500" href="/admin/produk" />
      </section>

      {/* Quick stats row 2 */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Menunggu Bayar" value={stats.pendingPayment} icon={ShoppingBag} bg="bg-blue-500" href="/admin/penjualan" tone="soft" />
        <MetricCard label="Total Selesai" value={stats.totalSelesai} icon={CheckCircle2} bg="bg-green-500" href="/admin/penjualan" tone="soft" />
        <MetricCard label="Komplain Aktif" value={stats.urgent.komplainBaru}
          badge={stats.urgent.komplainBaru > 0 ? `${stats.urgent.komplainBaru} baru` : undefined}
          icon={Wrench} bg="bg-pink-500" href="/admin/komplain" tone="soft" />
        <MetricCard label="Refund Review" value={stats.urgent.refundReview}
          icon={MessageCircle} bg="bg-indigo-500" href="/admin/refund" tone="soft" />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent orders */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-orange-600">Pesanan Terbaru</h3>
              <p className="text-[11px] text-gray-500">5 pesanan terakhir</p>
            </div>
            <Link href="/admin/penjualan" className="flex items-center gap-1 text-xs font-bold text-[#FF6B1A] hover:underline">
              Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-xs font-bold text-gray-500">Belum ada pesanan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <Link key={o.id} href={`/admin/penjualan/${o.id}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 hover:border-[#FF6B1A] hover:bg-orange-50/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-black text-gray-800">{o.id}</p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(o.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-800">Rp {o.total.toLocaleString("id-ID")}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-black text-orange-600">Aksi Cepat</h3>
            <div className="space-y-2">
              <QuickAction href="/admin/validasi-bukti" icon={ShieldAlert} label="Validasi Bukti" color="bg-amber-50 text-amber-700" count={stats.totalNeedVerify} />
              <QuickAction href="/admin/custom" icon={Wrench} label="Custom Order" color="bg-pink-50 text-pink-700" />
              <QuickAction href="/admin/chat" icon={MessageCircle} label="Chat Customer" color="bg-blue-50 text-blue-700" />
              <QuickAction href="/admin/komplain" icon={ShieldAlert} label="Kelola Komplain" color="bg-red-50 text-red-700" count={stats.urgent.komplainBaru} />
              <QuickAction href="/admin/produk" icon={Package} label="Kelola Produk" color="bg-emerald-50 text-emerald-700" />
              <QuickAction href="/admin/promo" icon={TrendingUp} label="Buat Promo" color="bg-orange-50 text-[#FF6B1A]" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ====================  SUB COMPONENTS  ==================== */

function MetricCard({ label, value, icon: Icon, bg, href, badge, tone = "solid" }: {
  label: string; value: string | number; icon: React.ElementType; bg: string; href: string;
  badge?: string; tone?: "solid" | "soft";
}) {
  return (
    <Link href={href} className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5">
      {badge && (
        <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-black text-white shadow animate-pulse">
          {badge}
        </span>
      )}
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
        tone === "solid"
          ? `${bg} text-white shadow-md`
          : `${bg.replace("500", "100")} ${bg.replace("bg-", "text-").replace("500", "700")}`
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-black text-gray-800 sm:text-xl">{value}</p>
    </Link>
  );
}

function QuickAction({ href, icon: Icon, label, color, count }: {
  href: string; icon: React.ElementType; label: string; color: string; count?: number;
}) {
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-lg ${color} px-3 py-2.5 text-xs font-black hover:scale-[1.02] transition`}>
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      {!!count && count > 0 && (
        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black text-white">{count}</span>
      )}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function AlertBar({ href, icon: Icon, bg, title, subtitle }: {
  href: string; icon: React.ElementType; bg: string; title: string; subtitle: string;
}) {
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-2xl border-2 ${bg} p-4 shadow-sm transition hover:shadow-md`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-black">{title}</p>
        <p className="text-[10px] opacity-80">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}