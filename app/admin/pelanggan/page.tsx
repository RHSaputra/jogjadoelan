"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, ShoppingBag, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getAllOrdersGlobal } from "@/lib/orders-storage";

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
    return list.filter((p) => p.nama.toLowerCase().includes(s) || p.hp.includes(s) || p.userId.toLowerCase().includes(s));
  }, [list, q]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total Pelanggan" value={list.length} icon={Users} bg="bg-[#fc970a]" />
        <Stat label="Total Order" value={list.reduce((s, p) => s + p.totalOrder, 0)} icon={ShoppingBag} bg="bg-[#FF6B1A]" />
        <Stat label="Total Omzet" value={`Rp ${list.reduce((s, p) => s + p.totalSpent, 0).toLocaleString("id-ID")}`} icon={ShoppingBag} bg="bg-emerald-600" />
        <Stat label="Avg Order/Pelanggan" value={list.length ? Math.round(list.reduce((s, p) => s + p.totalOrder, 0) / list.length) : 0} icon={Users} bg="bg-blue-600" />
      </div>

      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, HP, atau user ID..."
            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none" />
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center"><Users className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 text-sm font-black text-gray-500">Tidak ada pelanggan</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b-2 border-gray-200 text-[10px] uppercase text-gray-500">
                <tr><th className="px-2 py-2 text-left">Pelanggan</th><th className="px-2 py-2 text-left">HP</th><th className="px-2 py-2 text-right">Order</th><th className="px-2 py-2 text-right">Total Belanja</th><th className="px-2 py-2 text-left">Order Terakhir</th><th className="px-2 py-2 text-center">Aksi</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.userId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-2 py-2.5"><p className="font-black text-gray-900">{p.nama}</p><p className="text-[10px] text-gray-400">{p.userId}</p></td>
                    <td className="px-2 py-2.5 font-bold text-gray-600">{p.hp}</td>
                    <td className="px-2 py-2.5 text-right font-black text-gray-900">{p.totalOrder}</td>
                    <td className="px-2 py-2.5 text-right font-black text-emerald-600">Rp {p.totalSpent.toLocaleString("id-ID")}</td>
                    <td className="px-2 py-2.5 text-[10px] font-bold text-gray-500">{new Date(p.lastOrderAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-2 py-2.5 text-center">
                      {p.userId && p.userId !== "unknown" ? (
                        <Link href={`/admin/chat?userId=${p.userId}`}
                          className="inline-flex items-center gap-1 rounded-full bg-[#FF6B1A]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[#FF6B1A] hover:bg-[#FF6B1A]/20 transition">
                          <MessageCircle className="h-3 w-3" /> Chat
                        </Link>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, bg }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; bg: string }) {
  return (
    <div className={`rounded-2xl ${bg} p-3 text-white shadow-lg`}>
      <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wider opacity-80">{label}</p><Icon className="h-4 w-4 opacity-80" /></div>
      <p className="mt-1.5 text-xl font-black">{value}</p>
    </div>
  );
}