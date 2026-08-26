"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAllOrdersGlobal } from "@/lib/orders-storage";
import type { Order } from "@/lib/orders-storage";

const PERIODE = [
  { v: "all", l: "Semua" },
  { v: "today", l: "Hari Ini" },
  { v: "7d", l: "7 Hari" },
  { v: "30d", l: "30 Hari" },
] as const;

export default function AdminTransaksiPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [q, setQ] = useState("");
  const [periode, setPeriode] = useState<(typeof PERIODE)[number]["v"]>("all");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    const refresh = () => {
      getAllOrdersGlobal()
        .then((os) => { setOrders(os); setFetchedAt(Date.now()); })
        .catch(() => { setOrders([]); setFetchedAt(Date.now()); });
    };
    refresh();
    const on = () => refresh();
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const filtered = useMemo(() => {
    let arr = orders;
    if (status !== "all") arr = arr.filter((o) => o.status === status);
    if (periode !== "all") {
      const now = fetchedAt;
      const ms = periode === "today" ? 86_400_000 : periode === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
      arr = arr.filter((o) => now - new Date(o.createdAt).getTime() <= ms);
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter((o) => o.id.toLowerCase().includes(s) || (o.alamat?.nama ?? "").toLowerCase().includes(s));
    }
    return arr;
  }, [orders, q, periode, status, fetchedAt]);

  const omzet = filtered.filter((o) => o.status === "selesai").reduce((s, o) => s + Number(o.total ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-[#fc970a] p-3 text-white shadow-lg"><p className="text-[10px] font-black uppercase opacity-80">Total Transaksi</p><p className="mt-1.5 text-xl font-black">{filtered.length}</p></div>
        <div className="rounded-2xl bg-emerald-600 p-3 text-white shadow-lg"><p className="text-[10px] font-black uppercase opacity-80">Omzet Selesai</p><p className="mt-1.5 text-xl font-black">Rp {omzet.toLocaleString("id-ID")}</p></div>
        <div className="rounded-2xl bg-[#FF6B1A] p-3 text-white shadow-lg"><p className="text-[10px] font-black uppercase opacity-80">Selesai</p><p className="mt-1.5 text-xl font-black">{filtered.filter((o) => o.status === "selesai").length}</p></div>
      </div>

      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari ID order atau nama..."
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none" />
          </div>
          <select value={periode} onChange={(e) => setPeriode(e.target.value as typeof periode)} className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-900">
            {PERIODE.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-900">
            <option value="all">Semua Status</option>
            <option value="menunggu_pembayaran">Menunggu Bayar</option>
            <option value="menunggu_konfirmasi">Perlu Verifikasi</option>
            <option value="diproses">Diproses</option>
            <option value="dikirim">Dikirim</option>
            <option value="selesai">Selesai</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center"><Receipt className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 text-sm font-black text-gray-500">Tidak ada transaksi</p></div>
        ) : (
          <div className="mt-4 space-y-2">
            {filtered.map((o) => (
              <button key={o.id} onClick={() => router.push(`/admin/penjualan/${o.id}`)}
                className="flex w-full items-center justify-between rounded-xl border-2 border-gray-100 bg-gray-50 p-3 text-left transition hover:border-[#FF6B1A] hover:bg-orange-50">
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-900">{o.id}</p>
                  <p className="text-[10px] font-bold text-gray-500">{o.alamat?.nama ?? "-"} · {new Date(o.createdAt).toLocaleDateString("id-ID")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600">Rp {Number(o.total ?? 0).toLocaleString("id-ID")}</p>
                  <p className="text-[10px] font-bold text-gray-500">{o.status}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}