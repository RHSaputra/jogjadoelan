"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw, ArrowRight, DollarSign, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAllReturnsUnified, type ReturnRow } from "@/lib/admin-return-helpers";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";

export default function AdminReturnPage() {
  const router = useRouter();
  const [list, setList] = useState<ReturnRow[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "refund" | "tukar">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const data = await getAllReturnsUnified();
        if (!cancelled) setList(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    refresh();
    const on = () => {
      refresh();
    };
    window.addEventListener("jogjadoelan_refund_changed", on);
    window.addEventListener("jogjadoelan_tukar_changed", on);
    window.addEventListener("jogjadoelan_komplain_changed", on);
    return () => {
      cancelled = true;
      window.removeEventListener("jogjadoelan_refund_changed", on);
      window.removeEventListener("jogjadoelan_tukar_changed", on);
      window.removeEventListener("jogjadoelan_komplain_changed", on);
    };
  }, []);

  const filtered = useMemo(() => {
    let arr = list;
    if (tab !== "all") arr = arr.filter((r) => r.kind === tab);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter(
        (r) =>
          r.id.toLowerCase().includes(s) ||
          r.orderId.toLowerCase().includes(s) ||
          r.komplainId.toLowerCase().includes(s)
      );
    }
    return arr;
  }, [list, q, tab]);

  const refundCount = list.filter((r) => r.kind === "refund").length;
  const tukarCount = list.filter((r) => r.kind === "tukar").length;
  const getReturnHref = (r: ReturnRow) =>
    r.komplainId ? `/admin/komplain/${r.komplainId}` : r.kind === "refund" ? `/admin/refund/${r.id}` : `/admin/return`;

  return (
    <div className="space-y-6 pb-20 font-sans">
      <AdminPageHeader
        title="Pusat Retur & Resolusi"
        subtitle="Kelola pengembalian dana (refund) dan penukaran barang dari komplain pelanggan"
        breadcrumbs={[{ label: "Penjualan" }, { label: "Pusat Retur" }]}
        icon={RotateCcw}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStatCard
          label="Total Pengajuan"
          value={list.length}
          subtitle="Semua resolusi retur aktif"
          icon={RotateCcw}
          color="blue"
        />
        <AdminStatCard
          label="Refund Dana"
          value={refundCount}
          subtitle="Pengembalian dana pelanggan"
          icon={DollarSign}
          color="rose"
        />
        <AdminStatCard
          label="Tukar Barang"
          value={tukarCount}
          subtitle="Penggantian unit atau klaim garansi"
          icon={RefreshCw}
          color="purple"
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari ID retur, ID order, ID komplain..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FF6B1A] focus:bg-white focus:ring-3 focus:ring-orange-500/10"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { key: "all", label: "Semua", count: list.length },
                { key: "refund", label: "Refund", count: refundCount },
                { key: "tukar", label: "Tukar Barang", count: tukarCount },
              ] as const
            ).map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
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
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-[#FF6B1A] border-t-transparent" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Memuat data retur...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <AdminEmptyState
              icon={RotateCcw}
              title="Tidak ada data retur"
              description="Belum ada pengajuan pengembalian dana atau penukaran barang yang terdaftar."
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">ID Retur</th>
                    <th className="px-4 py-3.5">Tipe Resolusi</th>
                    <th className="px-4 py-3.5">ID Pesanan</th>
                    <th className="px-4 py-3.5">ID Komplain</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => router.push(getReturnHref(r))}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-900 group-hover:text-[#FF6B1A] transition-colors">
                        #{r.id}
                      </td>

                      <td className="px-4 py-3.5">
                        {r.kind === "refund" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            <DollarSign className="h-3 w-3" /> Refund Dana
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            <RefreshCw className="h-3 w-3" /> Tukar Barang
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-600">
                        #{r.orderId}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-500">
                        #{r.komplainId}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-slate-800">
                          {r.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF6B1A] group-hover:underline">
                          Periksa <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Return Cards View */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {filtered.map((r) => (
                <div key={r.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">#{r.id}</span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-slate-800">
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div>
                      {r.kind === "refund" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          <DollarSign className="h-3 w-3" /> Refund Dana
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                          <RefreshCw className="h-3 w-3" /> Tukar Barang
                        </span>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-slate-500 font-mono">
                      Order: #{r.orderId}
                    </div>
                  </div>

                  <Link
                    href={getReturnHref(r)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#FF6B1A] hover:text-white hover:border-[#FF6B1A] transition min-h-[44px]"
                  >
                    <span>Periksa Komplain #{r.komplainId}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}