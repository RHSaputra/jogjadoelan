"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Banknote, Calendar, CheckCircle2, Layers,
  Palette, Search, ShoppingBag, Wrench, Zap,
} from "lucide-react";
import {
  CUSTOM_STATUS_COLOR, CUSTOM_STATUS_LABEL, type CustomOrder,
} from "@/lib/custom-order-context";
import {
  formatRp, getCustomStats, getCustomTotalPaid, listCustomOrdersForAdmin,
  type CustomTabKey,
} from "@/lib/admin-custom-helpers";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

const TABS: { key: CustomTabKey; label: string; urgent?: boolean }[] = [
  { key: "all",            label: "Semua" },
  { key: "perlu_estimasi", label: "Perlu Estimasi", urgent: true },
  { key: "verifikasi",     label: "Verifikasi Bayar", urgent: true },
  { key: "diproses",       label: "Diproduksi" },
  { key: "siap_dilunasi",  label: "Siap Dilunasi" },
  { key: "dikirim",        label: "Dikirim" },
  { key: "selesai",        label: "Selesai" },
  { key: "ditolak",        label: "Ditolak/Batal" },
];

const emptySubscribe = () => () => {};

export default function AdminCustomPage() {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [tab, setTab] = useState<CustomTabKey>("all");
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("storage", onChange);
    window.addEventListener("jogjadoelan_custom_changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("jogjadoelan_custom_changed", onChange);
    };
  }, []);

  const [stats, setStats] = useState<Awaited<ReturnType<typeof getCustomStats>> | null>(null);
  const [list, setList] = useState<Awaited<ReturnType<typeof listCustomOrdersForAdmin>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [s, l] = await Promise.all([
        getCustomStats(),
        listCustomOrdersForAdmin({ tab, q }),
      ]);
      if (!cancelled) {
        setStats(s);
        setList(l);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mounted, tab, q, tick]);

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
        title="Custom Order Helm"
        subtitle="Kelola pesanan modifikasi helm, set estimasi biaya, pantau lini produksi, dan verifikasi pelunasan"
        breadcrumbs={[{ label: "Sales" }, { label: "Custom Order" }]}
      />

      {/* KPI Stats */}
      <section className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        <AdminStatCard
          label="Perlu Estimasi"
          value={stats?.counts.perlu_estimasi ?? 0}
          subtitle="Permintaan baru belum ada harga"
          icon={Zap}
          color="amber"
          alert={(stats?.counts.perlu_estimasi ?? 0) > 0}
          onClick={() => setTab("perlu_estimasi")}
        />
        <AdminStatCard
          label="Verifikasi Pembayaran"
          value={stats?.counts.verifikasi ?? 0}
          subtitle="Bukti DP / pelunasan masuk"
          icon={Banknote}
          color="blue"
          alert={(stats?.counts.verifikasi ?? 0) > 0}
          onClick={() => setTab("verifikasi")}
        />
        <AdminStatCard
          label="Sedang Diproduksi"
          value={stats?.counts.diproses ?? 0}
          subtitle="Dalam pengerjaan bengkel"
          icon={Layers}
          color="purple"
          onClick={() => setTab("diproses")}
        />
        <AdminStatCard
          label="Omzet Custom Order"
          value={formatRp(stats?.omzet ?? 0)}
          subtitle="Akumulasi omzet custom"
          icon={CheckCircle2}
          color="emerald"
        />
      </section>

      {/* Search & Tabs Toolbar */}
      <AdminCard bodyClassName="p-4 sm:p-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari ID custom order, jenis helm, catatan spesifikasi..."
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
                      ? "bg-amber-500 text-white"
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

      {/* Grid of Custom Orders */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-[#FF6B1A] border-t-transparent" />
          <p className="mt-2 text-xs font-semibold text-slate-500">Memuat pesanan custom...</p>
        </div>
      ) : list.length === 0 ? (
        <AdminEmptyState
          icon={Wrench}
          title="Tidak ada pesanan custom"
          description="Belum ada pesanan custom yang cocok dengan status atau pencarian saat ini."
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((o) => (
            <CustomCard
              key={o.id}
              order={o}
              onClick={() => router.push(`/admin/custom/${o.id}`)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

/* ==================== CARD ==================== */

function CustomCard({ order, onClick }: { order: CustomOrder; onClick: () => void }) {
  const total = order.estimasi?.total ?? 0;
  const paid = getCustomTotalPaid(order);
  const ref = order.referensiFiles?.[0];
  const tglMs = order.createdAt;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-xs transition-all hover:border-[#FF6B1A]/60 hover:shadow-md"
    >
      {/* Top Banner / Reference Image */}
      <div className="relative h-36 w-full bg-slate-100 border-b border-slate-100 flex items-center justify-center overflow-hidden">
        {ref?.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ref.dataUrl}
            alt={ref.name || "Referensi"}
            className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400">
            <Wrench className="h-8 w-8 text-slate-300 mb-1" />
            <span className="text-[10px] font-semibold text-slate-400">Tidak ada referensi</span>
          </div>
        )}

        <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase shadow-xs ${CUSTOM_STATUS_COLOR[order.status]}`}>
          {CUSTOM_STATUS_LABEL[order.status]}
        </span>

        {order.isLate && (
          <span className="absolute right-2.5 top-2.5 animate-pulse rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-xs">
            Telat
          </span>
        )}

        {order.paymentType && (
          <span className="absolute bottom-2.5 left-2.5 rounded-md bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Skema: {order.paymentType === "dp" ? "DP (Bertahap)" : "Lunas Full"}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold text-[#FF6B1A]">#{order.id}</p>
              <p className="mt-0.5 truncate font-extrabold text-slate-900 text-sm">{order.jenis}</p>
            </div>
            {total > 0 && (
              <div className="shrink-0 text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400">Estimasi</span>
                <p className="text-sm font-black text-slate-900">{formatRp(total)}</p>
              </div>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] text-slate-600">
            <Pill icon={Palette} label={`${order.warnaList?.length ?? 0} warna`} />
            <Pill label={`Ukuran ${order.ukuran}`} />
            <Pill label={order.finishing} />
            {order.referensiFiles?.length > 0 && (
              <Pill icon={ShoppingBag} label={`${order.referensiFiles.length} file`} />
            )}
          </div>

          {/* Color swatches */}
          {order.warnaList?.length > 0 && (
            <div className="mt-2 flex items-center gap-1">
              {order.warnaList.slice(0, 6).map((w, i) => (
                <span
                  key={i}
                  className="h-3.5 w-3.5 rounded-full border border-slate-300 shadow-xs"
                  style={{ background: w.hex }}
                  title={w.nama ?? w.hex}
                />
              ))}
            </div>
          )}
        </div>

        {/* Payment Progress bar */}
        {total > 0 && (
          <div className="space-y-1 border-t border-slate-100 pt-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500">
                Terbayar: <strong className="text-emerald-700 font-black">{formatRp(paid)}</strong>
              </span>
              <span className="font-bold text-slate-700">
                {Math.min(100, Math.round((paid / total) * 100))}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#FF6B1A]"
                style={{ width: `${Math.min(100, (paid / total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(tglMs).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1 font-bold text-[#FF6B1A] group-hover:underline">
            Kelola Order <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </button>
  );
}

function Pill({ icon: Icon, label }: { icon?: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
      {Icon && <Icon className="h-2.5 w-2.5 text-slate-400" />}
      <span>{label}</span>
    </span>
  );
}