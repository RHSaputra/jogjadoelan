"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, ShoppingBag, MessageCircle, DollarSign, ArrowUpRight, Calendar } from "lucide-react";
import Link from "next/link";
import { getAllOrdersGlobal } from "@/lib/orders-storage";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

interface Pelanggan {
  userId: string;
  nama: string;
  hp: string;
  totalOrder: number;
  totalSpent: number;
  lastOrderAt: string;
}

export default function AdminPelangganPage() {
  const [list, setList] = useState<Pelanggan[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const refresh = async () => {
      const orders = await getAllOrdersGlobal();
      const map = new Map<string, Pelanggan>();
      for (const o of orders) {
        const uid = o.userId ?? "unknown";
        const prev = map.get(uid);
        const nama = o.alamat?.nama ?? "Tanpa nama";
        const hp = o.alamat?.noHp ?? "-";
        const total = Number(o.total ?? 0);
        const at = o.createdAt ?? new Date().toISOString();
        if (!prev) {
          map.set(uid, { userId: uid, nama, hp, totalOrder: 1, totalSpent: total, lastOrderAt: at });
        } else {
          prev.totalOrder += 1;
          prev.totalSpent += total;
          if (new Date(at) > new Date(prev.lastOrderAt)) {
            prev.lastOrderAt = at;
            prev.nama = nama;
            prev.hp = hp;
          }
        }
      }
      setList(Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent));
    };
    void refresh();
    const on = () => { void refresh(); };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (p) =>
        p.nama.toLowerCase().includes(s) ||
        p.hp.includes(s) ||
        p.userId.toLowerCase().includes(s)
    );
  }, [list, q]);

  const totalOmzet = list.reduce((s, p) => s + p.totalSpent, 0);
  const totalOrders = list.reduce((s, p) => s + p.totalOrder, 0);
  const avgOrder = list.length ? Math.round(totalOrders / list.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Data Pelanggan"
        subtitle="Analisis database pembeli, akumulasi nilai belanja, dan riwayat interaksi customer"
        breadcrumbs={[{ label: "Customer" }, { label: "Data Pelanggan" }]}
      />

      {/* KPI Stats */}
      <section className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        <AdminStatCard
          label="Total Pelanggan"
          value={list.length}
          subtitle="User unik yang bertransaksi"
          icon={Users}
          color="blue"
        />
        <AdminStatCard
          label="Total Pesanan"
          value={totalOrders}
          subtitle="Akumulasi frekuensi transaksi"
          icon={ShoppingBag}
          color="orange"
        />
        <AdminStatCard
          label="Total Belanja"
          value={`Rp ${totalOmzet.toLocaleString("id-ID")}`}
          subtitle="Lifetime value customer"
          icon={DollarSign}
          color="emerald"
        />
        <AdminStatCard
          label="Rata-rata Order"
          value={`${avgOrder}x / user`}
          subtitle="Frekuensi repeat order"
          icon={Users}
          color="purple"
        />
      </section>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama pembeli, nomor HP, atau User ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FF6B1A] focus:bg-white focus:ring-3 focus:ring-orange-500/10"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8">
            <AdminEmptyState
              icon={Users}
              title="Tidak ada pelanggan ditemukan"
              description="Tidak ada data pembeli yang sesuai dengan kueri pencarian Anda."
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Pelanggan</th>
                    <th className="px-4 py-3.5">Kontak</th>
                    <th className="px-4 py-3.5 text-center">Frekuensi Order</th>
                    <th className="px-4 py-3.5 text-right">Total Belanja</th>
                    <th className="px-4 py-3.5">Transaksi Terakhir</th>
                    <th className="px-5 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <tr key={p.userId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B1A] font-bold text-xs border border-orange-100">
                            {p.nama ? p.nama.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[180px]">{p.nama}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[180px] font-mono">
                              {p.userId}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        {p.hp || "-"}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                          {p.totalOrder} pesanan
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        Rp {p.totalSpent.toLocaleString("id-ID")}
                      </td>

                      <td className="px-4 py-3.5 text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>
                            {new Date(p.lastOrderAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {p.userId && p.userId !== "unknown" ? (
                          <Link
                            href={`/admin/chat?userId=${p.userId}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-orange-50 border border-orange-200/80 px-3 py-1.5 text-xs font-bold text-[#FF6B1A] hover:bg-[#FF6B1A] hover:text-white transition-all shadow-xs"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Direct Chat
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Customer Cards View */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {filtered.map((p) => (
                <div key={p.userId} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B1A] font-bold text-sm border border-orange-100">
                        {p.nama ? p.nama.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{p.nama}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{p.userId}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 shrink-0">
                      {p.totalOrder} order
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/80">
                    <div className="text-slate-500">
                      <p className="text-[11px]">Kontak: {p.hp || "-"}</p>
                      <p className="text-[11px]">
                        Terakhir: {new Date(p.lastOrderAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Belanja</p>
                      <p className="text-sm font-bold text-slate-900">Rp {p.totalSpent.toLocaleString("id-ID")}</p>
                    </div>
                  </div>

                  {p.userId && p.userId !== "unknown" && (
                    <Link
                      href={`/admin/chat?userId=${p.userId}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-50 border border-orange-200/80 py-2.5 text-xs font-bold text-[#FF6B1A] hover:bg-[#FF6B1A] hover:text-white transition min-h-[44px]"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat Pelanggan</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}