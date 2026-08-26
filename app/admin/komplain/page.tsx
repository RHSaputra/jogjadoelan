"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowRight, Calendar, Inbox, Search, ShieldAlert,
  User,
} from "lucide-react";
import {
  KOMPLAIN_TINDAKAN_LABEL, resolveKomplainStatusInfo,
} from "@/lib/komplain-context";
import {
  getKomplainStats, listKomplainForAdmin,
  type AdminKomplain, type KomplainTabKey,
} from "@/lib/admin-komplain-helpers";
import { subscribeSyncMany } from "@/lib/sync-events";

const TABS: { key: KomplainTabKey; label: string; urgent?: boolean }[] = [
  { key: "all",                   label: "Semua" },
  { key: "baru",                  label: "Baru",          urgent: true },
  { key: "ditinjau",              label: "Ditinjau" },
  { key: "menunggu_review_admin", label: "Review Form",   urgent: true },
  { key: "disetujui",             label: "Disetujui" },
  { key: "menunggu_balikan",      label: "Menunggu Balik" },
  { key: "diproses",              label: "Diproses" },
  { key: "berhasil",              label: "Berhasil" },
  { key: "ditolak",               label: "Ditolak/Batal" },
];

const emptySubscribe = () => () => {};

export default function AdminKomplainPage() {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<KomplainTabKey>("all");
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    return subscribeSyncMany(["komplain", "refund", "tukar"], onChange);
  }, []);

    const [stats, setStats] = useState<Awaited<ReturnType<typeof getKomplainStats>> | null>(null);
  const [items, setItems] = useState<AdminKomplain[]>([]);

  useEffect(() => {
    let active = true;
    getKomplainStats().then((s) => { if (active) { setStats(s); setError(null); } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Gagal memuat statistik"); });
    return () => { active = false; };
  }, [tick]);

  useEffect(() => {
    let active = true;
    listKomplainForAdmin({ tab, q }).then((d) => { if (active) { setItems(d); setError(null); } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Gagal memuat data komplain"); });
    return () => { active = false; };
  }, [tab, q, tick]);

  if (!mounted) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-orange-500 p-5 text-gray-900 shadow-lg ring-1 ring-orange-500/30 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-900">
              <ShieldAlert className="h-3.5 w-3.5" /> Manajemen Komplain & Refund/Tukar
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Komplain Customer</h1>
            <p className="mt-1 text-xs text-gray-800">
              Setujui, tolak, balas chat, dan selesaikan pengajuan refund/tukar customer.
            </p>
          </div>
          <div className="rounded-2xl bg-white/50 px-5 py-3 text-center backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-900">Total Komplain</p>
            <p className="text-3xl font-black text-gray-900">{stats?.total ?? 0}</p>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Baru" value={stats?.counts.baru ?? 0} bg="bg-blue-500" alert={(stats?.counts.baru ?? 0) > 0} />
        <Stat label="Review Form" value={stats?.counts.menunggu_review_admin ?? 0} bg="bg-amber-500" alert={(stats?.counts.menunggu_review_admin ?? 0) > 0} />
        <Stat label="Diproses" value={stats?.counts.diproses ?? 0} bg="bg-indigo-500" />
        <Stat label="Berhasil" value={stats?.counts.berhasil ?? 0} bg="bg-emerald-500" />
      </section>

      {/* Toolbar */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Cari ID komplain, ID order, customer, jenis..."
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            const n = stats?.counts[t.key] ?? 0;
            const showAlert = t.urgent && n > 0;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  active ? "bg-[#FF6B1A] text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {t.label}
                <span className={`rounded-full px-1.5 text-[9px] ${
                  active ? "bg-white/20 text-white"
                  : showAlert ? "bg-red-500 text-white animate-pulse"
                  : "bg-white text-gray-600"
                }`}>{n}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid */}
      {error && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <div className="flex items-center gap-2 font-black">
            <AlertTriangle className="h-4 w-4" /> Gagal memuat data komplain
          </div>
          <p className="mt-1 text-xs text-red-600">{error}</p>
          <button onClick={() => { setError(null); setTick((t) => t + 1); }}
            className="mt-2 rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold text-red-700 hover:bg-red-200 transition">
            Coba Lagi
          </button>
        </div>
      )}
      {items.length === 0 && !error ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
          <Inbox className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm font-black text-gray-500">Tidak ada komplain</p>
          <p className="text-xs text-gray-400">Filter saat ini tidak menampilkan data</p>
        </div>
      ) : error ? null : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((k) => (
            <KomplainCard key={k.id} k={k} onClick={() => router.push(`/admin/komplain/${k.id}`)} />
          ))}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, bg, alert }: { label: string; value: number; bg: string; alert?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {alert && <span className="absolute right-2 top-2 h-2 w-2 animate-ping rounded-full bg-red-500" />}
      <div className={`h-1.5 w-12 rounded-full ${bg}`} />
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-lg font-black text-gray-900">{value}</p>
    </div>
  );
}

function KomplainCard({ k, onClick }: { k: AdminKomplain; onClick: () => void }) {
  const tindakanColor =
    k.tindakan === "refund" ? "bg-red-100 text-red-700"
    : k.tindakan === "tukar" ? "bg-blue-100 text-blue-700"
    : "bg-gray-100 text-gray-700";
  return (
    <button onClick={onClick}
      className="group flex flex-col gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-[#FF6B1A] hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold text-gray-500">{k.id}</p>
          <p className="mt-0.5 truncate text-xs font-black text-gray-900">{k.jenisLabel}</p>
        </div>
        {(() => {
          const info = resolveKomplainStatusInfo(k);
          return (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${info.color}`}>
              {info.label}
            </span>
          );
        })()}
      </div>

      <p className="line-clamp-2 text-[11px] text-gray-600">{k.deskripsi}</p>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className={`rounded-full px-2 py-0.5 font-black ${tindakanColor}`}>
          {KOMPLAIN_TINDAKAN_LABEL[k.tindakan]}
        </span>
        {k.files.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-bold text-gray-600">
            {k.files.length} lampiran
          </span>
        )}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-gray-600">
          {k.orderId}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-dashed border-gray-100 pt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1 truncate">
          <User className="h-3 w-3" /> {k.userName}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(k.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
        </span>
      </div>
      <span className="flex items-center justify-end gap-1 text-[10px] font-black text-[#FF6B1A] group-hover:underline">
        Tinjau <ArrowRight className="h-3 w-3" />
      </span>
    </button>
  );
}