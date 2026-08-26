"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Repeat,
  Wallet,
  ChevronRight,
  Search,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Info,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useKomplain,
  KOMPLAIN_STATUS_LABEL,
  KOMPLAIN_STATUS_COLOR,
  type Komplain,
  type KomplainStatus,
} from "@/lib/komplain-context";

/* Tab filter disesuaikan agar rapi dan tidak membingungkan */
const TABS = [
  { key: "semua", label: "Semua" },
  { key: "aktif", label: "Aktif" },
  { key: "selesai", label: "Selesai" },
  { key: "ditolak", label: "Ditolak" },
  { key: "dibatalkan", label: "Dibatalkan" },
] as const;

/* Fungsi pintar untuk memasukkan status komplain ke dalam ember (bucket) tab yang tepat */
function getBucket(s: KomplainStatus): string {
  if (s === "berhasil") return "selesai";
  if (s === "ditolak") return "ditolak";
  if (s === "dibatalkan") return "dibatalkan";
  return "aktif"; // status lain (baru, diproses, disetujui, dll) masuk ke aktif
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusIcon({ s }: { s: KomplainStatus }) {
  if (s === "berhasil") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (s === "ditolak" || s === "dibatalkan") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function TukarListInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { items: allKomplain, hydrated } = useKomplain();

  const [tab, setTab] = useState<string>("semua");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?next=" + encodeURIComponent("/tukar"));
    }
  }, [authLoading, isAuthenticated, router]);

  /* Prefill pencarian jika diakses dari link dengan query ?orderId=X */
  const [prefillSource, setPrefillSource] = useState(sp);
  if (sp !== prefillSource) {
    setPrefillSource(sp);
    const oid = sp.get("orderId");
    if (oid && !q) setQ(oid);
  }

  /* Menambahkan properti "bucket" ke semua item untuk mempermudah filter Tab */
  const allRows = useMemo(() => {
    return allKomplain.map((k) => ({
      ...k,
      bucket: getBucket(k.status),
    }));
  }, [allKomplain]);

  /* Menghitung jumlah badge angka di tiap Tab */
  const counts = useMemo(() => {
    const c: Record<string, number> = { semua: allRows.length };
    TABS.forEach((tb) => {
      if (tb.key === "semua") return;
      c[tb.key] = allRows.filter((r) => r.bucket === tb.key).length;
    });
    return c;
  }, [allRows]);

  /* Logika Filter: Tab + Search Bar */
  const filtered = useMemo(() => {
    let list = tab === "semua" ? allRows : allRows.filter((r) => r.bucket === tab);
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      list = list.filter((r) => {
        return (
          r.id.toLowerCase().includes(k) ||
          r.orderId.toLowerCase().includes(k) ||
          r.jenisLabel.toLowerCase().includes(k)
        );
      });
    }
    // Urutkan dari yang paling baru
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [allRows, tab, q]);

  if (authLoading || !isAuthenticated)
    return <div className="min-h-screen bg-brand-cream-light" />;

  return (
    <div className="min-h-screen bg-brand-cream-light pb-24">
      {/* HEADER STICKY PREMIUM */}
      <div className="sticky top-0 z-20 border-b border-brand-krem bg-brand-cream-light/90 pt-4 backdrop-blur-xl supports-[backdrop-filter]:bg-brand-cream-light/60">
        <div className="container mx-auto flex items-center gap-3 px-4 pb-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-krem bg-white shadow-sm transition-colors hover:border-brand-orange hover:text-brand-orange"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 shadow-sm">
            <Repeat className="h-5 w-5 text-brand-orange" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-brand-black">Pusat Resolusi</h1>
        </div>

        {/* SEARCH BAR GLASSMORPHISM */}
        <div className="container mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-black/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari ID Komplain / Pesanan..."
              className="w-full rounded-full border border-brand-krem bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-brand-black shadow-sm outline-none transition-all focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10"
            />
          </div>
        </div>

        {/* TABS PILL BUTTONS */}
        <div className="border-t border-brand-krem/50 bg-white/50">
          <div className="scrollbar-hide container mx-auto flex gap-2 overflow-x-auto px-4 py-3">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-bold transition-all duration-300 ${
                    active
                      ? "border-brand-orange bg-brand-orange text-white shadow-md shadow-brand-orange/20"
                      : "border-brand-krem bg-white text-brand-black/60 shadow-sm hover:border-brand-orange/50 hover:text-brand-orange"
                  }`}
                >
                  {t.label}
                  {counts[t.key] > 0 && (
                    <span
                      className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] ${
                        active ? "bg-white text-brand-orange" : "bg-brand-cream text-brand-black/50"
                      }`}
                    >
                      {counts[t.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DAFTAR CARD */}
      <div className="container mx-auto max-w-2xl px-4 py-5">
        {!hydrated ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-orange border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-brand-black/40">Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={allRows.length > 0} tab={tab} />
        ) : (
          <ul className="space-y-4">
            {filtered.map((k) => (
              <ResolusiCard key={k.id} komplain={k} />
            ))}
          </ul>
        )}

        {/* INFO KEBIJAKAN CARD */}
        <div className="mt-8 rounded-[24px] border border-brand-krem bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50">
              <Info className="h-3 w-3 text-blue-500" />
            </div>
            <p className="text-sm font-black text-brand-black">Tentang Pusat Resolusi</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-brand-black/60">
            Halaman ini adalah pusat untuk memantau seluruh pengajuan <strong>Refund Dana</strong>, <strong>Tukar Barang</strong>, atau <strong>Kendala Pesanan</strong> Anda. 
            Selengkapnya pelajari di{" "}
            <Link href="/kebijakan/tukar" className="font-bold text-brand-orange hover:underline">
              Kebijakan Tukar
            </Link>{" "}
            &amp;{" "}
            <Link href="/kebijakan/refund" className="font-bold text-brand-orange hover:underline">
              Kebijakan Refund
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ */
/* SUB-COMPONENTS                                                   */
/* ================================================================ */

function EmptyState({ hasAny, tab }: { hasAny: boolean; tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-brand-krem bg-white/50 px-6 py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-cream/50 shadow-inner">
        <Inbox className="h-10 w-10 text-brand-black/20" />
      </div>
      <h3 className="text-lg font-black text-brand-black">
        {!hasAny
          ? "Belum ada pengajuan"
          : tab === "aktif"
            ? "Tidak ada pengajuan aktif"
            : tab === "dibatalkan"
              ? "Tidak ada yang dibatalkan"
              : tab === "ditolak"
                ? "Tidak ada pengajuan yang ditolak"
                : "Kosong"}
      </h3>
      <p className="mt-2 max-w-[250px] text-xs leading-relaxed text-brand-black/50">
        {!hasAny
          ? "Jika ada kendala dengan barang yang diterima, Anda dapat mengajukan komplain dari detail pesanan."
          : "Coba pilih tab filter yang lain untuk mencari riwayat pengajuanmu."}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link
          href="/pesanan"
          className="rounded-full bg-brand-orange px-6 py-3 text-xs font-black text-white shadow-md shadow-brand-orange/20 transition-transform hover:-translate-y-0.5 hover:bg-orange-600"
        >
          Lihat Daftar Pesanan
        </Link>
      </div>
    </div>
  );
}

/** Card Dinamis: Menyesuaikan gaya sesuai jenis tindakan (Refund / Tukar / Komplain Saja) */
function ResolusiCard({ komplain }: { komplain: Komplain }) {
  const isRefund = komplain.tindakan === "refund";
  const isTukar = komplain.tindakan === "tukar";

  /* Semua card -> halaman status komplain (tombol pintar sesuai status) */
  const detailHref = `/komplain/${komplain.id}`;
  
  // Penyesuaian tema warna card (Full statis agar terbaca oleh Tailwind)
  const theme = isRefund 
    ? { 
        icon: Wallet, label: "REFUND DANA", 
        badgeBg: "bg-emerald-100", badgeText: "text-emerald-700",
        iconBg: "from-emerald-50 to-emerald-100", iconText: "text-emerald-600"
      } 
    : isTukar 
      ? { 
          icon: Repeat, label: "TUKAR BARANG", 
          badgeBg: "bg-orange-100", badgeText: "text-brand-orange",
          iconBg: "from-orange-50 to-orange-100", iconText: "text-brand-orange"
        }
      : { 
          icon: ShieldAlert, label: "KENDALA PESANAN", 
          badgeBg: "bg-amber-100", badgeText: "text-amber-700",
          iconBg: "from-amber-50 to-amber-100", iconText: "text-amber-600"
        };

  const Icon = theme.icon;

  return (
    <li className="group overflow-hidden rounded-[24px] border border-brand-krem bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      {/* Header Card */}
      <div className="flex items-center justify-between border-b border-brand-krem bg-zinc-50/50 px-5 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide ${theme.badgeBg} ${theme.badgeText}`}>
            <Icon className="h-3 w-3" /> {theme.label}
          </span>
          <code className="font-mono font-bold text-brand-black/50">
            {komplain.id}
          </code>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${KOMPLAIN_STATUS_COLOR[komplain.status]}`}
        >
          <StatusIcon s={komplain.status} />
          {KOMPLAIN_STATUS_LABEL[komplain.status]}
        </span>
      </div>

      {/* Body Card */}
      <Link href={detailHref} className="block px-5 py-4 transition-colors hover:bg-zinc-50/50">
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner ${theme.iconBg}`}>
            <Icon className={`h-6 w-6 ${theme.iconText}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-brand-black">
              {komplain.jenisLabel}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-brand-black/60">
              <span className="font-bold text-brand-black">Order: {komplain.orderId}</span>
            </p>
            <p className="mt-1 line-clamp-1 text-[11px] italic text-brand-black/50">
              &quot;{komplain.deskripsi}&quot;
            </p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-brand-black/30">
              Diajukan {formatTanggal(komplain.createdAt)}
            </p>
          </div>
        </div>
      </Link>

      {/* Footer / Action */}
      <div className="flex items-center justify-between border-t border-brand-krem bg-zinc-50/50 px-5 py-3">
        <span className="text-[11px] font-medium text-brand-black/40">
          Status: <strong className="text-brand-black/70">{KOMPLAIN_STATUS_LABEL[komplain.status]}</strong>
        </span>
        <Link
          href={detailHref}
          className="flex items-center gap-1 rounded-full bg-brand-orange px-4 py-2 text-[11px] font-black text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-orange-600"
        >
          Cek Detail <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </li>
  );
}

export default function TukarListPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream-light" />}>
      <TukarListInner />
    </Suspense>
  );
}