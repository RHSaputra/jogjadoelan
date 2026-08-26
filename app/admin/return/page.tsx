"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAllReturnsUnified, type ReturnRow } from "@/lib/admin-return-helpers";

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[#fc970a] p-3 text-white shadow-lg">
          <p className="text-[10px] font-black uppercase opacity-80">Total</p>
          <p className="mt-1.5 text-xl font-black">{list.length}</p>
        </div>
        <div className="rounded-2xl bg-amber-500 p-3 text-white shadow-lg">
          <p className="text-[10px] font-black uppercase opacity-80">Refund</p>
          <p className="mt-1.5 text-xl font-black">
            {list.filter((r) => r.kind === "refund").length}
          </p>
        </div>
        <div className="rounded-2xl bg-violet-600 p-3 text-white shadow-lg">
          <p className="text-[10px] font-black uppercase opacity-80">Tukar</p>
          <p className="mt-1.5 text-xl font-black">
            {list.filter((r) => r.kind === "tukar").length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
        <div className="mb-3 flex gap-2">
          {(["all", "refund", "tukar"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-3 py-2 text-[10px] font-black uppercase ${
                tab === t ? "bg-[#fc970a] text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {t === "all" ? "Semua" : t}
            </button>
          ))}
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari ID return, order, atau komplain..."
            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm font-bold text-gray-900 focus:border-[#FF6B1A] focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm font-bold text-gray-400 animate-pulse">
            Memuat data return...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <RotateCcw className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-black text-gray-500">Tidak ada return</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <button
                key={`${r.kind}-${r.id}`}
                onClick={() => router.push(`/admin/komplain/${r.komplainId}`)}
                className="flex w-full items-center justify-between rounded-xl border-2 border-gray-100 bg-gray-50 p-3 text-left transition hover:border-[#FF6B1A] hover:bg-orange-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        r.kind === "refund"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {r.kind}
                    </span>
                    <p className="text-xs font-black text-gray-900">{r.id}</p>
                  </div>
                  <p className="mt-0.5 text-[10px] font-bold text-gray-500">
                    Order: {r.orderId} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("id-ID")}
                  </p>
                  {r.productNama && (
                    <p className="text-[10px] font-bold text-gray-600">{r.productNama}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-gray-900">
                    {r.status}
                  </p>
                  {r.nominal != null && r.nominal > 0 && (
                    <p className="mt-1 text-[10px] font-black text-emerald-600">
                      Rp {r.nominal.toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}