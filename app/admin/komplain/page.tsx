"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowRight, Calendar, Inbox, Search, ShieldAlert,
  User, CheckCircle2, Clock, RotateCcw,
} from "lucide-react";
import {
  KOMPLAIN_TINDAKAN_LABEL, resolveKomplainStatusInfo,
} from "@/lib/komplain-context";
import {
  getKomplainStats, listKomplainForAdmin,
  type AdminKomplain, type KomplainTabKey,
} from "@/lib/admin-komplain-helpers";
import { subscribeSyncMany } from "@/lib/sync-events";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getKomplainStats()
      .then((s) => {
        if (active) {
          setStats(s);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat statistik");
      });
    return () => { active = false; };
  }, [tick]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listKomplainForAdmin({ tab, q })
      .then((d) => {
        if (active) {
          setItems(d);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal memuat data komplain");
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [tab, q, tick]);

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 w-1/3 rounded-xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-200" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Pusat Komplain & Retur"
        subtitle="Kelola pengajuan komplain pelanggan, evaluasi bukti foto/video kendala, dan selesaikan resolusi refund atau tukar barang"
        breadcrumbs={[{ label: "After Sales" }, { label: "Komplain" }]}
      />

      {/* KPI Stats */}
      <section className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        <AdminStatCard
          label="Komplain Baru"
          value={stats?.counts.baru ?? 0}
          subtitle="Menunggu konfirmasi admin"
          icon={ShieldAlert}
          color="rose"
          alert={(stats?.counts.baru ?? 0) > 0}
          onClick={() => setTab("baru")}
        />
        <AdminStatCard
          label="Review Form"
          value={stats?.counts.menunggu_review_admin ?? 0}
          subtitle="Form data refund/tukar masuk"
          icon={AlertTriangle}
          color="amber"
          alert={(stats?.counts.menunggu_review_admin ?? 0) > 0}
          onClick={() => setTab("menunggu_review_admin")}
        />
        <AdminStatCard
          label="Sedang Diproses"
          value={stats?.counts.diproses ?? 0}
          subtitle="Pengembalian dana/ekspedisi tukar"
          icon={RotateCcw}
          color="blue"
          onClick={() => setTab("diproses")}
        />
        <AdminStatCard
          label="Berhasil Selesai"
          value={stats?.counts.berhasil ?? 0}
          subtitle="Komplain terselesaikan"
          icon={CheckCircle2}
          color="emerald"
          onClick={() => setTab("berhasil")}
        />
      </section>

      {/* Search & Tabs Toolbar */}
      <AdminCard bodyClassName="p-4 sm:p-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari ID komplain, nama pembeli, atau kendala..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FF6B1A] focus:bg-white focus:ring-3 focus:ring-orange-500/10"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 pt-2 border-t border-slate-100">
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = stats?.counts[t.key] ?? 0;
            const showAlert = t.urgent && count > 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                  active
                    ? "bg-[#FF6B1A] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    active
                      ? "bg-white/20 text-white"
                      : showAlert
                      ? "bg-rose-500 text-white"
                      : "bg-white text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </AdminCard>

      {/* Grid of Complaints */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-[#FF6B1A] border-t-transparent" />
          <p className="mt-2 text-xs font-semibold text-slate-500">Memuat data komplain...</p>
        </div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={ShieldAlert}
          title="Tidak ada data komplain"
          description="Tidak ada komplain customer yang cocok dengan filter yang dipilih."
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((k) => {
            const st = resolveKomplainStatusInfo(k);
            const tgl = new Date(k.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const isUrgent = k.status === "baru" || k.status === "menunggu_review_admin";

            return (
              <article
                key={k.id}
                onClick={() => router.push(`/admin/komplain/${k.id}`)}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition-all hover:border-[#FF6B1A]/60 hover:shadow-md cursor-pointer space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#FF6B1A]">#{k.id}</span>
                        {isUrgent && (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-white">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{k.jenisLabel || k.deskripsi}</p>
                    </div>

                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase shadow-xs ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">{k.userName || "Customer"}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-[11px] text-slate-400">Order #{k.orderId}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      Solusi: {KOMPLAIN_TINDAKAN_LABEL[k.tindakan]}
                    </span>
                    {k.files && k.files.length > 0 && (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {k.files.length} Lampiran
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {tgl}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#FF6B1A] group-hover:underline">
                    Periksa Komplain <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}