"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Star, AlertTriangle } from "lucide-react";
import { containsBadWords, type Ulasan } from "@/lib/ulasan-helpers";

export default function AdminUlasanPage() {
  const [list, setList] = useState<Ulasan[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "1" | "2" | "3" | "4" | "5" | "flagged">("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/ulasan");
        const json = (await res.json()) as { data?: Ulasan[] };
        if (!cancelled) setList(json.data ?? []);
      } catch { /* ignore */ }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let arr = list;
    if (filter === "flagged") arr = arr.filter((u) => containsBadWords(u.komentar).ada);
    else if (filter !== "all") arr = arr.filter((u) => u.rating === Number(filter));
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter((u) => (u.produkNama ?? "").toLowerCase().includes(s) || u.komentar.toLowerCase().includes(s) || u.orderId.toLowerCase().includes(s));
    }
    return arr;
  }, [list, q, filter]);

  const avg = list.length ? (list.reduce((s, u) => s + u.rating, 0) / list.length).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-[#0E2148] p-3 text-white shadow-lg"><p className="text-[10px] font-black uppercase opacity-80">Total Ulasan</p><p className="mt-1.5 text-xl font-black">{list.length}</p></div>
        <div className="rounded-2xl bg-[#FFD23F] p-3 text-[#0E2148] shadow-lg"><p className="text-[10px] font-black uppercase opacity-80">Rata-rata</p><p className="mt-1.5 text-xl font-black">{avg} ★</p></div>
        <div className="rounded-2xl bg-emerald-600 p-3 text-white shadow-lg"><p className="text-[10px] font-black uppercase opacity-80">Bintang 5</p><p className="mt-1.5 text-xl font-black">{list.filter((u) => u.rating === 5).length}</p></div>
        <div className="rounded-2xl bg-red-500 p-3 text-white shadow-lg"><p className="text-[10px] font-black uppercase opacity-80">Perlu Review</p><p className="mt-1.5 text-xl font-black">{list.filter((u) => containsBadWords(u.komentar).ada).length}</p></div>
      </div>

      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk, komentar, atau order..."
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm font-bold text-[#0E2148] focus:border-[#FF6B1A] focus:outline-none" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-[#0E2148]">
            <option value="all">Semua Rating</option>
            <option value="5">5 Bintang</option>
            <option value="4">4 Bintang</option>
            <option value="3">3 Bintang</option>
            <option value="2">2 Bintang</option>
            <option value="1">1 Bintang</option>
            <option value="flagged">Perlu Review</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center"><Star className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 text-sm font-black text-gray-500">Tidak ada ulasan</p></div>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((u) => {
              const bad = containsBadWords(u.komentar);
              return (
                <div key={u.id} className="rounded-xl border-2 border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-[#0E2148]">{u.produkNama}</p>
                        {bad.ada && (
                          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black text-red-700">
                            <AlertTriangle className="h-3 w-3" /> KATA KASAR
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] font-bold text-gray-500">Order {u.orderId} · {new Date(u.createdAt).toLocaleDateString("id-ID")}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < u.rating ? "fill-[#FFD23F] text-[#FFD23F]" : "text-gray-300"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-bold text-gray-700">{u.komentar}</p>
                  {u.foto.length > 0 && <p className="mt-1 text-[10px] font-bold text-gray-500">{u.foto.length} lampiran</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}